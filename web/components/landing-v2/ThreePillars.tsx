"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const PILLARS = [
  {
    id: "generate",
    num: "01",
    label: "Generate",
    tagline: "From zero to documented.",
    description:
      "WrightAI scans your entire codebase and generates accurate, idiomatic documentation for every function, class and module. Python, TypeScript, JavaScript, Go, Rust — all supported out of the box. No config required.",
    outcomes: [
      "Batch docstring generation across entire repos",
      "Call-graph aware context (understands dependencies)",
      "Multiple docstring styles per language",
      "VS Code real-time generation on save",
    ],
    color: "#7F77DD",
    bg: "rgba(127,119,221,0.06)",
    border: "rgba(127,119,221,0.2)",
    visual: (
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.9 }}>
        <div style={{ color: "#AFA9EC" }}>{"$ wright coverage src/"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#8884A8" }}>{"  src/payments/core.ts       ██████████  97%"}</div>
        <div style={{ color: "#8884A8" }}>{"  src/auth/middleware.ts     ██████████  100%"}</div>
        <div style={{ color: "#8884A8" }}>{"  src/users/service.ts       █████████░  91%"}</div>
        <div style={{ color: "#EF9F27" }}>{"  src/notifications/push.ts  ██████░░░░  63%  ← below threshold"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#1D9E75" }}>{"  Overall: 94%  ·  threshold: 80%  ·  ✓ passing"}</div>
        <div style={{ color: "#8884A8", marginTop: 16, marginBottom: 4, borderTop: "1px solid rgba(175,169,236,0.08)", paddingTop: 14 }}>{""}</div>
        <div style={{ color: "#AFA9EC" }}>{"$ wright generate src/ --style google"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#7F77DD" }}>{"  ████████████████ 100%"}</div>
        <div style={{ color: "#8884A8" }}>{"  Generated 847 docstrings across 23 files"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#1D9E75" }}>{"  Coverage: 12% → 97%"}</div>
        <div style={{ color: "#8884A8" }}>{"  Styles: Google · NumPy · JSDoc · godoc"}</div>
        <div style={{ color: "#8884A8" }}>{"  Time: 4.2 seconds"}</div>
      </div>
    ),
  },
  {
    id: "verify",
    num: "02",
    label: "Verify",
    tagline: "Documentation that stays honest.",
    description:
      "The moment code changes, WrightAI detects if documentation has drifted from reality. Structural drift (renamed params, changed return types) and semantic drift (logic changed but docs weren't updated) are both caught automatically.",
    outcomes: [
      "Drift detection on every commit and file save",
      "Structural drift: parameter and return type changes",
      "Semantic drift: logic changed, docs not updated",
      "GitHub Actions CI enforcement — block stale PRs",
    ],
    color: "#00D4FF",
    bg: "rgba(0,212,255,0.05)",
    border: "rgba(0,212,255,0.18)",
    visual: (
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.9 }}>
        <div style={{ color: "#AFA9EC" }}>{"$ wright drift . --since HEAD~1"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#EF9F27" }}>{"  ⚠  processPayment()  payments/core.ts:88"}</div>
        <div style={{ color: "#8884A8" }}>{"     param 'amount' → 'amountCents'"}</div>
        <div style={{ color: "#EF9F27" }}>{"  ⚠  validateCard()    payments/core.ts:142"}</div>
        <div style={{ color: "#8884A8" }}>{"     return type changed: bool → object"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#E24B4A" }}>{"  2 drifts detected · CI will block this PR"}</div>
        <div style={{ color: "#8884A8", marginTop: 16, marginBottom: 4, borderTop: "1px solid rgba(175,169,236,0.08)", paddingTop: 14 }}>{""}</div>
        <div style={{ color: "#AFA9EC" }}>{"$ wright drift . --fix"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#1D9E75" }}>{"  ✓  processPayment() — docs regenerated"}</div>
        <div style={{ color: "#1D9E75" }}>{"  ✓  validateCard()   — docs regenerated"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#1D9E75" }}>{"  0 drifts remaining · PR unblocked"}</div>
      </div>
    ),
  },
  {
    id: "understand",
    num: "03",
    label: "Understand",
    tagline: "Ask anything. Get sourced answers.",
    description:
      "Every developer, AI tool, and stakeholder gets a single source of truth. Ask questions about your codebase in natural language and get accurate, cited answers — with exact file and line references.",
    outcomes: [
      "Natural language codebase Q&A",
      "Answers cited to exact file and line",
      "MCP server feeds Claude Code, Cursor, Copilot",
      "Always current — queries live indexed documentation",
    ],
    color: "#1D9E75",
    bg: "rgba(29,158,117,0.05)",
    border: "rgba(29,158,117,0.18)",
    visual: (
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.9 }}>
        <div style={{ color: "#22D3EE" }}>{"  > how does payment retry logic work?"}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "#1D9E75" }}>{"  processPayment() retries up to 3× with"}</div>
        <div style={{ color: "#1D9E75" }}>{"  exponential backoff (100ms, 400ms, 1600ms)."}</div>
        <div style={{ color: "#8884A8" }}>{""}</div>
        <div style={{ color: "rgba(175,169,236,0.5)" }}>{"  Source: payments/core.ts:88"}</div>
        <div style={{ color: "rgba(175,169,236,0.5)" }}>{"  Source: payments/retry.ts:23"}</div>
        <div style={{ color: "rgba(175,169,236,0.5)" }}>{"  2 sources · docs verified current"}</div>
      </div>
    ),
  },
];

