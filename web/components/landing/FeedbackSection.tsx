"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

const TESTIMONIALS = [
  {
    quote: "We were onboarding 3 engineers onto a 2-year-old codebase with zero docs. Wright documented our entire API layer in one run. Saved weeks of hand-holding and tribal knowledge transfer.",
    name: "Rohan Mehta",
    handle: "@rohanmehta",
    role: "Founder & CEO",
    company: "Setu",
    accent: "var(--cyan)",
    accentBg: "rgba(34,211,238,0.07)",
    initials: "RM",
  },
  {
    quote: "Drift detection in CI is the feature I didn't know I needed. It caught a silent API contract break before the PR merged — the exact kind of thing that causes 2am production incidents.",
    name: "Arjun Sharma",
    handle: "@arjun_sharma",
    role: "CTO",
    company: "Decentro",
    accent: "var(--purple)",
    accentBg: "rgba(83,74,183,0.08)",
    initials: "AS",
  },
  {
    quote: "The MCP server is the real unlock. I asked Claude Code 'how does our tokenisation flow work?' and got cited answers straight from our repo. Engineers are shipping noticeably faster.",
    name: "Priya Nair",
    handle: "@priyanair_eng",
    role: "VP Engineering",
    company: "Juspay",
    accent: "#F59E0B",
    accentBg: "rgba(245,158,11,0.07)",
    initials: "PN",
  },
  {
    quote: "Went from 11% to 79% coverage in a single sprint. The CI gate enforces it permanently. Our architecture review meetings are half as long — everyone just reads the docs now.",
    name: "Vikram Rao",
    handle: "@vikram_rao",
    role: "Engineering Lead",
    company: "Signzy",
    accent: "var(--purple)",
    accentBg: "rgba(83,74,183,0.08)",
    initials: "VR",
  },
  {
    quote: "Smoothest DX I've seen in a dev tool this year. Click Generate Docs, review the diff, press Apply. That's the entire workflow. No config, no terminal, no friction.",
    name: "Ananya Krishnamurthy",
    handle: "@ananya_k",
    role: "Senior Software Engineer",
    company: "Tartan",
    accent: "#10B981",
    accentBg: "rgba(16,185,129,0.07)",
    initials: "AK",
  },
  {
    quote: "llms.txt generation means every AI tool in our pipeline has structured, accurate context about our codebase — without anyone maintaining it manually. Always fresh. Zero overhead.",
    name: "Karan Gupta",
    handle: "@karangupta",
    role: "CTO",
    company: "Hyperface",
    accent: "var(--cyan)",
    accentBg: "rgba(34,211,238,0.07)",
    initials: "KG",
  },
];

/**
 * Renders a row of five amber-colored star icons for displaying a 5-star rating.
 *
 * A React functional component that creates a flexbox container with five identical SVG star icons, styled with a gap of 3px between each star and a bottom margin of 14px. The stars are filled with the color #F59E0B (amber).
 * @returns {JSX.Element} A div element containing five SVG star icons arranged horizontally.
 * @example
 * <Stars />
 */
const Stars = () => (
  <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
    {[...Array(5)].map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ))}
  </div>
);

/**
 * Renders an animated testimonial card component with hover effects, displaying a customer quote, star rating, and author information.
 *
 * A React functional component that creates a motion-animated card displaying testimonial content. The card features a staggered entrance animation based on its index, hover lift effect, themed accent colors, and includes a star rating, quote text, and author details with avatar initials. Uses Framer Motion for animations and inline styles for visual presentation.
 *
 * @param {typeof TESTIMONIALS[number]} t - Testimonial object containing quote, name, role, company, initials, accent color, and accentBg properties for rendering the card content and styling.
 * @param {number} index - Zero-based position index used to calculate the staggered animation delay (delay = index * 0.08 seconds).
 * @returns {JSX.Element} A motion.div element containing the fully styled and animated testimonial card with quote, stars, and author information.
 * @example
 * <TestimonialCard t={TESTIMONIALS[0]} index={0} />
 */
function TestimonialCard({ t, index }: { t: typeof TESTIMONIALS[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      style={{
        background: t.accentBg,
        border: `1px solid rgba(255,255,255,0.06)`,
        borderTop: `2px solid ${t.accent}`,
        borderRadius: 14,
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
      }}
      whileHover={{
        y: -4,
        boxShadow: `0 16px 40px rgba(0,0,0,0.35)`,
      }}
    >
      <Stars />
      <p style={{
        fontFamily: "var(--font-body)",
        fontSize: 14.5,
        color: "var(--text)",
        lineHeight: 1.65,
        marginBottom: 18,
        flex: 1,
      }}>
        &ldquo;{t.quote}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${t.accent}33, ${t.accent}66)`,
          border: `1px solid ${t.accent}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: 12,
          color: t.accent,
          flexShrink: 0,
        }}>
          {t.initials}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "var(--text)", lineHeight: 1.2 }}>
            {t.name}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {t.role} · {t.company}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Renders a feedback section component that displays testimonials and provides a form for users to submit feedback messages with optional email.
 *
 * This React component manages state for a feedback form including input text, email, loading status, and submission confirmation. It submits feedback to a Supabase database when configured, otherwise logs to console. The component features animated testimonial cards, decorative background elements (gradient orbs, dot grid, sparkles), and a styled feedback input area with keyboard shortcut support (Cmd/Ctrl + Enter to submit).
 * @returns {JSX.Element} A complete feedback section including background decorations, testimonial grid, and an interactive feedback form with email input and submit button.
 * @example
 * <FeedbackSection />
 */
