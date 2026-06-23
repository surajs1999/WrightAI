"use client";

import { ga } from "@/lib/ga";
import { useEffect, useRef, useState } from "react";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";
import { Spinner, SpinnerArc } from "@/components/dashboard/Spinner";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  followups?: string[];
}

const SUGGESTIONS = [
  "How does authentication work?",
  "What does processPayment() do?",
  "Which functions handle webhooks?",
];

const selectStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)",
  fontFamily: "var(--font-mono)", fontSize: 12,
  padding: "6px 12px", outline: "none", cursor: "pointer",
};

/**
 * Generates a storage key string for a chat session associated with a specific repository.
 *
 * Creates a prefixed storage key by concatenating 'wright_chat_' with the provided repository ID, typically used for localStorage or sessionStorage operations in the ChatPage component.
 *
 * @param {string} repoId - The unique identifier of the repository for which to generate the storage key.
 * @returns {string} A formatted storage key string in the format 'wright_chat_{repoId}'.
 * @example
 * const key = STORAGE_KEY('repo-123'); // Returns: 'wright_chat_repo-123'
 */
const STORAGE_KEY = (repoId: string) => `wright_chat_${repoId}`;
const MAX_HISTORY = 20;

// Renders markdown-like text with code block support
/**
 * Renders a React component that parses and displays message text with formatted fenced code blocks and inline code snippets.
 *
 * Splits the input text on triple-backtick fenced code blocks, rendering each block as a styled `<pre><code>` element with an optional language label and a clipboard copy button. Text segments outside fenced blocks are further parsed for inline backtick code spans, rendering them as styled `<code>` elements. All remaining plain text is wrapped in `<span>` elements with pre-wrap whitespace handling.
 *
 * @param {string} text - The raw message string that may contain fenced code blocks (delimited by triple backticks with an optional language identifier) and/or inline code spans (delimited by single backticks).
 * @returns {JSX.Element} A React Fragment containing a mix of styled div elements for fenced code blocks (with copy buttons) and span elements for plain text and inline code, visually representing the parsed message content.
 * @example
 * <MessageContent text={"Here is some `inline code` and a block:\n```typescript\nconst x = 42;\n```"} />
 */