export default function ThreePillars() {
  const [active, setActive] = useState(0);
  const pillar = PILLARS[active];

  return (
    <section id="pillars" className="v2-section" style={{ background: "var(--surface)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(127,119,221,0.6) 30%, rgba(127,119,221,0.6) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(127,119,221,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Hexagonal mesh — platform / structure */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52'%3E%3Cpolygon points='30,2 58,17 58,35 30,50 2,35 2,17' fill='none' stroke='rgba(127,119,221,0.09)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 52px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", top: "30%", left: "-8%", width: 500, height: 500, background: "rgba(83,74,183,0.1)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "10%", right: "-5%", width: 450, height: 450, background: "rgba(0,212,255,0.07)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 56, maxWidth: 640 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            How Wright AI works
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 18 }}>
            The Documentation
            <br />
            <span style={{ color: "var(--purple-light)" }}>Intelligence Platform.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.75 }}>
            Three capabilities working together to make documentation
            accurate, trustworthy and discoverable — not just created.
          </p>
        </motion.div>

        {/* Pillar tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 40, background: "rgba(13,11,31,0.5)", border: "1px solid var(--border)", borderRadius: 14, padding: 4, flexWrap: "wrap" }}>
          {PILLARS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActive(i)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.2s",
                background: active === i ? p.bg : "transparent",
                color: active === i ? p.color : "var(--text-muted)",
                outline: active === i ? `1px solid ${p.border}` : "none",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: active === i ? p.color : "rgba(175,169,236,0.3)",
                letterSpacing: "0.04em",
              }}>
                {p.num}
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Active pillar content */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="v2-pillar-cols"
        >
          {/* Left: description */}
          <div style={{ flex: "0 0 44%", maxWidth: 520 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 14px", borderRadius: 999,
              background: pillar.bg,
              border: `1px solid ${pillar.border}`,
              marginBottom: 24,
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: pillar.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {pillar.num} — {pillar.label}
              </span>
            </div>

            <h3 style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: "clamp(24px, 2.5vw, 36px)",
              color: "var(--text)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: 16,
            }}>
              {pillar.tagline}
            </h3>

            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: 16,
              color: "var(--text-muted)",
              lineHeight: 1.75,
              marginBottom: 28,
            }}>
              {pillar.description}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pillar.outcomes.map((o, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    background: pillar.bg,
                    border: `1px solid ${pillar.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={pillar.color} strokeWidth="2" strokeLinecap="round">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5"/>
                    </svg>
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(240,238,248,0.8)", lineHeight: 1.5 }}>{o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              background: "#08061a",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: `0 24px 64px rgba(0,0,0,0.4), 0 0 48px ${pillar.bg}`,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.025)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E24B4A", display: "block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF9F27", display: "block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75", display: "block" }} />
                <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.35)" }}>
                  wright {pillar.label.toLowerCase()}
                </span>
              </div>
              <div style={{ padding: "24px 28px 36px", minHeight: 340 }}>
                {pillar.visual}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
