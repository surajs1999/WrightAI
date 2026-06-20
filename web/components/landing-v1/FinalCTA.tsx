"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const TRUST = [
  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label: "Free to start" },
  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: "No credit card" },
  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, label: "Set up in 60 seconds" },
];

const AVATARS = ["SC", "MW", "PN", "TL", "AR", "JP"];
const AVATAR_COLORS = ["#534AB7", "#22D3EE", "#F59E0B", "#534AB7", "#22D3EE", "#10B981"];

/**
 * Renders a final call-to-action section with social proof, heading, description, action buttons, and trust badges with animated entrance effects and decorative background elements.
 *
 * A React functional component that creates a visually rich final CTA section for a landing page. Features include: a grid overlay background pattern, ambient gradient glows for visual depth, animated entrance using Framer Motion, social proof with avatar stack showing 500+ developers, primary and secondary call-to-action buttons linking to dashboard and documentation, and trust badges displaying key product features. Uses CSS custom properties for theming and responsive design with clamp() for font sizing.
 * @returns {JSX.Element} A section element containing the complete final CTA layout with background effects, animated content wrapper, social proof, heading, description text, action buttons, and trust badges.
 * @example
 * <FinalCTA />
 */
export default function FinalCTA() {
  return (
    <section className="finalcta-section" style={{ background: "var(--bg)", textAlign: "center", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(175,169,236,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.03) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Ambient glows */}
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(83,74,183,0.22) 0%, rgba(34,211,238,0.07) 45%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 200, background: "radial-gradient(ellipse, rgba(83,74,183,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1 }}
      >

        {/* Social proof */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 36 }}>
          <div style={{ display: "flex" }}>
            {AVATARS.map((initials, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `linear-gradient(135deg, ${AVATAR_COLORS[i]}55, ${AVATAR_COLORS[i]}99)`,
                border: "2px solid var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 10, color: "#fff",
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

        {/* Heading */}
        <h2 style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: "clamp(34px, 5.5vw, 64px)",
          color: "var(--text)",
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          marginBottom: 22,
          maxWidth: 720,
          margin: "0 auto 22px",
        }}>
          Documentation that writes itself,{" "}
          <span style={{ color: "var(--purple-light)" }}>stays current,</span>
          <br />and speaks to AI.
        </h2>

        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: 17,
          color: "var(--text-muted)",
          maxWidth: 420,
          margin: "0 auto 44px",
          lineHeight: 1.7,
        }}>
          Stop writing docs manually. Let Wright handle it — from generation to drift detection to MCP.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 52 }}>
          <Link
            href="/dashboard"
            className="btn-cyan"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "15px 38px",
              color: "#050310",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16,
              textDecoration: "none", borderRadius: 10,
              letterSpacing: "-0.01em",
            }}
          >
            Start for free
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Read Documentation
          </Link>
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {TRUST.map((t, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(175,169,236,0.1)",
              borderRadius: 999,
              color: "var(--text-muted)",
            }}>
              <span style={{ color: "rgba(175,169,236,0.5)" }}>{t.icon}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5 }}>{t.label}</span>
            </div>
          ))}
        </div>

      </motion.div>
    </section>
  );
}
