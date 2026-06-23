"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ga } from "@/lib/ga";

type Verdict = "yes" | "no" | "partial";

const CAP_W = 220;
const COL_W = 120;

const COLUMNS: { key: "wright" | "copilot" | "cursor" | "claudecode" | "mintlify"; label: string; sub: string; highlight?: boolean }[] = [
  { key: "wright", label: "Wright AI", sub: "Doc Intelligence", highlight: true },
  { key: "copilot", label: "GitHub Copilot", sub: "AI copilot" },
  { key: "cursor", label: "Cursor", sub: "AI editor" },
  { key: "claudecode", label: "Claude Code", sub: "AI coding" },
  { key: "mintlify", label: "Mintlify", sub: "Doc formatter" },
];

const ROWS: { capability: string; tooltip?: string; wright: Verdict; copilot: Verdict; cursor: Verdict; claudecode: Verdict; mintlify: Verdict }[] = [
  {
    capability: "Documentation Drift Detection",
    tooltip: "Automatically detects when code changes make documentation stale",
    wright: "yes", copilot: "no", cursor: "no", claudecode: "no", mintlify: "no",
  },
  {
    capability: "Continuous accuracy verification",
    tooltip: "Ongoing monitoring that documentation remains truthful as code evolves",
    wright: "yes", copilot: "no", cursor: "no", claudecode: "no", mintlify: "no",
  },
  {
    capability: "Batch docstring generation",
    tooltip: "Generate documentation for entire repositories in one operation",
    wright: "yes", copilot: "partial", cursor: "partial", claudecode: "partial", mintlify: "partial",
  },
  {
    capability: "CI enforcement (block stale PRs)",
    tooltip: "Block pull requests when documentation is missing or drifted",
    wright: "yes", copilot: "no", cursor: "no", claudecode: "no", mintlify: "no",
  },
  {
    capability: "Documentation coverage tracking",
    tooltip: "Know exactly what percentage of your codebase is documented",
    wright: "yes", copilot: "no", cursor: "no", claudecode: "no", mintlify: "no",
  },
  {
    capability: "MCP server for AI tools",
    tooltip: "Exposes live documentation to Claude Code, Cursor and Copilot via MCP",
    wright: "yes", copilot: "no", cursor: "no", claudecode: "no", mintlify: "no",
  },
  {
    capability: "Codebase Q&A with citations",
    tooltip: "Answer questions about code with answers cited to exact file and line",
    wright: "yes", copilot: "partial", cursor: "partial", claudecode: "partial", mintlify: "no",
  },
  {
    capability: "Documentation health dashboard",
    tooltip: "Engineering-leader view of coverage, drift trends and repository health",
    wright: "yes", copilot: "no", cursor: "no", claudecode: "no", mintlify: "partial",
  },
  {
    capability: "Free to start, no credit card",
    wright: "yes", copilot: "no", cursor: "partial", claudecode: "no", mintlify: "partial",
  },
];

