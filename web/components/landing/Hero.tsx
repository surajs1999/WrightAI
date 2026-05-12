"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Line = { text: string; color?: string; delay: number; type?: "cmd" | "progress" | "success" | "warn" | "chat" };

const LINES: Line[] = [
  // wright init
  { text: "$ wright init .", color: "#AFA9EC", delay: 0, type: "cmd" },
  { text: "", delay: 280 },
  { text: "  Detected: TypeScript · 847 functions · 12% documented", color: "#8884A8", delay: 480 },
  { text: "  Scanning...", color: "#8884A8", delay: 900 },
  { text: "", delay: 1150 },
  // wright generate
  { text: "$ wright generate src/", color: "#AFA9EC", delay: 1350, type: "cmd" },
  { text: "", delay: 1600 },
  { text: "  ████████████████ 100%   generated 214 docstrings", color: "#7F77DD", delay: 2100, type: "progress" },
  { text: "  Coverage: 12% → 73%", color: "#1D9E75", delay: 2700, type: "success" },
  { text: "", delay: 2950 },
  // wright drift
  { text: "$ wright drift . --since HEAD~1", color: "#AFA9EC", delay: 3150, type: "cmd" },
  { text: "", delay: 3400 },
  { text: "  3 functions drifted after last commit", color: "#8884A8", delay: 3650 },
  { text: "  processPayment()   payments/core.ts:88   ⚠ signature changed", color: "#EF9F27", delay: 4000, type: "warn" },
  { text: "", delay: 4300 },
  // wright chat
  { text: "$ wright chat .", color: "#AFA9EC", delay: 4500, type: "cmd" },
  { text: "", delay: 4750 },
  { text: "  > how does the retry logic work?", color: "#22D3EE", delay: 4950, type: "chat" },
  { text: "  processPayment() in payments/core.ts:88 retries up to 3×...", color: "#8884A8", delay: 5450 },
  { text: "", delay: 5750 },
  // wright-mcp
  { text: "$ wright-mcp", color: "#AFA9EC", delay: 5950, type: "cmd" },
  { text: "", delay: 6200 },
  { text: "  MCP server running · tools: search_docs, get_function_doc...", color: "#1D9E75", delay: 6500, type: "success" },
  { text: "  Queryable by Claude Code, Cursor, Copilot", color: "#8884A8", delay: 6900 },
];

/**
 * Renders an animated terminal component that progressively displays lines with a typewriter effect and includes a macOS-style chrome bar.
 *
 * A React functional component that simulates a terminal interface with sequential line animation. It uses local state to track visible lines and completion status, scheduling timeouts based on each line's delay property from the LINES constant. The component displays a styled terminal window with window controls (red, yellow, green dots) and animates lines appearing one by one, finishing with a blinking cursor.
 * @returns {JSX.Element} A JSX element representing a styled terminal window with animated text content and a chrome bar.
 * @example
 * <Terminal />
 */
