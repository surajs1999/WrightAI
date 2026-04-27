"use client";

import { useEffect, useState } from "react";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://wrightai-api.fly.dev";

type Tool = "claude" | "cursor" | "continue" | "windsurf";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "claude", label: "Claude Code", icon: "✦" },
  { id: "cursor", label: "Cursor", icon: "⌘" },
  { id: "continue", label: "Continue", icon: "▶" },
  { id: "windsurf", label: "Windsurf", icon: "〜" },
];

function configFor(tool: Tool, apiKey: string, repoPath: string): string {
  const key = apiKey || "YOUR_API_KEY";
  const repo = repoPath || "/path/to/your/repo";

  const server = {
    url: `${API_URL}/mcp`,
    headers: { "X-Wright-API-Key": key, "X-Repo-Root": repo },
  };

  if (tool === "claude") {
    return JSON.stringify(
      { mcpServers: { wright: server } },
      null, 2
    );
  }
  if (tool === "cursor") {
    return JSON.stringify(
      { mcpServers: { wright: server } },
      null, 2
    );
  }
  if (tool === "continue") {
    return JSON.stringify(
      {
        experimental: {
          modelContextProtocolServers: [
            { transport: { type: "http", url: `${API_URL}/mcp`, requestOptions: { headers: { "X-Wright-API-Key": key, "X-Repo-Root": repo } } } },
          ],
        },
      },
      null, 2
    );
  }
  // windsurf
  return JSON.stringify(
    { mcpServers: { wright: server } },
    null, 2
  );
}

function configPath(tool: Tool): string {
  const paths: Record<Tool, string> = {
    claude: "~/.claude/mcp.json  (or use: claude mcp add)",
    cursor: "~/.cursor/mcp.json",
    continue: "~/.continue/config.json",
    windsurf: "~/.codeium/windsurf/mcp_config.json",
  };
  return paths[tool];
}

export default function McpPage() {
  const { repos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();
  const [activeTool, setActiveTool] = useState<Tool>("claude");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [tested, setTested] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  const fetchKey = () => {
    fetch("/api/auth/key")
      .then(r => r.json())
      .then((d: { key: string }) => setApiKey(d.key ?? ""))
      .catch(() => {});
  };

  useEffect(() => {
    fetchKey();
    window.addEventListener("focus", fetchKey);
    return () => window.removeEventListener("focus", fetchKey);
  }, []);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const testConnection = async () => {
    setTested("loading");
    try {
      const res = await fetch("/api/proxy/health", { method: "GET" }).catch(() => null)
        ?? await fetch(`${API_URL}/health`);
      setTested(res.ok ? "ok" : "fail");
    } catch {
      setTested("fail");
    }
    setTimeout(() => setTested("idle"), 4000);
  };

  const config = configFor(activeTool, apiKey, selectedRepo?.local_path ?? "");

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "18px 22px",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 6 }}>
              MCP Server
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              Connect Wright AI to Claude Code, Cursor, Continue, or any MCP-compatible editor.
              Your AI assistant can then query your codebase, check coverage, and detect drift directly from the chat.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green, #4ade80)", boxShadow: "0 0 6px var(--green, #4ade80)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>Server online</span>
            </div>
            <button
              onClick={testConnection}
              disabled={tested === "loading"}
              style={{
                padding: "6px 14px", background: "transparent",
                border: "1px solid var(--border)", borderRadius: 8,
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: tested === "ok" ? "var(--green, #4ade80)" : tested === "fail" ? "var(--red)" : "var(--text-muted)",
                cursor: tested === "loading" ? "default" : "pointer",
              }}
            >
              {tested === "loading" ? "Testing…" : tested === "ok" ? "✓ Connected" : tested === "fail" ? "✕ Failed" : "Test connection"}
            </button>
          </div>
        </div>
      </div>

      {/* Server URL + API key row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Server URL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", wordBreak: "break-all" }}>
              {API_URL}/mcp
            </code>
            <button
              onClick={() => copy("url", `${API_URL}/mcp`)}
              style={{ flexShrink: 0, padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
            >
              {copied === "url" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>API Key</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", wordBreak: "break-all" }}>
              {apiKey ? `${apiKey.slice(0, 7)}${"•".repeat(12)}${apiKey.slice(-4)}` : "—"}
            </code>
            <button
              onClick={() => apiKey && copy("key", apiKey)}
              disabled={!apiKey}
              style={{ flexShrink: 0, padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: apiKey ? "pointer" : "default", opacity: apiKey ? 1 : 0.5 }}
            >
              {copied === "key" ? "✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Repo selector */}
      {repos.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>Repo for config:</span>
          <select
            value={selectedRepoId}
            onChange={e => setSelectedRepoId(e.target.value)}
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, padding: "6px 12px", outline: "none", cursor: "pointer" }}
          >
            {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {selectedRepo && (
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{selectedRepo.local_path}</code>
          )}
        </div>
      )}

      {/* Tool tabs + config */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
          Setup guide
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 8,
                border: "1px solid var(--border)",
                background: activeTool === t.id ? "rgba(83,74,183,0.14)" : "transparent",
                borderColor: activeTool === t.id ? "rgba(83,74,183,0.4)" : "var(--border)",
                color: activeTool === t.id ? "var(--text)" : "var(--text-muted)",
                fontFamily: "var(--font-body)", fontSize: 13,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 12 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <Step n={1} text={
            activeTool === "claude"
              ? 'Open your Claude Code config or run: claude mcp add'
              : `Open or create the config file at: ${configPath(activeTool)}`
          } />
          <Step n={2} text="Paste the config below (your API key and repo path are pre-filled)." />
          <Step n={3} text={
            activeTool === "claude"
              ? 'Restart Claude Code. Type /mcp in the chat to verify Wright is connected.'
              : `Restart ${TOOLS.find(t => t.id === activeTool)?.label}. Wright tools will appear in the AI chat.`
          } />
        </div>

        {/* Config block */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8, zIndex: 1 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", padding: "2px 8px", background: "rgba(175,169,236,0.06)", borderRadius: 4, border: "1px solid var(--border)" }}>
              {configPath(activeTool)}
            </span>
            <button
              onClick={() => copy("config", config)}
              style={{ padding: "3px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
            >
              {copied === "config" ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre style={{
            background: "#0A0818", border: "1px solid var(--border)", borderRadius: 10,
            padding: "14px 16px", paddingTop: 42,
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)",
            overflowX: "auto", margin: 0, lineHeight: 1.6,
          }}>
            {config}
          </pre>
        </div>

        {!apiKey && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--amber)", marginTop: 12 }}>
            ⚠ Log in to auto-fill your API key, or get it from the{" "}
            <a href="/dashboard/keys" style={{ color: "var(--purple-light)", textDecoration: "none" }}>API Keys</a> page.
          </p>
        )}
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
        background: "rgba(83,74,183,0.15)", border: "1px solid rgba(83,74,183,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", fontWeight: 600,
      }}>
        {n}
      </div>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, paddingTop: 2 }}>{text}</span>
    </div>
  );
}