function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3).split("\n");
          const lang = lines[0].trim();
          const code = lines.slice(1).join("\n").replace(/```$/, "").trimEnd();
          return (
            <div key={i} style={{ position: "relative", margin: "10px 0" }}>
              {lang && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", padding: "4px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px 6px 0 0", display: "inline-block" }}>
                  {lang}
                </div>
              )}
              <pre style={{ margin: 0, padding: "12px 16px", background: "#0A0818", border: "1px solid var(--border)", borderRadius: lang ? "0 6px 6px 6px" : 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", overflowX: "auto", lineHeight: 1.6 }}>
                <code>{code}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                style={{ position: "absolute", top: lang ? 28 : 6, right: 8, padding: "2px 8px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", cursor: "pointer" }}
              >
                Copy
              </button>
            </div>
          );
        }
        // Inline code
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {inlineParts.map((p, j) =>
              p.startsWith("`") && p.endsWith("`") ? (
                <code key={j} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", background: "rgba(175,169,236,0.1)", padding: "1px 5px", borderRadius: 3 }}>
                  {p.slice(1, -1)}
                </code>
              ) : (
                <span key={j}>{p}</span>
              )
            )}
          </span>
        );
      })}
    </>
  );
}

/**
 * Renders a chat interface that allows users to ask questions about a selected connected repository and view streaming responses with citations and follow-up suggestions.
 *
 * This React component provides a complete chat interface for interacting with a codebase. It manages message history persistence in localStorage per repository, handles real-time streaming responses from the chat API, displays user and assistant messages with citations to relevant files, and supports follow-up question suggestions. The component loads and persists conversation history when the selected repository changes, streams token-by-token responses from the backend, and auto-scrolls to the latest message.
 * @returns {JSX.Element} A React component containing the chat interface with repository selector, message history, input textarea, and control buttons.
 * @example
 * <ChatPage />
 */
export default function ChatPage() {
  const { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [indexStatus, setIndexStatus] = useState<"checking" | "indexing" | "ready" | "unavailable">("checking");
  const bottomRef = useRef<HTMLDivElement>(null);
  const initializedRepo = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check index status whenever the selected repo changes
  useEffect(() => {
    ga.dashboardPageVisit("chat");
    
    if (!selectedRepo) return;

    const repoName = selectedRepo.id.split("/").pop()!;

    const checkAndMaybeIndex = async () => {
      setIndexStatus("checking");
      if (pollRef.current) clearInterval(pollRef.current);

      try {
        const res = await fetch(`/api/proxy/repos/${encodeURIComponent(repoName)}/index-status`);
        if (!res.ok) { setIndexStatus("unavailable"); return; }
        const data = await res.json() as { indexed: boolean; indexing: boolean };

        if (data.indexed) { setIndexStatus("ready"); return; }

        // Not indexed yet — trigger indexing if not already running
        if (!data.indexing) {
          await fetch(`/api/proxy/repos/${encodeURIComponent(repoName)}/index`, { method: "POST" });
        }
        setIndexStatus("indexing");

        // Poll every 4s until indexed
        pollRef.current = setInterval(async () => {
          try {
            const poll = await fetch(`/api/proxy/repos/${encodeURIComponent(repoName)}/index-status`);
            if (!poll.ok) return;
            const pollData = await poll.json() as { indexed: boolean };
            if (pollData.indexed) {
              setIndexStatus("ready");
              if (pollRef.current) clearInterval(pollRef.current);
            }
          } catch { /* keep polling */ }
        }, 4000);
      } catch {
        setIndexStatus("unavailable");
      }
    };

    checkAndMaybeIndex();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRepo?.id]);

  // Load persisted history when repo changes
  useEffect(() => {
    if (!selectedRepoId || initializedRepo.current === selectedRepoId) return;
    initializedRepo.current = selectedRepoId;
    try {
      const saved = localStorage.getItem(STORAGE_KEY(selectedRepoId));
      setMessages(saved ? JSON.parse(saved) : []);
    } catch {
      setMessages([]);
    }
  }, [selectedRepoId]);

  // Persist messages to localStorage
  useEffect(() => {
    if (!selectedRepoId || messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY(selectedRepoId), JSON.stringify(messages));
    } catch {}
  }, [messages, selectedRepoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    if (selectedRepoId) localStorage.removeItem(STORAGE_KEY(selectedRepoId));
  };

  const send = async (question: string) => {
    if (!question.trim() || streaming) return;
    const q = question.trim();
    setInput("");

    const userMsg: Message = { role: "user", content: q };
    const assistantMsg: Message = { role: "assistant", content: "", citations: [] };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // history = messages before this turn, capped to avoid context overflow
    const historyForRequest = messages
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-MAX_HISTORY);

    try {
      const res = await fetch("/api/proxy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          repo_root: selectedRepo?.local_path ?? "/tmp",
          conversation_history: historyForRequest,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") break;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "token") {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + ev.content };
                }
                return copy;
              });
            } else if (ev.type === "citations") {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, citations: ev.files };
                }
                return copy;
              });
            } else if (ev.type === "followups") {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, followups: ev.questions };
                }
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.role === "assistant") last.content = "Failed to connect. Make sure the repo is indexed.";
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px - 56px)" }}>
      {/* Description */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>Codebase Chat</strong> lets you ask questions about your connected repo in plain English.
          Select a repo, then type your question — Wright will search the codebase and answer with relevant context and file citations.
        </p>
      </div>

      {/* Repo selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {loadingRepos ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Spinner size={7} gap={8} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Loading repos…</span>
          </div>
        ) : repos.length === 0 ? (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>No repos connected. Go to Home and connect one first.</span>
        ) : (
          <>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>Repo:</span>
            <select value={selectedRepoId} onChange={e => setSelectedRepoId(e.target.value)} style={selectStyle}>
              {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ padding: "24px 0" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Suggested questions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={!selectedRepo}
                  style={{ textAlign: "left", padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", cursor: selectedRepo ? "pointer" : "not-allowed", opacity: selectedRepo ? 1 : 0.5 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.role === "user" ? "var(--purple-muted)" : "var(--surface)", border: m.role === "user" ? "1px solid var(--border-hover)" : "1px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                  <MessageContent text={m.content} />
                  {m.role === "assistant" && streaming && i === messages.length - 1 && (
                    <span style={{ display: "inline-block", width: 7, height: 13, background: "var(--text-muted)", marginLeft: 2, verticalAlign: "middle", opacity: 0.8 }}>▌</span>
                  )}
                </div>
                {m.citations && m.citations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {m.citations.map(c => (
                      <span key={c} title={c} style={{ padding: "2px 8px", background: "var(--glow)", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-code)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{c.split("/").slice(-2).join("/")}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Follow-up suggestion chips — only on the last assistant message when not streaming */}
            {m.role === "assistant" && m.followups && m.followups.length > 0 && !streaming && i === messages.length - 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, paddingLeft: 4 }}>
                {m.followups.map((q, qi) => (
                  <button
                    key={qi}
                    onClick={() => send(q)}
                    style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(83,74,183,0.35)", borderRadius: 20, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "rgba(83,74,183,0.7)"; (e.target as HTMLButtonElement).style.color = "var(--text)"; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "rgba(83,74,183,0.35)"; (e.target as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Index status bar */}
      {selectedRepo && indexStatus !== "ready" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", marginBottom: 10,
          background: indexStatus === "indexing" ? "rgba(83,74,183,0.07)" : "rgba(175,169,236,0.04)",
          border: `1px solid ${indexStatus === "indexing" ? "rgba(83,74,183,0.25)" : "var(--border)"}`,
          borderRadius: 8,
        }}>
          {indexStatus === "checking" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SpinnerArc size={12} color="var(--text-muted)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                Checking index…
              </span>
            </div>
          )}
          {indexStatus === "indexing" && (
            <>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--purple-light)", display: "inline-block", animation: "pulse-hex 1.2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }}>
                Indexing {selectedRepo.name}…
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                Chat will be ready in a moment
              </span>
            </>
          )}
          {indexStatus === "unavailable" && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              Index unavailable — chat will work without file citations
            </span>
          )}
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={
            !selectedRepo ? "Select a repo above to start chatting…" :
            indexStatus === "indexing" ? "Indexing repo, almost ready…" :
            `Ask anything about ${selectedRepo.name}…`
          }
          disabled={!selectedRepo || indexStatus === "indexing"}
          rows={2}
          style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 14, padding: "10px 14px", outline: "none", resize: "none", opacity: selectedRepo && indexStatus !== "indexing" ? 1 : 0.4 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim() || !selectedRepo || indexStatus === "indexing"}
            style={{ padding: "8px 16px", background: input.trim() && selectedRepo && indexStatus !== "indexing" ? "var(--purple)" : "rgba(83,74,183,0.3)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, cursor: input.trim() && selectedRepo && !streaming && indexStatus !== "indexing" ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            {streaming && <SpinnerArc size={12} color="rgba(255,255,255,0.7)" />}
            {streaming ? "Thinking…" : "Send →"}
          </button>
          <button
            onClick={clearChat}
            style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
