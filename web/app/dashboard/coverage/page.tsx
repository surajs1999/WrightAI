"use client";

import { ga } from "@/lib/ga";
import { useEffect, useState } from "react";
import CoverageBar from "@/components/dashboard/CoverageBar";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";
import { Spinner, SkeletonBlock, SpinnerArc } from "@/components/dashboard/Spinner";

interface CoverageData {
  overall_pct: number;
  total: number;
  documented: number;
  undocumented: { function_name: string; file_path: string; line: number }[];
  by_folder: Record<string, number>;
}

const selectStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)",
  fontFamily: "var(--font-mono)", fontSize: 13,
  padding: "8px 14px", outline: "none", cursor: "pointer", width: "100%",
};

export default function CoveragePage() {
  const { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threshold = 80;

  useEffect(() => {
    ga.dashboardPageVisit("coverage");
    
    if (selectedRepo) run();
  }, [selectedRepo?.id]);

  async function run() {
    if (!selectedRepo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/coverage?repo_root=${encodeURIComponent(selectedRepo.local_path)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coverage.json"; a.click();
  };

  const pct = data?.overall_pct ?? 0;
  const circumference = 2 * Math.PI * 54;
  const stroke = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) 1fr", gap: 24, alignItems: "flex-start" }}>

      {/* Left panel — controls + summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Description */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Coverage</strong> scans your repo and reports how many functions have docstrings. Select a repo and click Run to see a breakdown by folder.
          </p>
        </div>

        {/* Repo selector + run */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Repository</div>
          {loadingRepos ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Spinner size={7} gap={8} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Loading repos…</span>
            </div>
          ) : repos.length === 0 ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>No repos connected. Go to Home and connect one first.</span>
          ) : (
            <>
              <select value={selectedRepoId} onChange={e => { setSelectedRepoId(e.target.value); setData(null); }} style={selectStyle}>
                {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button
                onClick={run}
                disabled={loading || !selectedRepo}
                style={{
                  padding: "9px", background: "var(--purple)", color: "#fff",
                  border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 14,
                  cursor: loading || !selectedRepo ? "not-allowed" : "pointer",
                  opacity: loading || !selectedRepo ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loading && <SpinnerArc size={13} color="#fff" />}
                {loading ? "Scanning…" : "Run coverage"}
              </button>
            </>
          )}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Donut + stats */}
        {data && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 18px" }}>
            {/* Donut */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ position: "relative", width: 130, height: 130 }}>
                <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(175,169,236,0.08)" strokeWidth="9" />
                  <circle cx="65" cy="65" r="54" fill="none" stroke={color} strokeWidth="9"
                    strokeDasharray={circumference} strokeDashoffset={stroke}
                    style={{ transition: "stroke-dashoffset 0.6s ease-out" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, color: "var(--text)", lineHeight: 1 }}>{pct.toFixed(0)}%</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>coverage</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Documented</span>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--green)" }}>{data.documented}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Undocumented</span>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: pct === 100 ? "var(--green)" : "var(--red)" }}>{data.total - data.documented}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Total</span>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{data.total}</span>
              </div>
            </div>

            {/* Threshold badge */}
            <div style={{
              marginTop: 14, padding: "8px 14px", borderRadius: 8,
              background: pct >= threshold ? "rgba(29,158,117,0.08)" : "rgba(239,159,39,0.08)",
              border: `1px solid ${pct >= threshold ? "rgba(29,158,117,0.25)" : "rgba(239,159,39,0.25)"}`,
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: pct >= threshold ? "var(--green)" : "var(--amber)",
              textAlign: "center",
            }}>
              Threshold {threshold}% · {pct < threshold ? `${(threshold - pct).toFixed(0)}% below` : "✓ passing"}
            </div>

            <button
              onClick={exportJson}
              style={{ marginTop: 12, width: "100%", padding: "7px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
            >
              Export JSON
            </button>
          </div>
        )}

        {/* Ghost skeleton while scanning */}
        {loading && !data && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ position: "relative", width: 130, height: 130 }}>
                <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(175,169,236,0.08)" strokeWidth="9" />
                  <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(175,169,236,0.12)" strokeWidth="9"
                    strokeDasharray="339.3" strokeDashoffset="169.6"
                    style={{ animation: "skeleton-wave 1.6s ease-in-out infinite" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <SkeletonBlock width={44} height={28} />
                  <SkeletonBlock width={56} height={10} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ padding: "10px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <SkeletonBlock width={90} height={12} />
                  <SkeletonBlock width={32} height={16} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state while no data */}
        {!data && !loading && !error && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, opacity: 0.2, marginBottom: 10 }}>◎</div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Run coverage to see results
            </p>
          </div>
        )}
      </div>

      {/* Right panel — folder breakdown */}
      <div>
        {data && Object.keys(data.by_folder).length > 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Coverage by folder
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {(() => {
                  const entries = Object.values(data.by_folder);
                  const critical = entries.filter(p => p < 50).length;
                  const needsWork = entries.filter(p => p >= 50 && p < 80).length;
                  const good = entries.filter(p => p >= 80).length;
                  return <>
                    {critical > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)", background: "rgba(226,75,74,0.08)", padding: "2px 8px", borderRadius: 4 }}>{critical} critical</span>}
                    {needsWork > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--amber)", background: "rgba(239,159,39,0.08)", padding: "2px 8px", borderRadius: 4 }}>{needsWork} needs work</span>}
                    {good > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)", background: "rgba(29,158,117,0.08)", padding: "2px 8px", borderRadius: 4 }}>{good} good</span>}
                  </>;
                })()}
              </div>
            </div>

            {/* Column labels */}
            <div style={{ display: "grid", gridTemplateColumns: "16px 1fr auto 1fr auto", gap: 10, padding: "4px 10px", marginBottom: 4 }}>
              <span />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Folder</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "right", minWidth: 52 }}>Fns</span>
              <span />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "right", minWidth: 42 }}>Cov</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginBottom: 4 }} />

            {Object.entries(data.by_folder)
              .sort(([, a], [, b]) => { const tier = (p: number) => p >= 80 ? 0 : p >= 50 ? 1 : 2; return tier(a) - tier(b) || b - a; })
              .map(([folder, folderPct]) => (
                <CoverageBar key={folder} folder={folder} pct={folderPct} />
              ))}
          </div>
        ) : data && data.total === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid rgba(239,159,39,0.2)", borderRadius: 12, padding: "24px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--amber)" }}>
            ⚠ No supported source files found. Wright scans Python, JS/TS, Java, Go, and Rust.
          </div>
        ) : loading ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <SkeletonBlock width={140} height={11} />
              <div style={{ display: "flex", gap: 8 }}>
                <SkeletonBlock width={60} height={18} style={{ borderRadius: 4 }} />
                <SkeletonBlock width={72} height={18} style={{ borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12 }} />
            {[1, 0.85, 0.6, 0.4, 0.9, 0.3].map((w, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto 1fr auto", gap: 10, padding: "9px 10px", alignItems: "center" }}>
                <SkeletonBlock width={10} height={10} style={{ borderRadius: "50%" }} />
                <SkeletonBlock width={`${w * 100}%`} height={11} />
                <SkeletonBlock width={28} height={11} />
                <SkeletonBlock width="100%" height={6} style={{ borderRadius: 999 }} />
                <SkeletonBlock width={36} height={11} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "48px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
              Folder breakdown will appear here after running coverage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
