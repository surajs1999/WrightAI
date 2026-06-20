"use client";

import { motion } from "framer-motion";

const SIGNALS = [
  {
    stat: "10×",
    label: "faster code generation",
    desc: "AI coding assistants have multiplied developer output — without touching documentation quality.",
    color: "#7F77DD",
  },
  {
    stat: "~0",
    label: "improvement in doc accuracy",
    desc: "Every new AI coding tool writes more code. None of them verify that documentation keeps up.",
    color: "#E24B4A",
  },
  {
    stat: "∞",
    label: "documentation debt accumulating",
    desc: "The gap between code velocity and documentation accuracy widens every sprint.",
    color: "#EF9F27",
  },
];

const TIMELINE = [
  {
    year: "2022",
    event: "AI coding assistants launch",
    detail: "GitHub Copilot, ChatGPT go mainstream. Code creation accelerates dramatically.",
    color: "#7F77DD",
  },
  {
    year: "2023",
    event: "Code velocity doubles",
    detail: "Teams ship 2× more code with the same headcount. Documentation falls further behind.",
    color: "#8884A8",
  },
  {
    year: "2024",
    event: "Documentation debt crisis",
    detail: "AI tools start getting confused by outdated context. Onboarding takes longer, not less.",
    color: "#EF9F27",
  },
  {
    year: "2025",
    event: "WrightAI fills the gap",
    detail: "The documentation reliability layer that makes AI-accelerated codebases trustworthy.",
    color: "#1D9E75",
    highlight: true,
  },
];

const TRUTHS = [
  "Your README was accurate when it was written.",
  "Your API docs were correct at time of merge.",
  "Your onboarding guide was useful on day one.",
  "Every one of them drifts silently from that moment forward.",
];

export default function WhyNow() {
  return (
    <section id="section-whynow" className="v2-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(239,159,39,0.55) 30%, rgba(239,159,39,0.55) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(239,159,39,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Diagonal urgency arrows */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52'%3E%3Cpath d='M10 42 L26 10 L42 42' fill='none' stroke='rgba(239,159,39,0.07)' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundSize: "52px 52px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", top: "10%", right: "-5%", width: 600, height: 600, background: "rgba(127,119,221,0.08)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-5%", width: 480, height: 480, background: "rgba(226,75,74,0.06)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 64 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--amber)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            Why this matters now
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 20 }}>
            AI is accelerating code creation.
            <br />
            <span style={{ color: "var(--amber)" }}>Documentation is not keeping pace.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 660 }}>
            The same AI revolution that made your team ship faster has made your documentation
            problem significantly worse. WrightAI is the reliability layer between
            rapidly evolving code and the trusted knowledge your team needs.
          </p>
        </motion.div>

        {/* Signal cards */}
        <div className="v2-signals-grid" style={{ marginBottom: 72 }}>
          {SIGNALS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: "clamp(40px, 4vw, 64px)",
                color: s.color,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}>
                {s.stat}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>
                {s.label}
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Two columns: timeline + truth block */}
        <div className="v2-whynow-cols">

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1 }}
          >
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 28 }}>
              The documentation trust timeline
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {TIMELINE.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 20, position: "relative" }}>
                  {/* Vertical line */}
                  {i < TIMELINE.length - 1 && (
                    <div style={{
                      position: "absolute",
                      left: 20,
                      top: 40,
                      bottom: -12,
                      width: 1,
                      background: `linear-gradient(to bottom, ${item.color}40, ${TIMELINE[i+1].color}20)`,
                    }} />
                  )}

                  {/* Dot */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: item.highlight ? item.color : `${item.color}15`,
                    border: `2px solid ${item.color}${item.highlight ? "ff" : "40"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, zIndex: 1,
                    boxShadow: item.highlight ? `0 0 20px ${item.color}40` : "none",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: item.highlight ? "#fff" : item.color, fontWeight: 600, letterSpacing: "0.02em" }}>
                      {item.year}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ paddingBottom: 28 }}>
                    <div style={{
                      fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15,
                      color: item.highlight ? item.color : "var(--text)",
                      letterSpacing: "-0.01em", marginBottom: 4,
                    }}>
                      {item.event}
                    </div>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Truth block */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ flex: 1 }}
          >
            <div style={{
              background: "linear-gradient(135deg, rgba(13,11,31,0.8) 0%, rgba(8,6,26,0.9) 100%)",
              border: "1px solid rgba(175,169,236,0.1)",
              borderRadius: 20,
              padding: "36px 32px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                  The uncomfortable truth
                </p>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
                  Every piece of documentation starts accurate and becomes a lie.
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TRUTHS.map((truth, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: i < TRUTHS.length - 1 ? "rgba(29,158,117,0.1)" : "rgba(226,75,74,0.12)",
                      border: `1px solid ${i < TRUTHS.length - 1 ? "rgba(29,158,117,0.25)" : "rgba(226,75,74,0.3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      {i < TRUTHS.length - 1 ? (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>
                      ) : (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>
                      )}
                    </div>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: 14,
                      color: i < TRUTHS.length - 1 ? "rgba(240,238,248,0.75)" : "var(--text)",
                      lineHeight: 1.55,
                      fontWeight: i === TRUTHS.length - 1 ? 600 : 400,
                    }}>
                      {truth}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{
                padding: "18px 20px",
                background: "rgba(83,74,183,0.08)",
                border: "1px solid rgba(83,74,183,0.2)",
                borderRadius: 12,
                marginTop: "auto",
              }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text)", lineHeight: 1.65 }}>
                  <strong style={{ color: "var(--purple-light)" }}>WrightAI</strong> is the only tool built
                  specifically to stop that drift — continuously, automatically, across every repository.
                </p>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
