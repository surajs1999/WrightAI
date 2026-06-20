"use client";

import { motion } from "framer-motion";

const BEFORE_LINES = [
  { text: 'User: "How does the auth middleware work?"', color: "#22D3EE" },
  { text: "", color: "" },
  { text: 'Claude: "I don\'t have context about your codebase.', color: "rgba(175,169,236,0.5)" },
  { text: ' Could you paste the relevant code? Also,', color: "rgba(175,169,236,0.5)" },
  { text: ' what auth library are you using? And the', color: "rgba(175,169,236,0.5)" },
  { text: ' middleware config if you have it..."', color: "rgba(175,169,236,0.5)" },
  { text: "", color: "" },
  { text: "— 10 minutes of copy-pasting later —", color: "rgba(226,75,74,0.5)" },
  { text: "", color: "" },
  { text: 'Claude: "Based on the code you shared..."', color: "rgba(175,169,236,0.4)" },
  { text: "(outdated context, answer may be wrong)", color: "rgba(226,75,74,0.4)" },
];

const AFTER_LINES = [
  { text: 'User: "How does the auth middleware work?"', color: "#22D3EE" },
  { text: "", color: "" },
  { text: "[MCP] wright: search_docs called", color: "rgba(175,169,236,0.4)" },
  { text: "[MCP] wright: get_function_doc — validateToken()", color: "rgba(175,169,236,0.4)" },
  { text: "[MCP] docs verified current as of 2 minutes ago", color: "rgba(29,158,117,0.6)" },
  { text: "", color: "" },
  { text: 'Claude: "Auth uses JWT via validateToken() in', color: "#1D9E75" },
  { text: ' auth/middleware.ts:14. It validates the Bearer', color: "#1D9E75" },
  { text: ' token, checks expiry, and attaches the decoded', color: "#1D9E75" },
  { text: ' user to req.user. Refresh tokens are handled', color: "#1D9E75" },
  { text: ' separately in auth/refresh.ts:67."', color: "#1D9E75" },
];

const AI_TOOLS = [
  {
    name: "Claude Code",
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="rgba(210,160,120,0.15)" />
        <path d="M12 4L20 8v8L12 20 4 16V8z" stroke="#D4956C" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    color: "#D4956C",
  },
  {
    name: "Cursor",
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="rgba(127,119,221,0.15)" />
        <path d="M6 6h12v12H6z" stroke="#7F77DD" strokeWidth="1.5" fill="none"/>
        <path d="M9 9l6 6M15 9l-6 6" stroke="#7F77DD" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    color: "#7F77DD",
  },
  {
    name: "GitHub Copilot",
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="rgba(0,212,255,0.1)" />
        <circle cx="12" cy="12" r="5" stroke="#00D4FF" strokeWidth="1.5" fill="none"/>
        <path d="M12 7v2M12 15v2M7 12h2M15 12h2" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    color: "#00D4FF",
  },
];

export default function AIContextSection() {
  return (
    <section id="section-ai" className="v2-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.55) 30%, rgba(0,212,255,0.55) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(0,212,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Neural net nodes + edges */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Ccircle cx='20' cy='20' r='2.5' fill='rgba(0,212,255,0.12)'/%3E%3Ccircle cx='120' cy='30' r='2.5' fill='rgba(0,212,255,0.12)'/%3E%3Ccircle cx='70' cy='90' r='2.5' fill='rgba(0,212,255,0.12)'/%3E%3Ccircle cx='20' cy='120' r='2' fill='rgba(0,212,255,0.08)'/%3E%3Ccircle cx='120' cy='110' r='2' fill='rgba(0,212,255,0.08)'/%3E%3Cline x1='20' y1='20' x2='120' y2='30' stroke='rgba(0,212,255,0.05)' stroke-width='1'/%3E%3Cline x1='120' y1='30' x2='70' y2='90' stroke='rgba(0,212,255,0.05)' stroke-width='1'/%3E%3Cline x1='20' y1='20' x2='70' y2='90' stroke='rgba(0,212,255,0.05)' stroke-width='1'/%3E%3Cline x1='70' y1='90' x2='20' y2='120' stroke='rgba(0,212,255,0.04)' stroke-width='1'/%3E%3Cline x1='70' y1='90' x2='120' y2='110' stroke='rgba(0,212,255,0.04)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "140px 140px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", top: "20%", right: "-8%", width: 550, height: 550, background: "rgba(0,212,255,0.07)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "15%", left: "-5%", width: 450, height: 450, background: "rgba(83,74,183,0.1)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 56 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            AI context layer
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 18 }}>
            Give AI tools reliable
            <br />
            <span style={{ color: "var(--cyan)" }}>knowledge of your codebase.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 620 }}>
            Stop pasting code into every conversation. WrightAI&apos;s MCP server gives
            Claude Code, Cursor and Copilot live, verified access to your documentation —
            so every AI response is grounded in current, accurate knowledge.
          </p>
        </motion.div>

        {/* Before/after split */}
        <div className="v2-ai-split">

          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1 }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              padding: "6px 12px", borderRadius: 8, width: "fit-content",
              background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.2)",
            }}>
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#E24B4A", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Without WrightAI MCP
              </span>
            </div>

            <div style={{
              background: "#08061a",
              border: "1px solid rgba(226,75,74,0.15)",
              borderRadius: 14,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 14px",
                background: "rgba(226,75,74,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", display: "block" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.35)" }}>
                  AI assistant — no codebase context
                </span>
              </div>
              <div style={{ padding: "20px 20px 24px" }}>
                {BEFORE_LINES.map((l, i) => (
                  <div key={i} style={{
                    fontFamily: "var(--font-mono)", fontSize: 12,
                    color: l.color || "transparent",
                    minHeight: l.text === "" ? "0.8em" : "1.7em",
                    lineHeight: 1.7,
                  }}>
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Arrow divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "rgba(175,169,236,0.3)", paddingTop: 40 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ flex: 1 }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              padding: "6px 12px", borderRadius: 8, width: "fit-content",
              background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.2)",
            }}>
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1D9E75", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                With WrightAI MCP
              </span>
            </div>

            <div style={{
              background: "#08061a",
              border: "1px solid rgba(29,158,117,0.2)",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 0 40px rgba(29,158,117,0.08)",
            }}>
              <div style={{
                padding: "10px 14px",
                background: "rgba(29,158,117,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", display: "block" }} className="live-dot" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.35)" }}>
                  AI assistant — WrightAI MCP connected
                </span>
              </div>
              <div style={{ padding: "20px 20px 24px" }}>
                {AFTER_LINES.map((l, i) => (
                  <div key={i} style={{
                    fontFamily: "var(--font-mono)", fontSize: 12,
                    color: l.color || "transparent",
                    minHeight: l.text === "" ? "0.8em" : "1.7em",
                    lineHeight: 1.7,
                  }}>
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>

        {/* Compatible tools */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}
        >
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>
            Works with
          </span>
          {AI_TOOLS.map(tool => (
            <div
              key={tool.name}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 99,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              {tool.logo}
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", fontWeight: 500 }}>
                {tool.name}
              </span>
            </div>
          ))}
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", opacity: 0.7 }}>
            + any MCP-compatible tool
          </span>
        </motion.div>

      </div>
    </section>
  );
}