function Terminal() {
  const [visible, setVisible] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setVisible([]);
    setDone(false);
    const timers = LINES.map((line, i) =>
      setTimeout(() => {
        setVisible(prev => [...prev, i]);
        if (i === LINES.length - 1) setTimeout(() => setDone(true), 500);
      }, line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      width: "100%",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--border)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(175,169,236,0.05), 0 0 60px rgba(83,74,183,0.12)",
      background: "#0A0818",
    }}>
      {/* Chrome bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#E24B4A", display: "block" }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF9F27", display: "block" }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#1D9E75", display: "block" }} />
        <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.4)" }}>
          wright — zsh — 80×24
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px 32px", minHeight: 460, lineHeight: 1.85, overflowY: "auto" }}>
        {LINES.map((line, i) =>
          visible.includes(i) ? (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: line.color ?? "var(--text)",
                fontWeight: line.type === "success" || line.type === "cmd" ? 500 : 400,
                minHeight: line.text === "" ? "0.9em" : "1.7em",
                animation: "float-up 0.18s ease-out",
                letterSpacing: line.type === "cmd" ? "0.01em" : undefined,
                borderLeft: line.type === "chat" ? "2px solid rgba(34,211,238,0.35)" : undefined,
                paddingLeft: line.type === "chat" ? 10 : undefined,
                marginLeft: line.type === "chat" ? 2 : undefined,
              }}
            >
              {line.text}
            </div>
          ) : null
        )}
        {done && (
          <span style={{
            display: "inline-block", width: 8, height: 15,
            background: "var(--text-code)", marginTop: 4,
            verticalAlign: "text-bottom",
          }} className="cursor-blink" />
        )}
      </div>
    </div>
  );
}

/**
 * Renders the hero section of the landing page with heading, description, call-to-action buttons, and statistics.
 *
 * A React functional component that displays the main hero banner featuring the Wright AI product value proposition, installation command with copy functionality, links to the dashboard and VS Code marketplace, and key statistics about language support and pricing. Includes a live MCP server badge, gradient heading, descriptive text, interactive buttons with hover effects, and a terminal component visualization.
 * @returns {JSX.Element} A section element containing the hero banner with text content, action buttons, and statistics row.
 * @example
 * <Hero />
 */
export default function Hero() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText("pip install wright");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="hero-section">
      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column" }}>
      <div className="hero-cols">

        {/* Left: text content */}
        <div className="hero-left">

          {/* MCP badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              marginBottom: 32,
              borderRadius: 999,
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.25)",
            }}
          >
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", display: "inline-block", boxShadow: "0 0 10px #1D9E75" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.01em" }}>
              Live MCP server — Claude Code · Cursor · Copilot
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: "clamp(44px, 5.5vw, 80px)",
              color: "var(--text)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              marginBottom: 24,
            }}
          >
            Your codebase,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              written.
            </span>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 18,
              fontWeight: 400,
              color: "var(--text-muted)",
              lineHeight: 1.75,
              marginBottom: 40,
              maxWidth: 520,
            }}
          >
            Wright AI auto-generates docstrings, detects drift, and exposes your
            codebase to AI tools via MCP — inline in your editor, enforced in CI.
          </p>

          {/* CTA row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 52 }}>
            <Link
              href="/dashboard"
              className="btn-cyan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 28px",
                color: "#050310",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                borderRadius: 10,
              }}
            >
              Start for free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>

            <button
              onClick={copy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 22px",
                background: "rgba(13,11,31,0.8)",
                border: "1px solid var(--border-hover)",
                color: "var(--text-code)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(175,169,236,0.4)"; el.style.background = "rgba(83,74,183,0.1)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-hover)"; el.style.background = "rgba(13,11,31,0.8)"; }}
            >
              {copied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg><span style={{ color: "#1D9E75" }}>Copied!</span></>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>pip install wright</>
              )}
            </button>

            <a
              href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 22px",
                background: "rgba(13,11,31,0.8)",
                border: "1px solid var(--border-hover)",
                color: "var(--text-code)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                textDecoration: "none",
                borderRadius: 10,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(175,169,236,0.4)"; el.style.background = "rgba(83,74,183,0.1)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-hover)"; el.style.background = "rgba(13,11,31,0.8)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="vsc-hero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2AABEE"/>
                    <stop offset="100%" stopColor="#0070C5"/>
                  </linearGradient>
                </defs>
                <path fill="url(#vsc-hero)" d="M73 4L38 30L16 17L5 23L5 77L16 83L38 70L73 96L95 85L95 15Z M73 73L38 50L73 27Z"/>
              </svg>
              Install from Marketplace
            </a>
          </div>

        </div>

        {/* Right: terminal */}
        <div className="hero-right">
          <Terminal />
        </div>

      </div>

      {/* Stat row */}
      <div className="hero-stats">
        {[
          { num: "6", label: "Languages Supported" },
          { num: "4", label: "Docstring styles" },
          { num: "0", label: "Config required" },
          { num: "Free", label: "No Credit card required" },
        ].map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div className="hero-stat-sep" style={{ width: 1, height: 32, background: "rgba(175,169,236,0.12)", margin: "0 40px" }} />}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 36, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
                {s.num}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      </div>
    </section>
  );
}
