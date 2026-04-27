"use client";

import { useState } from "react";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";

const selectStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)",
  fontFamily: "var(--font-mono)", fontSize: 13,
  padding: "8px 14px", outline: "none", cursor: "pointer",
};

const SAMPLE = `# my-project

> Auto-generated llms.txt for my-project. Provides codebase context for AI tools.
> Generated: 2026-04-21T09:42:00Z  |  4 files  |  9 functions

## src/payments/core.ts

### \`processPayment(amount: number, card: CardInput) -> PaymentResult\`  *(line 12)*
Process a payment transaction with retry logic and idempotency.

### \`validateCard(card: CardInput) -> boolean\`  *(line 38)*
Validate card details against Luhn algorithm. Throws InvalidCardError.

### class \`PaymentService\`
Handles Stripe integration and retry scheduling.

  ### \`async charge(customerId: string, amount: number) -> ChargeResult\`  *(line 72)*
  @router.post("/charge")
  Charge a customer and persist the transaction record.

## src/auth/middleware.ts

### \`authenticate(token: string) -> User\`  *(line 14)*
Verify JWT signature and expiry, return decoded User or raise 401.

### \`refreshToken(token: string) -> string\`  *(line 31)*
Issue a new token if within the refresh window, otherwise raise.`;

function PulsingDot() {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: "#534AB7", opacity: 0.9,
      animation: "pulse 1.2s ease-in-out infinite",
    }} />
  );
}

