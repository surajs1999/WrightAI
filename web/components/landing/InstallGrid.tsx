"use client";

import { useState } from "react";
import { motion } from "framer-motion";

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{
        background: ok ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${ok ? "rgba(29,158,117,0.3)" : "rgba(175,169,236,0.12)"}`,
        borderRadius: 6,
        color: ok ? "#1D9E75" : "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        padding: "4px 11px",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {ok ? (
        <><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>copied</>
      ) : (
        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>copy</>
      )}
    </button>
  );
}

function CodeBlock({ code, accent, prompt }: { code: string; accent?: string; prompt?: string }) {
  return (
    <div style={{ position: "relative", marginTop: 16 }}>
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}>
        <CopyBtn text={code} />
      </div>
      <div style={{
        background: "#07051a",
        border: "1px solid rgba(175,169,236,0.09)",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {/* Mini title bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 12px",
          borderBottom: "1px solid rgba(175,169,236,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
        </div>
        <div style={{ padding: "14px 16px 16px" }}>
          {prompt && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1D9E75" }}>~/project</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.3)" }}>❯</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: accent }}>{prompt}</span>
            </div>
          )}
          {code.split("\n").map((line, i) => (
            <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-code)", lineHeight: 1.75, whiteSpace: "pre" }}>
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CARDS = [
  {
    accent: "#007ACC",
    accentBg: "rgba(0,122,204,0.08)",
    accentBorder: "rgba(0,122,204,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="16" fill="#007ACC"/>
        <path d="M18 68.5V31.5L50 50L82 31.5V68.5L50 50L18 68.5Z" fill="white"/>
      </svg>
    ),
    label: "VS Code Extension",
    sublabel: "One-click install",
    desc: "Install from the Marketplace, paste your Wright key, and click Generate Docs above any function. No config files, no terminal.",
    points: [
      "Inline lens above every undocumented function",
      "Diff preview before anything is written",
      "Drift warnings appear in the gutter as you type",
    ],
    badge: "Free · VS Code Marketplace",
    cta: { text: "Install from Marketplace", href: "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai" },
    code: null,
    prompt: null,
  },
  {
    accent: "#AFA9EC",
    accentBg: "rgba(127,119,221,0.08)",
    accentBorder: "rgba(127,119,221,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round">
        <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
    label: "Command Line",
    sublabel: "pip install wright",
    desc: "Full-featured CLI. Generate docs, measure coverage, detect drift, and chat with your codebase — all from your terminal.",
    points: [
      "Run once to doc an entire repo in seconds",
      "Coverage report by folder, file, and function",
      "Interactive chat with sourced file citations",
    ],
    badge: null,
    cta: null,
    code: "wright init .\nwright generate src/\nwright coverage --report\nwright chat",
    prompt: "pip install wright",
  },
  {
    accent: "#EF9F27",
    accentBg: "rgba(239,159,39,0.07)",
    accentBorder: "rgba(239,159,39,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#EF9F27" }}>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
    label: "GitHub Action",
    sublabel: "Enforce in CI",
    desc: "Block PRs that drop below your coverage threshold or merge with stale docstrings. Add one step to your workflow.",
    points: [
      "Fails CI if coverage drops below your threshold",
      "Blocks merges with detected doc drift",
      "Posts a coverage summary comment on each PR",
    ],
    badge: null,
    cta: null,
    code: `uses: surajs1999/WrightAI@v1\nwith:\n  mode: coverage\n  threshold: "0.8"`,
    prompt: null,
  },
  {
    accent: "#00D4FF",
    accentBg: "rgba(0,212,255,0.06)",
    accentBorder: "rgba(0,212,255,0.22)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    ),
    label: "MCP Server",
    sublabel: "Live AI context",
    desc: "Exposes search_docs, get_function_doc, and list_undocumented to any MCP-compatible AI tool. Docs stay in sync as you code.",
    points: null,
    compat: ["Claude Code", "Cursor", "Copilot"],
    badge: null,
    cta: null,
    code: `{\n  "mcpServers": {\n    "wright": {\n      "command": "wright-mcp"\n    }\n  }\n}`,
    prompt: null,
  },
];

export default function InstallGrid() {
  return (
    <section id="install" style={{ padding: "96px 80px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Background layer */}
      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(175,169,236,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />
      {/* Blurred orbs */}
      <div style={{ position: "absolute", top: "-10%", right: "5%", width: 600, height: 600, background: "rgba(245,158,11,0.28)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 600, height: 600, background: "rgba(83,74,183,0.45)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />
      {/* Diagonal accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, transparent 40%, rgba(245,158,11,0.03) 60%, transparent 75%)", pointerEvents: "none", zIndex: 0 }} />
      {/* Corner brackets top-left */}
      <div style={{ position: "absolute", top: 40, left: 60, width: 40, height: 40, borderTop: "1px solid rgba(175,169,236,0.2)", borderLeft: "1px solid rgba(175,169,236,0.2)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: 40, right: 60, width: 40, height: 40, borderBottom: "1px solid rgba(175,169,236,0.2)", borderRight: "1px solid rgba(175,169,236,0.2)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1600, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: 60 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            Get started
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 4vw, 52px)", color: "var(--text)", letterSpacing: "-0.035em", lineHeight: 1.04, marginBottom: 16 }}>
            Works wherever you work.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>
            Four integration points. Pick one or use them all.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
          {CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 0,
                position: "relative",
                overflow: "hidden",
                transition: "border-color 0.25s, box-shadow 0.25s, transform 0.25s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = card.accentBorder;
                el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.3), 0 0 40px ${card.accentBg}`;
                el.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.boxShadow = "none";
                el.style.transform = "translateY(0)";
              }}
            >
              {/* Accent top bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent 0%, ${card.accent} 40%, ${card.accent} 60%, transparent 100%)`,
                opacity: 0.7,
              }} />

              {/* Icon + label */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: card.accentBg,
                  border: `1px solid ${card.accentBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15.5, color: "var(--text)", lineHeight: 1.2 }}>
                    {card.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: card.accent, letterSpacing: "0.04em", marginTop: 2 }}>
                    {card.sublabel}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(175,169,236,0.07)", margin: "16px 0" }} />

              {/* Description */}
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
                {card.desc}
              </p>

              {/* Bullet points */}
              {card.points && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                  {card.points.map((pt, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                        background: `${card.accentBg}`,
                        border: `1px solid ${card.accentBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke={card.accent} strokeWidth="2.2" strokeLinecap="round">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", lineHeight: 1.55, opacity: 0.85 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Compat pills */}
              {(card as any).compat && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {(card as any).compat.map((c: string) => (
                    <span key={c} style={{
                      fontFamily: "var(--font-mono)", fontSize: 11, color: card.accent,
                      padding: "4px 10px",
                      background: card.accentBg,
                      border: `1px solid ${card.accentBorder}`,
                      borderRadius: 999,
                    }}>{c}</span>
                  ))}
                </div>
              )}

              {/* Code block — pushes to bottom */}
              {card.code && (
                <div style={{ marginTop: "auto" }}>
                  <CodeBlock code={card.code} accent={card.accent} prompt={card.prompt ?? undefined} />
                </div>
              )}

              {/* Badge */}
              {card.badge && (
                <div style={{ marginTop: 16 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, color: card.accent,
                    padding: "4px 12px",
                    background: card.accentBg,
                    border: `1px solid ${card.accentBorder}`,
                    borderRadius: 999,
                  }}>
                    {card.badge}
                  </span>
                </div>
              )}

              {/* CTA */}
              {card.cta && (
                <a
                  href={card.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 18,
                    padding: "10px 18px",
                    background: card.accentBg,
                    border: `1px solid ${card.accentBorder}`,
                    borderRadius: 8,
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: card.accent,
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
                    <defs>
                      <linearGradient id="vsc-cta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2AABEE"/>
                        <stop offset="100%" stopColor="#0070C5"/>
                      </linearGradient>
                    </defs>
                    <path fill="url(#vsc-cta)" d="M73 4L38 30L16 17L5 23L5 77L16 83L38 70L73 96L95 85L95 15Z M73 73L38 50L73 27Z"/>
                  </svg>
                  {card.cta.text}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              )}

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
