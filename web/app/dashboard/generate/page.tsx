"use client";

import { useEffect, useState } from "react";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";

const LANGUAGES = ["Python", "TypeScript", "JavaScript", "Java", "Go", "Rust"];
const STYLES = ["google", "numpy", "jsdoc", "epytext", "rust"];
const VERBOSITY = ["concise", "standard", "detailed"];

const EXT: Record<string, string> = {
  Python: "py", TypeScript: "ts", JavaScript: "js", Java: "java", Go: "go", Rust: "rs",
};

/**
 * Generates CSS properties for a tab button with conditional styling based on its active state.
 *
 * Returns a React.CSSProperties object containing inline styles for a tab button component. When active, the button displays with a purple background and white text. When inactive, it shows a transparent background with muted text and border colors. All styles use CSS custom properties (variables) for theming consistency.
 *
 * @param {boolean} active - Determines whether the tab button should render in its active state (true) or inactive state (false).
 * @returns {React.CSSProperties} A CSS properties object containing padding, background, border, borderRadius, fontFamily, fontSize, color, cursor, and transition styles conditionally set based on the active parameter.
 * @example
 * const activeStyles = tabBtn(true); const inactiveStyles = tabBtn(false);
 */
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 20px",
  background: active ? "var(--purple)" : "transparent",
  border: `1px solid ${active ? "var(--purple)" : "var(--border)"}`,
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: active ? "#fff" : "var(--text-muted)",
  cursor: "pointer",
  transition: "all 0.15s",
});

const selectStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)",
  fontFamily: "var(--font-mono)", fontSize: 13,
  padding: "8px 12px", outline: "none", cursor: "pointer", width: "100%",
};

/**
 * Renders an AI-powered docstring generation interface that allows users to generate documentation for code snippets or repository files.
 *
 * This React component provides a comprehensive UI for generating docstrings using AI. It supports two modes: snippet mode (paste code directly) and repo mode (target specific files in connected repositories). Users can configure style (google, numpy, sphinx, restructuredtext) and verbosity (concise, standard, verbose) settings. The component handles API calls for docstring generation, displays preview output, and optionally creates pull requests with the generated documentation injected into repository files. It also restores navigation hints from session storage when navigating from the drift detection page.
 * @returns {JSX.Element} A React component rendering the docstring generation interface with tab navigation, input controls, output preview, and PR creation functionality.
 * @example
 * <GeneratePage />
 */