export default function LlmsTxtPage() {
  const { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();
  const [content, setContent] = useState<string | null>(null);
  const [functionCount, setFunctionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/llms-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_root: selectedRepo.local_path }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setContent(data.content ?? JSON.stringify(data, null, 2));
      setFunctionCount(data.function_count ?? null);
    } catch (e: any) {
      setError(`${e.message} — llms-txt endpoint may not be deployed yet`);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (content) { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const download = () => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "llms.txt"; a.click();
  };

  const lineCount = content ? content.split("\n").length : 0;
  const fnCount = functionCount ?? (content ? (content.match(/^### `/mg) || []).length : 0);

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(0.85)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .llms-line:hover { background: rgba(175,169,236,0.04); }
      `}</style>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ── Left panel ── */}
        <div style={{ width: 288, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* What is llms.txt */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>llms.txt</span>
              <span style={{
                padding: "2px 8px", borderRadius: 999,
                background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
                fontFamily: "var(--font-mono)", fontSize: 10, color: "#00D4FF", letterSpacing: "0.06em",
              }}>OPEN STANDARD</span>
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
              A token-efficient index of every function in your repo. Paste it into Claude, Cursor, or any AI tool — it instantly understands your codebase without reading every source file.
            </p>
          </div>

          {/* Repo selector + generate */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Repository</p>
            {loadingRepos ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Loading repos…</span>
            ) : repos.length === 0 ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>No repos connected. Go to Home and connect one first.</span>
            ) : (
              <>
                <select
                  value={selectedRepoId}
                  onChange={e => { setSelectedRepoId(e.target.value); setContent(null); setFunctionCount(null); }}
                  style={{ ...selectStyle, width: "100%" }}
                >
                  {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button
                  onClick={generate}
                  disabled={loading || !selectedRepo}
                  style={{
                    padding: "10px 0",
                    background: loading || !selectedRepo ? "rgba(83,74,183,0.2)" : "var(--purple)",
                    color: loading || !selectedRepo ? "rgba(175,169,236,0.4)" : "#fff",
                    border: "none", borderRadius: 8,
                    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14,
                    cursor: loading || !selectedRepo ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                >
                  {loading ? <><PulsingDot /> Generating…</> : "Generate llms.txt"}
                </button>
              </>
            )}
          </div>

          {error && (
            <div style={{ padding: "12px 14px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          {/* Post-generation actions */}
          {content && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Export</p>

              <button
                onClick={copy}
                style={{
                  padding: "9px 0",
                  background: copied ? "rgba(29,158,117,0.1)" : "transparent",
                  border: `1px solid ${copied ? "rgba(29,158,117,0.4)" : "var(--border)"}`,
                  borderRadius: 8,
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  color: copied ? "var(--green)" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {copied ? (
                  <><svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>Copied</>
                ) : (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy to clipboard</>
                )}
              </button>

              <button
                onClick={download}
                style={{ padding: "9px 0", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download llms.txt
              </button>

              {/* Stats */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {[
                  { label: "functions", value: fnCount },
                  { label: "lines", value: lineCount },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, padding: "8px 10px", background: "rgba(83,74,183,0.08)", border: "1px solid rgba(83,74,183,0.15)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "#AFA9EC" }}>{s.value}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to use */}
          {!content && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>How to use</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "🤖", text: "Paste into Claude or ChatGPT for instant codebase context" },
                  { icon: "📁", text: "Commit to your repo root so agents always find it" },
                  { icon: "🔗", text: "Share with teammates — no tooling required to read it" },
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{tip.icon}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {content ? (
            /* Real output */
            <div style={{ background: "#07051a", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 12, overflow: "hidden", height: "calc(100vh - 160px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(175,169,236,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.4)", marginLeft: 6 }}>llms.txt</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.3)" }}>{selectedRepo?.name}</span>
              </div>
              <div style={{ height: "calc(100% - 41px)", overflow: "auto", padding: "18px 20px" }}>
                {content.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className="llms-line"
                    style={{
                      fontFamily: "var(--font-mono)", fontSize: 13,
                      lineHeight: "1.8", whiteSpace: "pre", borderRadius: 3, padding: "0 4px", margin: "0 -4px",
                      color: line.startsWith("# ") ? "#AFA9EC"
                        : line.startsWith("## ") ? "#7F77DD"
                        : line.startsWith("### ") ? "#00D4FF"
                        : line.startsWith(">") ? "rgba(175,169,236,0.35)"
                        : "var(--text-code)",
                    }}
                  >
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty state — sample preview */
            <div style={{ background: "#07051a", border: "1px solid rgba(175,169,236,0.08)", borderRadius: 12, overflow: "hidden", height: "calc(100vh - 160px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(175,169,236,0.06)", background: "rgba(255,255,255,0.015)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(226,75,74,0.3)", display: "block" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(239,159,39,0.3)", display: "block" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(29,158,117,0.3)", display: "block" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.2)", marginLeft: 6 }}>llms.txt — preview</span>
                </div>
                <span style={{
                  padding: "2px 8px", borderRadius: 4,
                  background: "rgba(175,169,236,0.04)", border: "1px solid rgba(175,169,236,0.1)",
                  fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.25)",
                }}>sample output</span>
              </div>

              <div style={{ position: "relative", height: "calc(100% - 41px)", overflow: "hidden" }}>
                {/* Dimmed sample lines */}
                <div style={{ padding: "18px 20px", opacity: 0.28 }}>
                  {SAMPLE.split("\n").map((line, i) => (
                    <div key={i} style={{
                      fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: "1.8", whiteSpace: "pre",
                      color: line.startsWith("# ") ? "#AFA9EC"
                        : line.startsWith("## ") ? "#7F77DD"
                        : line.startsWith("### ") ? "#00D4FF"
                        : line.startsWith(">") ? "rgba(175,169,236,0.5)"
                        : "var(--text-code)",
                    }}>
                      {line || "\u00A0"}
                    </div>
                  ))}
                </div>

                {/* Centre overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "radial-gradient(ellipse at center, rgba(7,5,26,0.82) 30%, transparent 100%)",
                  gap: 16,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: "rgba(83,74,183,0.12)", border: "1px solid rgba(127,119,221,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                  }}>📄</div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--text)", margin: "0 0 6px" }}>
                      {loading ? "Scanning your codebase…" : "Your llms.txt will appear here"}
                    </p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
                      {loading
                        ? "Parsing functions and building the index — this takes a few seconds."
                        : "Select a repo and click Generate to create a machine-readable index of every function."}
                    </p>
                  </div>
                  {loading && (
                    <div style={{ display: "flex", gap: 5 }}>
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#534AB7", animation: `pulse 1.2s ${delay}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}