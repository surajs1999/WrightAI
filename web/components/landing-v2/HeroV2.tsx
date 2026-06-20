"use client";

import { useEffect, useState } from "react"; // useState used by DriftTerminal
import Link from "next/link";

type DriftLine = {
  text: string;
  color?: string;
  delay: number;
  type?: "cmd" | "success" | "warn" | "info";
};

const DRIFT_LINES: DriftLine[] = [
  { text: "$ git commit -m 'refactor: update payment params'", color: "#AFA9EC", delay: 0, type: "cmd" },
  { text: "  [main a4f8c2d] 3 files changed, 47 insertions(+)", color: "#8884A8", delay: 600 },
  { text: "", delay: 950 },
  { text: "$ wright drift . --since HEAD~1", color: "#AFA9EC", delay: 1150, type: "cmd" },
  { text: "", delay: 1450 },
  { text: "  Scanning 3 changed files...", color: "#8884A8", delay: 1650 },
  { text: "", delay: 1950 },
  { text: "  ⚠  processPayment()  payments/core.ts:88", color: "#EF9F27", delay: 2150, type: "warn" },
  { text: "     param 'amount' renamed to 'amountCents' — undocumented", color: "#8884A8", delay: 2400 },
  { text: "  ⚠  validateCard()   payments/core.ts:142", color: "#EF9F27", delay: 2750, type: "warn" },
  { text: "     return type changed: bool → { valid: bool, reason: string }", color: "#8884A8", delay: 3000 },
  { text: "", delay: 3300 },
  { text: "  2 drifts detected · run: wright generate --fix", color: "#8884A8", delay: 3500 },
  { text: "", delay: 3800 },
  { text: "$ wright generate payments/core.ts --fix", color: "#AFA9EC", delay: 4000, type: "cmd" },
  { text: "", delay: 4300 },
  { text: "  ✓  processPayment — docs updated", color: "#1D9E75", delay: 4800, type: "success" },
  { text: "  ✓  validateCard   — docs updated", color: "#1D9E75", delay: 5100, type: "success" },
  { text: "", delay: 5400 },
  { text: "  Documentation accuracy: 100%  ·  0 drifts remaining", color: "#1D9E75", delay: 5700, type: "success" },
];

function DriftTerminal() {
  const [visible, setVisible] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setVisible([]);
    setDone(false);
    const timers = DRIFT_LINES.map((line, i) =>
      setTimeout(() => {
        setVisible(prev => [...prev, i]);
        if (i === DRIFT_LINES.length - 1) setTimeout(() => setDone(true), 500);
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
      boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(175,169,236,0.05), 0 0 80px rgba(83,74,183,0.15)",
      background: "#08061a",
    }}>
      {/* Chrome bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.025)",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#E24B4A", display: "block" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF9F27", display: "block" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#1D9E75", display: "block" }} />
          <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.4)" }}>
            wright — drift detection
          </span>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 999,
          background: "rgba(29,158,117,0.1)",
          border: "1px solid rgba(29,158,117,0.2)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "block" }} className="live-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#1D9E75" }}>live</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px 32px", minHeight: 400, lineHeight: 1.85, overflowY: "auto" }}>
        {DRIFT_LINES.map((line, i) =>
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

export default function HeroV2() {
  return (
    <section id="section-hero" className="hero-section">
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(175,169,236,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.025) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <div className="hero-cols">

          {/* Left: copy */}
          <div className="hero-left">

            {/* Category badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "7px 16px", marginBottom: 32, borderRadius: 999,
              background: "rgba(83,74,183,0.1)",
              border: "1px solid rgba(127,119,221,0.35)",
            }}>
              <span style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: "#1D9E75",
                boxShadow: "0 0 10px #1D9E75",
              }} className="live-dot" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#F0EEF8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Documentation Intelligence Platform
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: "clamp(42px, 5.2vw, 76px)",
              color: "var(--text)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              marginBottom: 28,
            }}>
              Documentation{" "}
              <br />
              <span style={{
                background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 55%, #1D9E75 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                that never lies.
              </span>
            </h1>

            {/* Sub */}
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: 18,
              fontWeight: 400,
              color: "var(--text-muted)",
              lineHeight: 1.75,
              marginBottom: 36,
              maxWidth: 500,
            }}>
              Generate documentation automatically.
              Detect drift continuously.
              Give developers and AI tools a source of truth they can trust.
            </p>

            {/* Pillar micro-tags */}
            <div style={{ display: "flex", gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
              {[
                { label: "Generate", color: "#7F77DD", bg: "rgba(127,119,221,0.1)", border: "rgba(127,119,221,0.25)" },
                { label: "Verify", color: "#00D4FF", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.2)" },
                { label: "Understand", color: "#1D9E75", bg: "rgba(29,158,117,0.08)", border: "rgba(29,158,117,0.2)" },
              ].map(p => (
                <div key={p.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 999,
                  background: p.bg, border: `1px solid ${p.border}`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: p.color, fontWeight: 500 }}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 52 }}>
              <Link
                href="/dashboard"
                className="btn-cyan"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 32px", color: "#050310",
                  fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15,
                  textDecoration: "none", borderRadius: 10, letterSpacing: "-0.01em",
                }}
              >
                Start Free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>

              <a
                href="#drift"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  padding: "13px 24px",
                  border: "1px solid var(--border-hover)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)", fontSize: 15,
                  textDecoration: "none", borderRadius: 10,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text)"; el.style.borderColor = "rgba(175,169,236,0.4)"; el.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text-muted)"; el.style.borderColor = "var(--border-hover)"; el.style.background = "transparent"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
                See How It Works
              </a>

              <a
                href="#install"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  padding: "13px 24px",
                  border: "1px solid var(--border-hover)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)", fontSize: 15,
                  textDecoration: "none", borderRadius: 10,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text)"; el.style.borderColor = "rgba(175,169,236,0.4)"; el.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text-muted)"; el.style.borderColor = "var(--border-hover)"; el.style.background = "transparent"; }}
              >
                Get Started
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>

          </div>

          {/* Right: terminal */}
          <div className="hero-right">
            <DriftTerminal />
          </div>

        </div>

        {/* Stat row */}
        <div className="hero-stats">
          {[
            { num: "100%", label: "Doc accuracy after drift fix" },
            { num: "6", label: "Languages supported" },
            { num: "<60s", label: "Setup in VS Code" },
            { num: "Free", label: "No credit card required" },
          ].map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div className="hero-stat-sep" style={{ width: 1, height: 32, background: "rgba(175,169,236,0.12)", margin: "0 40px" }} />}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 34, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
                  {s.num}
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)" }}>
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