export default function FeedbackSection() {
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const text = input.trim();
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supaUrl && supaKey) {
      try { await createClient(supaUrl, supaKey).from("feedback").insert({ message: text, email: email.trim() || null }); }
      catch { console.log("Feedback:", { text, email }); }
    }
    setInput(""); setEmail("");
    setSent(true); setLoading(false);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section className="feedback-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Background layer */}
      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(175,169,236,0.1) 1px, transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none", zIndex: 0 }} />
      {/* Blurred orbs */}
      <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "rgba(83,74,183,0.45)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 400, background: "rgba(34,211,238,0.22)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
      {/* Sparkle dots */}
      {[[12, 18], [88, 12], [6, 75], [92, 68], [48, 8], [55, 92], [22, 45], [78, 40]].map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 3, height: 3, borderRadius: "50%", background: i % 2 === 0 ? "rgba(175,169,236,0.4)" : "rgba(34,211,238,0.35)", boxShadow: i % 2 === 0 ? "0 0 6px rgba(175,169,236,0.5)" : "0 0 6px rgba(34,211,238,0.4)", pointerEvents: "none", zIndex: 0 }} />
      ))}
      {/* Corner brackets */}
      <div style={{ position: "absolute", top: 48, left: 48, width: 36, height: 36, borderTop: "1px solid rgba(175,169,236,0.2)", borderLeft: "1px solid rgba(175,169,236,0.2)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: 48, right: 48, width: 36, height: 36, borderBottom: "1px solid rgba(175,169,236,0.2)", borderRight: "1px solid rgba(175,169,236,0.2)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: 60 }}
        >
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 18,
            padding: "5px 14px",
            background: "rgba(83,74,183,0.1)",
            border: "1px solid rgba(127,119,221,0.22)",
            borderRadius: 999,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#AFA9EC", letterSpacing: "0.07em" }}>FROM THE COMMUNITY</span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "clamp(30px, 4vw, 44px)",
            color: "var(--text)",
            letterSpacing: "-0.03em",
            marginBottom: 14,
          }}>
            Loved by developers
          </h2>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "var(--text-muted)",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            Teams ship faster when their codebase can speak for itself.
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="feedback-cards" style={{ marginBottom: 72 }}>
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={i} t={t} index={i} />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, rgba(175,169,236,0.15) 30%, rgba(175,169,236,0.15) 70%, transparent)", marginBottom: 72 }} />

        {/* Feedback form */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 36 }}
          >
            <h3 style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "clamp(22px, 3vw, 30px)",
              color: "var(--text)",
              letterSpacing: "-0.03em",
              marginBottom: 10,
            }}>
              What should Wright write next?
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Every message is read. Your feedback shapes what gets built next.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            {/* Title bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", background: "#09071a", borderBottom: "1px solid var(--border)" }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
              <span style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.35)" }}>feedback — wright</span>
            </div>

            {/* Input area */}
            <div style={{ background: "var(--surface)", padding: "20px 20px 0" }}>
              <AnimatePresence>
                {sent && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: "12px 16px",
                      marginBottom: 12,
                      borderRadius: 10,
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#10B981" }}>Thanks — we read every message.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder="What would make Wright work better for you? A feature, workflow, integration..."
                rows={3}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 14.5,
                  color: "var(--text)",
                  resize: "none",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Footer bar */}
            <div style={{
              background: "#09071a",
              borderTop: "1px solid rgba(175,169,236,0.08)",
              padding: "12px 16px",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email for reply (optional)"
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--text)",
                  outline: "none",
                }}
              />
              <button
                onClick={submit}
                disabled={loading || !input.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 20px",
                  background: input.trim() ? "var(--purple)" : "rgba(83,74,183,0.2)",
                  color: input.trim() ? "#fff" : "rgba(175,169,236,0.4)",
                  border: "none",
                  borderRadius: 8,
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: input.trim() ? "pointer" : "default",
                  transition: "background 0.2s, color 0.2s",
                  flexShrink: 0,
                  letterSpacing: "0.01em",
                }}
              >
                {loading ? "Sending..." : "Send feedback"}
                {!loading && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                )}
              </button>
            </div>
          </motion.div>

          <p style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.4)" }}>
            ⌘ + Enter to send · No spam, ever
          </p>
        </div>

      </div>
    </section>
  );
}
