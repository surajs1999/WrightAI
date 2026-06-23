"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ga } from "@/lib/ga";

const BELIEFS = [
  "Generate documentation automatically from source code",
  "Detect drift continuously as code evolves",
  "Keep Claude Code, Cursor and AI tools grounded in truth",
  "Track health and coverage across every repository",
  "Block stale documentation from ever reaching production",
];

const TRUST_BADGES = [
  { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label: "Free to start" },
  { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: "No credit card" },
  { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, label: "Setup in 60 seconds" },
  { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7"/></svg>, label: "GitHub integration" },
  { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, label: "VS Code extension" },
];

const AVATARS = ["SC", "MW", "PN", "TL", "AR", "JP", "DK"];
const AVATAR_COLORS = ["#534AB7", "#22D3EE", "#F59E0B", "#534AB7", "#22D3EE", "#10B981", "#7F77DD"];

export default function FinalCTAV2() {
  return (
    <section id="section-finalcta" className="finalcta-section" style={{ background: "var(--surface)", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(127,119,221,0.5) 20%, rgba(0,212,255,0.55) 45%, rgba(29,158,117,0.5) 75%, transparent 100%)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(83,74,183,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(175,169,236,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.025) 1px, transparent 1px)",
        backgroundSize: "52px 52px",
      }} />

      {/* Ambient glows */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%, -50%)", width: 900, height: 600, background: "radial-gradient(ellipse, rgba(83,74,183,0.2) 0%, rgba(0,212,255,0.06) 50%, transparent 72%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 240, background: "radial-gradient(ellipse, rgba(127,119,221,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1 }}
      >

        {/* Category label */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", marginBottom: 32, borderRadius: 999,
          background: "rgba(83,74,183,0.1)",
          border: "1px solid rgba(127,119,221,0.3)",
        }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", boxShadow: "0 0 10px #1D9E75" }} className="live-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Documentation Intelligence Platform
          </span>
        </div>

        {/* Social proof */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ display: "flex" }}>
            {AVATARS.map((initials, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `linear-gradient(135deg, ${AVATAR_COLORS[i]}55, ${AVATAR_COLORS[i]}99)`,
                border: "2px solid var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 9.5, color: "#fff",
                marginLeft: i === 0 ? 0 : -8,
                zIndex: AVATARS.length - i,
                position: "relative",
              }}>{initials}</div>
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)" }}>
            Trusted by <span style={{ color: "var(--text)", fontWeight: 600 }}>500+</span> developers
          </span>
        </div>

        {/* Main headline */}
        <h2 style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: "clamp(34px, 5vw, 68px)",
          color: "var(--text)",
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          marginBottom: 24,
          maxWidth: 800,
          margin: "0 auto 24px",
        }}>
          WrightAI is not another
          <br />
          <span style={{
            background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 55%, #1D9E75 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            documentation generator.
          </span>
        </h2>

        {/* Belief list */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: "min(520px, 100%)",
          width: "100%",
          margin: "0 auto 44px",
          textAlign: "left",
          boxSizing: "border-box",
          padding: "0 4px",
        }}>
          {BELIEFS.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                background: "rgba(29,158,117,0.12)",
                border: "1px solid rgba(29,158,117,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5"/>
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "rgba(240,238,248,0.8)", lineHeight: 1.55 }}>{b}</span>
            </div>
          ))}
        </div>

        {/* Bottom pitch */}
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 17,
          color: "var(--text-muted)",
          maxWidth: 460, margin: "0 auto 48px",
          lineHeight: 1.7,
        }}>
          It&apos;s the system that keeps documentation{" "}
          <strong style={{ color: "var(--text)" }}>accurate, trustworthy and useful</strong>{" "}
          as your software evolves.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 52 }}>
          <Link
            href="/dashboard"
            className="btn-cyan"
            onClick={() => ga.ctaClick("final_cta")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "16px 40px",
              color: "#050310",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16,
              textDecoration: "none", borderRadius: 10,
              letterSpacing: "-0.01em",
            }}
          >
            Start Free — No Credit Card
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link
            href="/docs"
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "15px 28px",
              border: "1px solid var(--border-hover)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)", fontSize: 15,
              textDecoration: "none", borderRadius: 10,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text)"; el.style.borderColor = "rgba(175,169,236,0.4)"; el.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text-muted)"; el.style.borderColor = "var(--border-hover)"; el.style.background = "transparent"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Read the Docs
          </Link>
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {TRUST_BADGES.map((t, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(175,169,236,0.1)",
              borderRadius: 999,
              color: "var(--text-muted)",
            }}>
              <span style={{ color: "rgba(175,169,236,0.45)" }}>{t.icon}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5 }}>{t.label}</span>
            </div>
          ))}
        </div>

      </motion.div>
    </section>
  );
}
