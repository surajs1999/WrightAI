"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { ga } from "@/lib/ga";

export default function FeedbackV2() {
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
    ga.feedbackSubmitted();
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="section-feedback" className="v2-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(127,119,221,0.55) 30%, rgba(127,119,221,0.55) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(127,119,221,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Zigzag / message pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(127,119,221,0.04) 0px, rgba(127,119,221,0.04) 1px, transparent 1px, transparent 14px), repeating-linear-gradient(-45deg, rgba(127,119,221,0.04) 0px, rgba(127,119,221,0.04) 1px, transparent 1px, transparent 14px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", top: "10%", right: "-8%", width: 500, height: 500, background: "rgba(83,74,183,0.1)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-5%", width: 450, height: 450, background: "rgba(0,212,255,0.07)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 48 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--purple-light)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            Feedback
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 18 }}>
            Help shape{" "}
            <span style={{
              background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 60%, #1D9E75 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              WrightAI.
            </span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 540 }}>
            We&apos;re building the future of{" "}
            <span style={{ color: "var(--purple-light)", fontWeight: 500 }}>Documentation Intelligence</span>{" "}
            with real developers and engineering teams.
            Every{" "}
            <span style={{ color: "var(--cyan)" }}>feature request</span>,{" "}
            <span style={{ color: "#EF9F27" }}>pain point</span>{" "}
            and{" "}
            <span style={{ color: "#1D9E75" }}>enterprise requirement</span>{" "}
            shapes the roadmap.
          </p>
        </motion.div>

        {/* Two-column: form left, enterprise right */}
        <div className="v2-feedback-body">

          {/* Left: feedback form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ minWidth: 0 }}
          >
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(20px, 2vw, 28px)", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 8 }}>
              What should Wright build{" "}
              <span style={{ color: "var(--cyan)" }}>next?</span>
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>
              Feature requests, feedback, pain points —{" "}
              <span style={{ color: "#1D9E75", fontWeight: 500 }}>every message is read</span>{" "}
              and shapes what gets built.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              style={{ border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
            >
              {/* Title bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", background: "#09071a", borderBottom: "1px solid var(--border)" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
                <span style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.35)" }}>
                  feedback — wright
                </span>
              </div>

              {/* Input area */}
              <div style={{ background: "var(--surface)", padding: "20px 20px 0" }}>
                <AnimatePresence>
                  {sent && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ padding: "12px 16px", marginBottom: 12, borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
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
                  placeholder="Feature request, pain point, missing integration, workflow improvement..."
                  rows={4}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text)", resize: "none", lineHeight: 1.6, boxSizing: "border-box" }}
                />
              </div>

              {/* Footer bar */}
              <div style={{ background: "#09071a", borderTop: "1px solid rgba(175,169,236,0.08)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email for reply (optional)"
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", outline: "none" }}
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>

            <p style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.4)" }}>
              ⌘ + Enter to send · No spam, ever
            </p>
          </motion.div>

          {/* Right: Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{
              minWidth: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "28px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(29,158,117,0.28)"; el.style.boxShadow = "0 20px 48px rgba(0,0,0,0.3)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "#F0EEF8", letterSpacing: "-0.01em", marginBottom: 6 }}>
                  Enterprise Requirements
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Need SSO, self-hosting, private deployments, compliance features or custom integrations? Tell us what your team needs.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["SSO & identity provider integration", "Self-hosted / private deployment", "Compliance & audit requirements", "Custom enterprise integrations"].map((item, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D9E75", flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(240,238,248,0.7)" }}>{item}</span>
                </div>
              ))}
            </div>

            <a
              href="mailto:hello@wrightai.live?subject=Wright%20AI%20Enterprise%20Requirements"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 9, width: "fit-content", background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.18)", color: "#1D9E75", fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, textDecoration: "none", transition: "opacity 0.2s", marginTop: "auto" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Talk to the Team
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
