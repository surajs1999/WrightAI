"use client";

import { motion } from "framer-motion";

const DRIFT_TYPES = [
  {
    type: "Structural Drift",
    color: "#EF9F27",
    bg: "rgba(239,159,39,0.06)",
    border: "rgba(239,159,39,0.2)",
    desc: "The function's interface changed but its documentation didn't follow.",
    examples: [
      { change: "Parameter renamed", before: "amount: number", after: "amountCents: number" },
      { change: "Return type changed", before: "returns: boolean", after: "returns: { valid: bool, reason: string }" },
      { change: "New required param", before: "3 parameters", after: "4 parameters (currency added)" },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    type: "Semantic Drift",
    color: "#E24B4A",
    bg: "rgba(226,75,74,0.06)",
    border: "rgba(226,75,74,0.2)",
    desc: "The function's behavior changed but its signature stayed the same.",
    examples: [
      { change: "Algorithm changed", before: "\"uses linear search\"", after: "Now uses binary search (undocumented)" },
      { change: "Side effect added", before: "\"pure function\"", after: "Now writes to cache (undocumented)" },
      { change: "Error handling changed", before: "\"throws on invalid\"", after: "Now returns null (silent)" },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
      </svg>
    ),
  },
];

const FLOW_STEPS = [
  {
    step: "01",
    label: "Code Changes",
    desc: "Developer pushes a commit that modifies function signatures or behavior",
    color: "#8884A8",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
  },
  {
    step: "02",
    label: "Drift Detected",
    desc: "WrightAI compares new code structure against existing documentation in real-time",
    color: "#EF9F27",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    step: "03",
    label: "Docs Updated",
    desc: "WrightAI regenerates accurate documentation for the drifted functions automatically",
    color: "#00D4FF",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>
      </svg>
    ),
  },
  {
    step: "04",
    label: "Trust Preserved",
    desc: "Every developer, AI tool and stakeholder gets documentation they can rely on",
    color: "#1D9E75",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
];

export default function DriftSection() {
  return (
    <section id="drift" className="v2-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(239,159,39,0.6) 30%, rgba(239,159,39,0.6) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(239,159,39,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Sine waveform — drift over time */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='50'%3E%3Cpath d='M0 25 Q25 8 50 25 Q75 42 100 25 Q125 8 150 25 Q175 42 200 25' fill='none' stroke='rgba(239,159,39,0.07)' stroke-width='1.5'/%3E%3C/svg%3E\")", backgroundSize: "200px 50px", backgroundRepeat: "repeat", pointerEvents: "none", zIndex: 0 }} />

      {/* Accent glow */}
      <div style={{ position: "absolute", top: "20%", right: "-8%", width: 600, height: 600, background: "rgba(239,159,39,0.08)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "15%", left: "-5%", width: 500, height: 500, background: "rgba(0,212,255,0.07)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 56 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#EF9F27", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            Drift detection — the core differentiator
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 18 }}>
            Most AI tools <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>generate</span> documentation.
            <br />
            WrightAI <span style={{ color: "#EF9F27" }}>keeps it accurate.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 660 }}>
            Writing documentation once is easy. The hard problem is documentation that
            remains true as your codebase evolves. WrightAI solves this with continuous
            drift detection — a capability no other tool offers.
          </p>
        </motion.div>

        {/* Flow steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="v2-flow-grid"
          style={{ marginBottom: 64 }}
        >
          {FLOW_STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, position: "relative" }}>
              {/* Connector line */}
              {i < FLOW_STEPS.length - 1 && (
                <div style={{
                  position: "absolute",
                  top: 22,
                  left: "100%",
                  width: "calc(100% - 56px)",
                  height: 1,
                  background: `linear-gradient(to right, ${step.color}40, ${FLOW_STEPS[i+1].color}20)`,
                  zIndex: 0,
                  display: "var(--flow-connector-display, block)",
                }} className="flow-connector" />
              )}

              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `rgba(${step.color === "#1D9E75" ? "29,158,117" : step.color === "#EF9F27" ? "239,159,39" : step.color === "#00D4FF" ? "0,212,255" : "136,132,168"},0.1)`,
                border: `1px solid ${step.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: step.color, flexShrink: 0, position: "relative", zIndex: 1,
              }}>
                {step.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: `${step.color}80`, letterSpacing: "0.08em" }}>{step.step}</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--text)", letterSpacing: "-0.01em" }}>{step.label}</span>
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Drift types */}
        <div className="v2-drift-grid">
          {DRIFT_TYPES.map((dt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Type header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: dt.bg, border: `1px solid ${dt.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: dt.color, flexShrink: 0,
                }}>
                  {dt.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", letterSpacing: "-0.01em" }}>
                    {dt.type}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    {dt.desc}
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dt.examples.map((ex, j) => (
                  <div key={j} style={{
                    background: "rgba(13,11,31,0.5)",
                    border: "1px solid rgba(175,169,236,0.08)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {ex.change}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(226,75,74,0.8)", background: "rgba(226,75,74,0.07)", padding: "3px 8px", borderRadius: 6, textDecoration: "line-through", opacity: 0.8 }}>
                        {ex.before}
                      </code>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(175,169,236,0.3)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: dt.color, background: dt.bg, padding: "3px 8px", borderRadius: 6 }}>
                        {ex.after}
                      </code>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detected badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 999, width: "fit-content",
                background: "rgba(29,158,117,0.08)",
                border: "1px solid rgba(29,158,117,0.2)",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1D9E75" }}>
                  WrightAI detects this automatically
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom message */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            marginTop: 52,
            textAlign: "center",
            padding: "32px 40px",
            background: "linear-gradient(135deg, rgba(83,74,183,0.08) 0%, rgba(0,212,255,0.06) 100%)",
            border: "1px solid rgba(83,74,183,0.2)",
            borderRadius: 20,
            maxWidth: 900,
            margin: "52px auto 0",
          }}
        >
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(18px, 2vw, 26px)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 12 }}>
            WrightAI is not a documentation generator with a drift feature.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 620, margin: "0 auto" }}>
            It&apos;s a Documentation Intelligence Platform built around the insight that
            <strong style={{ color: "var(--text)" }}> documentation accuracy over time</strong> is
            the most important and most underserved problem in software engineering.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