export default function GeneratePage() {
  const { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();

  const [tab, setTab] = useState<"snippet" | "repo">("repo");
  const [lang, setLang] = useState("Python");
  const [style, setStyle] = useState("google");
  const [verbosity, setVerbosity] = useState("standard");

  // Snippet mode
  const [code, setCode] = useState("");

  // Repo file mode
  const [filePath, setFilePath] = useState("");
  const [funcName, setFuncName] = useState("");

  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pr, setPr] = useState<{ running: boolean; url: string | null; error: string | null }>({ running: false, url: null, error: null });

  // Restore hint from drift page
  useEffect(() => {
    const hint = sessionStorage.getItem("wright_fix_hint");
    if (hint) {
      try {
        const { fn, file, repoId } = JSON.parse(hint);
        setTab("repo");
        setFuncName(fn ?? "");
        setFilePath(file ?? "");
        if (repoId) setSelectedRepoId(repoId);
        sessionStorage.removeItem("wright_fix_hint");
      } catch {}
    }
  }, []);

  const createPR = async () => {
    if (!selectedRepo) return;
    setPr({ running: true, url: null, error: null });
    const absPath = selectedRepo.local_path.replace(/\/$/, "") + "/" + filePath.replace(/^\//, "");
    try {
      const res = await fetch("/api/proxy/fix-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_root: selectedRepo.local_path,
          functions: [{ file_path: absPath, function_name: funcName.trim() || null }],
          style,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPr({ running: false, url: null, error: json.detail ?? `Error ${res.status}` });
      } else {
        setPr({ running: false, url: json.pr_url, error: null });
      }
    } catch (e: any) {
      setPr({ running: false, url: null, error: e?.message ?? "Network error" });
    }
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    setPr({ running: false, url: null, error: null });

    try {
      let body: Record<string, unknown>;

      if (tab === "snippet") {
        if (!code.trim()) { setError("Paste some code first."); setLoading(false); return; }
        body = {
          file_path: `/tmp/snippet.${EXT[lang] ?? "py"}`,
          function_name: null,
          repo_root: "/tmp",
          style,
          verbosity,
          dry_run: true,
          snippet: code,
        };
      } else {
        if (!selectedRepo) { setError("Select a repo first."); setLoading(false); return; }
        if (!filePath.trim()) { setError("Enter a file path within the repo."); setLoading(false); return; }
        const repoRoot = selectedRepo.local_path.replace(/\/$/, "");
        const relPath = filePath.replace(/^\//, "");
        const absPath = `${repoRoot}/${relPath}`;
        body = {
          file_path: absPath,
          function_name: funcName.trim() || null,
          repo_root: selectedRepo.local_path,
          style,
          verbosity,
          dry_run: true,
        };
      }

      const res = await fetch("/api/proxy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        setError(`Server returned a non-JSON response (HTTP ${res.status}). The API may be restarting — try again in a moment.`);
        return;
      }

      if (!res.ok) {
        setError((data.detail as string) ?? (data.error as string) ?? `API error ${res.status}`);
      } else if (data.preview) {
        setOutput(data.preview as string);
      } else if (data.error) {
        setError(data.error as string);
      } else {
        setError("No preview returned. Make sure the file contains at least one function.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error — could not reach the API.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (output) { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const canGenerate = tab === "snippet" ? !!code.trim() : !!selectedRepo && !!filePath.trim();

  return (
    <div>
      {/* Top bar: description + style controls inline */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 380, flexShrink: 0 }}>
          <strong style={{ color: "var(--text)" }}>Generate</strong> uses AI to write docstrings. Paste a snippet or target a file in a connected repo.
        </p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", flex: 1 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Style</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)} style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid var(--border)", background: style === s ? "var(--purple-muted)" : "transparent", color: style === s ? "var(--text)" : "var(--text-muted)", cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Verbosity</div>
            <div style={{ display: "flex", gap: 6 }}>
              {VERBOSITY.map(v => (
                <button key={v} onClick={() => setVerbosity(v)} style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid var(--border)", background: verbosity === v ? "var(--purple-muted)" : "transparent", color: verbosity === v ? "var(--text)" : "var(--text-muted)", cursor: "pointer" }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button style={tabBtn(tab === "snippet")} onClick={() => setTab("snippet")}>Snippet</button>
        <button style={tabBtn(tab === "repo")} onClick={() => setTab("repo")}>Repo file</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left — input */}
        <div>
          {tab === "snippet" ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Language</div>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => setLang(l)} style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid var(--border)", background: lang === l ? "var(--purple-muted)" : "transparent", color: lang === l ? "var(--text)" : "var(--text-muted)", cursor: "pointer" }}>{l}</button>
                  ))}
                </div>
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Paste your function here…"
                rows={12}
                style={{ width: "100%", background: "#0A0818", border: "1px solid var(--border)", borderRadius: 8, padding: "14px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", resize: "vertical", outline: "none", marginBottom: 12 }}
              />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Repo selector */}
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Repo</div>
                {loadingRepos ? (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Loading…</span>
                ) : repos.length === 0 ? (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>No repos connected. Go to Home first.</span>
                ) : (
                  <select value={selectedRepoId} onChange={e => setSelectedRepoId(e.target.value)} style={selectStyle}>
                    {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
              </div>

              {/* File path */}
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>File path (relative to repo root)</div>
                <input
                  value={filePath}
                  onChange={e => setFilePath(e.target.value)}
                  placeholder="e.g. core/embeddings/voyage_embeddings.py"
                  style={{ ...selectStyle, padding: "9px 12px" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(175,169,236,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              {/* Function name */}
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Function name <span style={{ textTransform: "none", fontSize: 9 }}>(optional — defaults to first function)</span></div>
                <input
                  value={funcName}
                  onChange={e => setFuncName(e.target.value)}
                  placeholder="e.g. calculate_total"
                  style={{ ...selectStyle, padding: "9px 12px" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(175,169,236,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              {selectedRepo && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", background: "rgba(175,169,236,0.04)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px" }}>
                  Root: {selectedRepo.local_path}
                </div>
              )}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !canGenerate}
            style={{ width: "100%", padding: "10px", background: canGenerate ? "var(--purple)" : "rgba(83,74,183,0.3)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15, cursor: canGenerate ? "pointer" : "default", marginTop: tab === "repo" ? 14 : 0 }}
          >
            {loading ? "Generating…" : "Generate docstring →"}
          </button>
        </div>

        {/* Right — output */}
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Output</div>
          <div style={{ background: "#0A0818", border: "1px solid var(--border)", borderRadius: 8, padding: "14px", minHeight: 360, position: "relative" }}>
            {output && (
              <button onClick={copy} style={{ position: "absolute", top: 10, right: 10, fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", cursor: "pointer" }}>
                {copied ? "✓" : "Copy"}
              </button>
            )}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: 8 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple-light)", animation: `pulse-hex 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
            {error && <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--red)" }}>{error}</p>}
            {output && (
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-code)", whiteSpace: "pre-wrap", margin: 0 }}>{output}</pre>
            )}
            {!loading && !output && !error && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Generated docstring will appear here.</p>
            )}
          </div>
          {output && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                Style: {style} · Verbosity: {verbosity}
              </div>
              {tab === "repo" && !pr.url && (
                <button
                  onClick={createPR}
                  disabled={pr.running}
                  style={{ padding: "6px 16px", background: pr.running ? "rgba(83,74,183,0.4)" : "var(--purple)", color: "#fff", border: "none", borderRadius: 7, fontFamily: "var(--font-body)", fontSize: 13, cursor: pr.running ? "not-allowed" : "pointer", opacity: pr.running ? 0.6 : 1 }}
                >
                  {pr.running ? "Creating PR…" : "Inject & open PR →"}
                </button>
              )}
            </div>
          )}
          {tab === "repo" && pr.url && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>✓ PR created</span>
              <a href={pr.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--purple-light)", wordBreak: "break-all" }}>{pr.url}</a>
            </div>
          )}
          {tab === "repo" && pr.error && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
              ✕ {pr.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
