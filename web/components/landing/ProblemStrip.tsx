"use client";

import { motion } from "framer-motion";

const CARDS = [
  {
    eyebrow: "01 / Docs rot",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>
      </svg>
    ),
    title: "Docs go stale the moment code ships.",
    without: {
      label: "Without Wright",
      visual: (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "rgba(226,75,74,0.8)", marginBottom: 5 }}>⚠  processPayment — drift detected</div>
          <div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 5 }}>⚠  validateCard — undocumented</div>
          <div style={{ color: "rgba(255,255,255,0.25)" }}>⚠  handleWebhook — stale</div>
        </div>
      ),
      desc: "Engineers ship, docs rot. No one notices until production breaks.",
    },
    with: {
      label: "With Wright",
      visual: (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "#1D9E75", marginBottom: 5 }}>✓  processPayment — docs current</div>
          <div style={{ color: "#1D9E75", marginBottom: 5 }}>✓  validateCard — documented</div>
          <div style={{ color: "#1D9E75" }}>✓  handleWebhook — up to date</div>
        </div>
      ),
      desc: "Every commit checks drift. Stale docs block the PR before they merge.",
    },
  },
  {
    eyebrow: "02 / Onboarding",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
    title: "New engineers lose days reading unfamiliar code.",
    without: {
      label: "Without Wright",
      visual: (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>&gt; how does auth work?</div>
          <div style={{ color: "rgba(226,75,74,0.7)", marginBottom: 5 }}>— reading 47 files...</div>
          <div style={{ color: "rgba(255,255,255,0.2)" }}>— still confused</div>
        </div>
      ),
      desc: "Days of context-reading. Tribal knowledge. Hope someone answers on Slack.",
    },
    with: {
      label: "With Wright",
      visual: (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "rgba(175,169,236,0.6)", marginBottom: 5 }}>&gt; wright chat — how does auth work?</div>
          <div style={{ color: "#1D9E75", marginBottom: 5 }}>JWT via validateToken() — auth/middleware.ts:14</div>
          <div style={{ color: "rgba(0,212,255,0.6)" }}>↗ 2 sources cited</div>
        </div>
      ),
      desc: "Ask anything. Get a sourced answer with exact file and line in seconds.",
    },
  },
  {
    eyebrow: "03 / AI context",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    ),
    title: "AI tools start blind to your codebase every session.",
    without: {
      label: "Without Wright",
      visual: (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "rgba(175,169,236,0.5)", marginBottom: 5 }}>Claude: "I don't have context</div>
          <div style={{ color: "rgba(175,169,236,0.5)", marginBottom: 5 }}>about your codebase. Could</div>
          <div style={{ color: "rgba(175,169,236,0.5)" }}>you paste the relevant code?"</div>
        </div>
      ),
      desc: "Paste code every session. Lose context. Repeat. Hours wasted.",
    },
    with: {
      label: "With Wright",
      visual: (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ color: "rgba(175,169,236,0.5)", marginBottom: 4 }}>[MCP] wright: search_docs called</div>
          <div style={{ color: "#1D9E75", marginBottom: 4 }}>✓ 847 functions indexed</div>
          <div style={{ color: "rgba(0,212,255,0.7)" }}>Claude: "Auth uses JWT — here's how..."</div>
        </div>
      ),
      desc: "MCP server feeds Claude Code, Cursor, and Copilot your live docs automatically.",
    },
  },
];

/**
 * Renders a section component that displays a problem statement with decorative background elements and a grid of comparison cards showing scenarios without and with the Wright solution.
 *
 * This React functional component creates a visually rich landing page section with animated background effects (dot grid, blurred orbs, decorative rings) and a header followed by a grid of cards. Each card maps over the CARDS array and displays a comparison between scenarios 'Without' (marked with X icon in red) and 'With Wright' (marked with check icon in green), featuring smooth hover interactions and staggered animation entrance effects using Framer Motion.
 * @returns {JSX.Element} A React section element containing layered background decorations, an animated header describing the problem, and a grid of animated comparison cards with hover effects.
 * @example
 * <ProblemStrip />
 */
export default function ProblemStrip() {
  return (
    <section className="problem-section" style={{ display: "flex", flexDirection: "column" }}>
      {/* Background layer */}
      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(175,169,236,0.12) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none", zIndex: 0 }} />
      {/* Blurred orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-5%", width: 600, height: 600, background: "rgba(34,211,238,0.35)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "0%", width: 550, height: 550, background: "rgba(83,74,183,0.4)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />
      {/* Decorative ring */}
      <div style={{ position: "absolute", top: "50%", right: "8%", transform: "translateY(-50%)", width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(34,211,238,0.1)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "50%", right: "8%", transform: "translateY(-50%)", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(34,211,238,0.07)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1600, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 40, flexShrink: 0 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            The problem
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3vw, 48px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            Documentation always loses
            <br />to shipping speed.
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="problem-grid">
          {CARDS.map((card, i) => (
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
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 24,
                transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border-hover)";
                el.style.transform = "translateY(-3px)";
                el.style.boxShadow = "0 24px 56px rgba(0,0,0,0.35)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              {/* Card header */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ color: "var(--text-muted)", display: "flex" }}>{card.icon}</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{card.eyebrow}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", lineHeight: 1.35, letterSpacing: "-0.01em" }}>
                  {card.title}
                </h3>
              </div>

              {/* With / Without split */}
              <div style={{ display: "flex", gap: 12 }}>

                {/* Without */}
                <div style={{
                  flex: 1,
                  background: "rgba(226,75,74,0.05)",
                  border: "1px solid rgba(226,75,74,0.15)",
                  borderRadius: 12,
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {/* X icon */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: "rgba(226,75,74,0.2)",
                      border: "1px solid rgba(226,75,74,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 2l6 6M8 2l-6 6"/>
                      </svg>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(226,75,74,0.8)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Without</span>
                  </div>

                  <div style={{ flex: 1, minHeight: 0 }}>{card.without.visual}</div>

                  <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text)", lineHeight: 1.6, flexShrink: 0 }}>
                    {card.without.desc}
                  </p>
                </div>

                {/* With */}
                <div style={{
                  flex: 1,
                  background: "rgba(29,158,117,0.05)",
                  border: "1px solid rgba(29,158,117,0.18)",
                  borderRadius: 12,
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {/* Check icon */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: "rgba(29,158,117,0.2)",
                      border: "1px solid rgba(29,158,117,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5"/>
                      </svg>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(29,158,117,0.9)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Wright</span>
                  </div>

                  <div style={{ flex: 1, minHeight: 0 }}>{card.with.visual}</div>

                  <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text)", lineHeight: 1.6, flexShrink: 0 }}>
                    {card.with.desc}
                  </p>
                </div>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
