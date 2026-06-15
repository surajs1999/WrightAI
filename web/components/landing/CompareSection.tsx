"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Verdict = "yes" | "no" | "partial";

const CAP_W = 200;
const COL_W = 125;

const COLUMNS: { key: "wright" | "copilot" | "cursor" | "mintlify" | "swimm"; label: string; sub: string; highlight?: boolean }[] = [
  { key: "wright", label: "Wright", sub: "All-in-one", highlight: true },
  { key: "copilot", label: "GitHub Copilot", sub: "AI copilot" },
  { key: "cursor", label: "Cursor", sub: "AI copilot" },
  { key: "mintlify", label: "Mintlify", sub: "AI docs" },
  { key: "swimm", label: "Swimm", sub: "Code docs" },
];

const ROWS: { capability: string; wright: Verdict; copilot: Verdict; cursor: Verdict; mintlify: Verdict; swimm: Verdict }[] = [
  { capability: "Batch docstring generation", wright: "yes", copilot: "partial", cursor: "partial", mintlify: "partial", swimm: "no" },
  { capability: "Call-graph aware context", wright: "yes", copilot: "partial", cursor: "partial", mintlify: "no", swimm: "no" },
  { capability: "Doc coverage tracking", wright: "yes", copilot: "no", cursor: "no", mintlify: "no", swimm: "no" },
  { capability: "Drift detection in CI", wright: "yes", copilot: "no", cursor: "no", mintlify: "no", swimm: "partial" },
  { capability: "Auto-fix PRs for docs", wright: "yes", copilot: "no", cursor: "no", mintlify: "no", swimm: "partial" },
  { capability: "MCP server for your repo", wright: "yes", copilot: "no", cursor: "no", mintlify: "no", swimm: "no" },
  { capability: "Cited file:line answers", wright: "yes", copilot: "partial", cursor: "partial", mintlify: "no", swimm: "no" },
  { capability: "Zero-config, free to start", wright: "yes", copilot: "partial", cursor: "partial", mintlify: "partial", swimm: "partial" },
];

/**
 * Renders a verdict glyph (check, dash, or wavy line) inside a colored circle.
 * @param {{ v: Verdict }} props - The verdict to render: "yes", "no", or "partial".
 * @returns {JSX.Element} An SVG icon representing the verdict.
 */
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

/**
 * Renders the "Why Wright" landing page section, comparing Wright against named AI
 * copilots and documentation tools across a grid of key capabilities.
 *
 * Displays an animated header (eyebrow, heading, and supporting copy) followed by a
 * comparison table with sticky "Capability" and "Wright" columns, a scroll-fade hint
 * for the remaining competitor columns on narrow viewports, and a legend explaining
 * the built-in / partial / unsupported icons.
 * @returns {JSX.Element} A section element containing the competitive comparison table.
 * @example
 * <CompareSection />
 */
export default function CompareSection() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section className="compare-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Decorative glows */}
      <div style={{ position: "absolute", top: "10%", left: "-10%", width: 500, height: 500, background: "rgba(83,74,183,0.18)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 480, height: 480, background: "rgba(34,211,238,0.12)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 48, maxWidth: 720, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}
        >
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              Why Wright
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3vw, 48px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.12, marginBottom: 18 }}>
              Copilot and Cursor write code. Mintlify and Swimm format docs.
              <br />
              <span style={{ color: "var(--cyan)" }}>Wright does it all — and keeps it in sync.</span>
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", lineHeight: 1.75 }}>
              GitHub Copilot and Cursor help you ship code, not document what&apos;s already there.
              Mintlify and Swimm format docs and snippets, but have no idea when they drift from
              your code. Wright generates docstrings across your whole repo, tracks coverage,
              blocks drift in CI, and feeds your live docs to every AI tool your team uses via MCP.
            </p>
          </div>
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
            <table className="compare-table">
              <colgroup>
                <col style={{ width: CAP_W }} />
                {COLUMNS.map(col => <col key={col.key} style={{ width: COL_W }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className="compare-sticky-1" style={{ padding: 0, background: "var(--bg)" }} />
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={col.highlight ? "compare-sticky-2" : undefined}
                      style={{ padding: 0, left: col.highlight ? CAP_W : undefined, background: col.highlight ? "#051927" : "var(--bg)" }}
                    >
                      {col.highlight && <div style={{ height: 3, background: "linear-gradient(90deg, #00B8E0, #00D4FF)" }} />}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="compare-sticky-1" style={{
                    fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700,
                    color: "rgba(175,169,236,0.4)", padding: "18px 24px", textAlign: "left",
                    borderBottom: "1px solid rgba(175,169,236,0.08)", background: "var(--bg)",
                  }}>
                    Capability
                  </th>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={col.highlight ? "compare-sticky-2" : undefined}
                      style={{
                        padding: "16px 10px", textAlign: "center", left: col.highlight ? CAP_W : undefined,
                        borderBottom: "1px solid rgba(175,169,236,0.08)",
                        background: col.highlight ? "#061320" : "var(--bg)",
                      }}
                    >
                      <div style={{
                        fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14,
                        color: col.highlight ? "var(--cyan)" : "var(--text)",
                        letterSpacing: "-0.01em", marginBottom: 3, lineHeight: 1.2,
                      }}>
                        {col.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.35)", letterSpacing: "0.04em" }}>
                        {col.sub}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => (
                  <tr key={ri} className="compare-row" style={{ borderBottom: ri === ROWS.length - 1 ? "none" : "1px solid rgba(175,169,236,0.05)" }}>
                    <td className="compare-cell compare-sticky-1" style={{ padding: "14px 24px" }}>
                      <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "rgba(240,238,248,0.85)", whiteSpace: "nowrap" }}>
                        {row.capability}
                      </span>
                    </td>
                    {COLUMNS.map(col => (
                      <td
                        key={col.key}
                        className={`compare-cell ${col.highlight ? "compare-cell-highlight compare-sticky-2" : ""}`}
                        style={{ padding: "16px 10px", textAlign: "center", left: col.highlight ? CAP_W : undefined }}
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

          {/* Scroll fade + hint, only when the table overflows its container */}
          {canScroll && (
            <>
              <div className="compare-fade-right" />
              <div style={{
                position: "absolute", top: -28, right: 0,
                fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.4)",
                letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5,
              }}>
                Scroll for more
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </>
          )}
        </motion.div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 20 }}>
          {([
            { v: "yes", label: "Built in" },
            { v: "partial", label: "Partial / manual setup" },
            { v: "no", label: "Not supported" },
          ] as { v: Verdict; label: string }[]).map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <VerdictIcon v={item.v} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