function VerdictIcon({ v }: { v: Verdict }) {
  if (v === "yes") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="rgba(29,158,117,0.15)" />
        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (v === "partial") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="rgba(239,159,39,0.13)" />
        <path d="M5 10c1-1.5 2-1.5 3-.5s2 1 3-.5" stroke="#EF9F27" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="rgba(255,255,255,0.03)" />
      <path d="M6 9h6" stroke="rgba(175,169,236,0.2)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function CompareV2() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const hoverStart = useRef<Record<string, number>>({});

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section id="compare" className="compare-section" style={{ background: "var(--surface)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4) 20%, rgba(127,119,221,0.55) 50%, rgba(0,212,255,0.4) 80%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(83,74,183,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Table grid — comparison structure */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(127,119,221,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(127,119,221,0.05) 1px, transparent 1px)", backgroundSize: "120px 52px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", top: "10%", left: "-10%", width: 500, height: 500, background: "rgba(83,74,183,0.15)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 480, height: 480, background: "rgba(0,212,255,0.09)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 48 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            Why Wright AI
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 18 }}>
            Copilot, Cursor and Claude Code
            <br />
            <span style={{ color: "var(--cyan)" }}>write code. Wright AI keeps it honest.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 640 }}>
            AI coding assistants accelerate code creation without improving documentation accuracy.
            WrightAI is the documentation reliability layer your team is missing — the only tool
            that verifies documentation remains true as code evolves.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ position: "relative", borderRadius: 16, border: "1px solid var(--border)" }}
        >
          <div ref={wrapRef} className="compare-table-wrap">
            <table className="compare-table" style={{ minWidth: 900 }}>
              <colgroup>
                <col style={{ width: CAP_W }} />
                {COLUMNS.map(col => <col key={col.key} style={{ width: COL_W }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className="compare-sticky-1" style={{ padding: 0, background: "var(--surface)" }} />
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={col.highlight ? "compare-sticky-2" : undefined}
                      style={{ padding: 0, left: col.highlight ? CAP_W : undefined, background: col.highlight ? "#030d18" : "var(--surface)" }}
                    >
                      {col.highlight && <div style={{ height: 3, background: "linear-gradient(90deg, #7F77DD, #00D4FF)" }} />}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="compare-sticky-1" style={{
                    fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700,
                    color: "rgba(175,169,236,0.4)", padding: "18px 24px", textAlign: "left",
                    borderBottom: "1px solid rgba(175,169,236,0.08)", background: "var(--surface)",
                  }}>
                    Capability
                  </th>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={col.highlight ? "compare-sticky-2" : undefined}
                      onMouseEnter={!col.highlight ? () => { hoverStart.current[col.key] = Date.now(); } : undefined}
                      onMouseLeave={!col.highlight ? () => {
                        const start = hoverStart.current[col.key];
                        if (start) {
                          const seconds = Math.round((Date.now() - start) / 1000);
                          delete hoverStart.current[col.key];
                          if (seconds >= 2) ga.compareCompetitorHover(col.label, seconds);
                        }
                      } : undefined}
                      style={{
                        padding: "16px 10px", textAlign: "center", left: col.highlight ? CAP_W : undefined,
                        borderBottom: "1px solid rgba(175,169,236,0.08)",
                        background: col.highlight ? "#04101e" : "var(--surface)",
                      }}
                    >
                      <div style={{
                        fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13,
                        color: col.highlight ? "var(--cyan)" : "var(--text)",
                        letterSpacing: "-0.01em", marginBottom: 3, lineHeight: 1.2,
                      }}>
                        {col.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(175,169,236,0.35)", letterSpacing: "0.04em" }}>
                        {col.sub}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => (
                  <tr key={ri} className="compare-row" style={{ borderBottom: ri === ROWS.length - 1 ? "none" : "1px solid rgba(175,169,236,0.05)" }}>
                    <td className="compare-cell compare-sticky-1" style={{ padding: "14px 24px", background: "var(--surface)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: ri < 2 ? "rgba(240,238,248,0.95)" : "rgba(240,238,248,0.8)", whiteSpace: "nowrap" }}>
                          {ri < 2 && (
                            <span style={{
                              display: "inline-block",
                              width: 6, height: 6, borderRadius: "50%",
                              background: "#EF9F27",
                              marginRight: 7,
                              verticalAlign: "middle",
                              marginBottom: 1,
                            }} />
                          )}
                          {row.capability}
                        </span>
                        {row.tooltip && (
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "rgba(136,132,168,0.55)", whiteSpace: "normal", lineHeight: 1.4 }}>
                            {row.tooltip}
                          </span>
                        )}
                      </div>
                    </td>
                    {COLUMNS.map(col => (
                      <td
                        key={col.key}
                        className={`compare-cell ${col.highlight ? "compare-cell-highlight compare-sticky-2" : ""}`}
                        style={{
                          padding: "16px 10px", textAlign: "center",
                          left: col.highlight ? CAP_W : undefined,
                          background: col.highlight ? "#051525" : "var(--surface)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <VerdictIcon v={row[col.key]} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canScroll && (
            <>
              <div className="compare-fade-right" />
              <div style={{
                position: "absolute", top: -28, right: 0,
                fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.4)",
                letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5,
              }}>
                Scroll for more
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </>
          )}
        </motion.div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 20, alignItems: "center" }}>
          {([
            { v: "yes", label: "Built in" },
            { v: "partial", label: "Partial / manual" },
            { v: "no", label: "Not supported" },
          ] as { v: Verdict; label: string }[]).map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <VerdictIcon v={item.v} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{item.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#EF9F27" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text-muted)" }}>
              Wright AI&apos;s exclusive capabilities — no other tool offers these
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
