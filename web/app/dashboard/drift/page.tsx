"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";

interface PRModalState {
  open: boolean;
  running: boolean;
  result: { pr_url: string; fixed: string[]; errors: string[] } | null;
  error: string | null;
  fallbackToken: string;
}

interface DriftItem {
  function_name: string;
  file_path: string;
  status: string;
  reason: string | null;
}

interface DriftResult {
  total_checked: number;
  drifted: number;
  undocumented: number;
  up_to_date: number;
  results: DriftItem[];
}

const selectStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)",
  fontFamily: "var(--font-mono)", fontSize: 13,
  padding: "9px 12px", outline: "none", cursor: "pointer",
};

/**
 * Renders the Drift Check page component for detecting and fixing outdated docstrings in git commits.
 *
 * A React functional component that provides UI for running drift checks on connected repositories, displaying functions with outdated or missing documentation, and creating pull requests to fix them. Manages state for repository selection, drift check results, loading states, error handling, toast notifications, and a PR creation modal. Integrates with the useConnectedRepos hook and communicates with backend API endpoints for drift checking and PR creation.
 * @returns {JSX.Element} A React component displaying the drift check interface with repository selection, drift statistics, results table, and PR creation modal.
 * @example
 * <DriftPage />
 */
export default function DriftPage() {
  const router = useRouter();
  const { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();

  useEffect(() => {
    if (selectedRepo) run();
  }, [selectedRepo?.id]);
  const [data, setData] = useState<DriftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [prModal, setPrModal] = useState<PRModalState>({
    open: false, running: false, result: null, error: null, fallbackToken: "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openPrModal = () => setPrModal(s => ({ ...s, open: true, result: null, error: null }));
  const closePrModal = () => setPrModal(s => ({ ...s, open: false }));

  const runFixAndPR = async () => {
    if (!selectedRepo) return;
    setPrModal(s => ({ ...s, running: true, error: null, result: null }));
    try {
      const res = await fetch("/api/proxy/fix-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_root: selectedRepo.local_path,
          functions: drifted.map(r => ({ file_path: r.file_path, function_name: r.function_name })),
          style: "google",
          github_token: prModal.fallbackToken.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPrModal(s => ({ ...s, running: false, error: json.detail ?? `Error ${res.status}` }));
      } else {
        setPrModal(s => ({ ...s, running: false, result: json }));
      }
    } catch (e: any) {
      setPrModal(s => ({ ...s, running: false, error: e?.message ?? "Network error" }));
    }
  };

  const run = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/proxy/drift-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_root: selectedRepo.local_path }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fixItem = (item: DriftItem) => {
    const root = selectedRepo ? selectedRepo.local_path.replace(/\/$/, "") + "/" : "";
    const relPath = root && item.file_path.startsWith(root) ? item.file_path.slice(root.length) : item.file_path;
    sessionStorage.setItem("wright_fix_hint", JSON.stringify({
      fn: item.function_name,
      file: relPath,
      repoId: selectedRepo?.id ?? "",
    }));
    router.push("/dashboard/generate");
  };

  const fixAll = () => openPrModal();

  const drifted = data?.results.filter(r => r.status === "drifted" || r.status === "undocumented") ?? [];

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "9px 20px", background: disabled ? "rgba(83,74,183,0.4)" : "var(--purple)",
    color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)",
    fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1, transition: "all 0.15s",
  });

  return (
    <div style={{ position: "relative" }}>

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "12px 20px", zIndex: 200,
          fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 10,
          maxWidth: 480, textAlign: "center",
        }}>
          <span style={{ color: "var(--amber)" }}>⚡</span>{toast}
        </div>
      )}

      {/* Description */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 22 }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>Drift Check</strong> — scans all functions in your repo and flags any whose docstring is missing or doesn&apos;t match the current implementation.
          Select a repo and click <strong style={{ color: "var(--text)" }}>Run drift check</strong>. Hit <strong style={{ color: "var(--text)" }}>Fix →</strong> on any row to jump straight to Generate.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28, alignItems: "center" }}>
        {loadingRepos ? (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Loading repos…</span>
        ) : repos.length === 0 ? (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            No repos connected. Go to Home and connect one first.
          </span>
        ) : (
          <>
            <select value={selectedRepoId} onChange={e => { setSelectedRepoId(e.target.value); setData(null); }} style={selectStyle}>
              {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button
              onClick={run}
              disabled={loading || !selectedRepo}
              style={btnStyle(loading || !selectedRepo)}
              onMouseEnter={e => { if (!loading && selectedRepo) (e.currentTarget as HTMLElement).style.background = "#6058C8"; }}
              onMouseLeave={e => { if (!loading && selectedRepo) (e.currentTarget as HTMLElement).style.background = "var(--purple)"; }}
            >
              {loading ? "Checking…" : "Run drift check"}
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 20 }}>
          ✕ {error}
        </div>
      )}

      {loading && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", padding: "20px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
          Scanning all functions and checking docstrings…
        </div>
      )}

      {data && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Checked", val: data.total_checked, color: "var(--text-muted)", bg: "transparent" },
              { label: "Drifted", val: data.drifted, color: "var(--amber)", bg: "rgba(239,159,39,0.06)" },
              { label: "Undocumented", val: data.undocumented, color: "var(--red)", bg: "rgba(226,75,74,0.06)" },
              { label: "Up to date", val: data.up_to_date, color: "var(--green)", bg: "rgba(29,158,117,0.06)" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg || "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 22px", minWidth: 110, flex: 1 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, color: s.color, lineHeight: 1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Semantic drift Pro CTA */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "10px 16px", marginBottom: 18,
            background: "rgba(83,74,183,0.06)", border: "1px solid rgba(83,74,183,0.16)", borderRadius: 9,
            flexWrap: "wrap",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.6)" }}>
              Free plan shows structural drift only — semantic (LLM) analysis catches subtle logic changes.
            </span>
            <a href="/pricing" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#AFA9EC", textDecoration: "none", whiteSpace: "nowrap" }}>
              Upgrade for semantic drift →
            </a>
          </div>

          {drifted.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.6fr 1.2fr 100px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                {["Function", "File", "Issue", "Action"].map(h => (
                  <div key={h} style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                ))}
              </div>
              {drifted.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.6fr 1.2fr 100px", borderBottom: i < drifted.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(175,169,236,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.function_name}</div>
                  <div style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.file_path}>{r.file_path}</div>
                  <div style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: r.status === "undocumented" ? "var(--red)" : "var(--amber)" }}>
                    {r.status === "undocumented" ? "✕ " : "⚠ "}{r.reason ?? r.status}
                  </div>
                  <div style={{ padding: "11px 16px" }}>
                    <button onClick={() => fixItem(r)} style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "5px 14px", background: "rgba(175,169,236,0.07)", border: "1px solid rgba(175,169,236,0.2)", borderRadius: 6, color: "var(--purple-light)", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.background = "rgba(175,169,236,0.15)"; el.style.borderColor = "rgba(175,169,236,0.4)"; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.background = "rgba(175,169,236,0.07)"; el.style.borderColor = "rgba(175,169,236,0.2)"; }}
                    >Fix →</button>
                  </div>
                </div>
              ))}
            </div>{/* end overflowX scroll wrapper */}
              <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                  {drifted.length} function{drifted.length !== 1 ? "s" : ""} need attention
                </span>
                <button onClick={fixAll} style={{ padding: "8px 18px", background: "var(--purple)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#6058C8")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--purple)")}
                >Fix all → Open PR</button>
              </div>
            </div>
          )}

          {drifted.length === 0 && (
            <div style={{ padding: "32px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--green)", fontWeight: 500 }}>No drift detected</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>All documented functions are in sync with the latest commits.</div>
            </div>
          )}
        </>
      )}
      {/* PR Modal */}
      {prModal.open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget && !prModal.running) closePrModal(); }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
            padding: "28px 28px 24px", width: "100%", maxWidth: 460,
            fontFamily: "var(--font-body)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Open PR with fixes</div>
              {!prModal.running && (
                <button onClick={closePrModal} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
              )}
            </div>

            {prModal.result ? (
              <div>
                <div style={{ padding: "16px", background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ color: "var(--green)", fontWeight: 600, marginBottom: 8 }}>✓ PR created</div>
                  <a href={prModal.result.pr_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--purple-light)", fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all" }}>
                    {prModal.result.pr_url}
                  </a>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                    {prModal.result.fixed.length} function{prModal.result.fixed.length !== 1 ? "s" : ""} documented
                    {prModal.result.errors.length > 0 && `, ${prModal.result.errors.length} skipped`}
                  </div>
                </div>
                <button onClick={closePrModal} style={btnStyle(false)}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ padding: "14px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
                    Wright will generate docstrings for <strong style={{ color: "var(--text)" }}>{drifted.length} function{drifted.length !== 1 ? "s" : ""}</strong> and open a pull request on <strong style={{ color: "var(--text)" }}>{selectedRepo?.name}</strong>.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {drifted.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-code)" }}>
                        {r.function_name} <span style={{ color: "var(--text-muted)" }}>— {r.file_path.split("/").pop()}</span>
                      </div>
                    ))}
                    {drifted.length > 5 && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>+{drifted.length - 5} more</div>
                    )}
                  </div>
                </div>

                {prModal.error && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ padding: "10px 14px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: prModal.error.includes("token") ? 10 : 0 }}>
                      ✕ {prModal.error}
                    </div>
                    {prModal.error.includes("token") && (
                      <input
                        type="password"
                        value={prModal.fallbackToken}
                        onChange={e => setPrModal(s => ({ ...s, fallbackToken: e.target.value }))}
                        placeholder="GitHub token (ghp_…)"
                        autoFocus
                        style={{ width: "100%", boxSizing: "border-box", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, padding: "9px 12px", outline: "none" }}
                      />
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={closePrModal} disabled={prModal.running}
                    style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14, cursor: prModal.running ? "not-allowed" : "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={runFixAndPR} disabled={prModal.running || (!!prModal.error?.includes("token") && !prModal.fallbackToken.trim())} style={btnStyle(prModal.running || (!!prModal.error?.includes("token") && !prModal.fallbackToken.trim()))}>
                    {prModal.running ? "Creating PR…" : "Create PR"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
