"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

type LieCard = {
  title: string;
  icon: ReactNode;
  tag: string;
  diff: { type: "removed" | "added"; label: string; value: string }[];
  impact: string;
};

const LIES: LieCard[] = [
  {
    title: "Endpoint renamed. README wasn't.",
    tag: "API Drift",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    diff: [
      { type: "removed", label: "README says", value: "POST /api/auth/login" },
      { type: "added",   label: "Code does",   value: "GET  /api/v2/auth/session" },
    ],
    impact: "Developers hit 404s. AI tools build broken integrations against a route that no longer exists.",
  },
  {
    title: "Response shape changed. API docs weren't.",
    tag: "Schema Drift",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    diff: [
      { type: "removed", label: "API docs say returns", value: '{ user, token }' },
      { type: "added",   label: "Endpoint returns",     value: '{ data: { user }, jwt }' },
    ],
    impact: "Clients crash on every auth call. AI assistants generate code against the wrong schema.",
  },
  {
    title: "Class deleted. Onboarding guide wasn't.",
    tag: "Onboarding Drift",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
    diff: [
      { type: "removed", label: "Onboarding guide says", value: "See PaymentService class" },
      { type: "added",   label: "Reality",               value: "Deleted 6 months ago" },
    ],
    impact: "New engineers spend 2–3 days chasing a class that no longer exists. Tribal knowledge fills the gap.",
  },
  {
    title: "Architecture rewrote itself. Diagram didn't.",
    tag: "Architecture Drift",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    diff: [
      { type: "removed", label: "Architecture diagram shows", value: "3 independent microservices" },
      { type: "added",   label: "Codebase is",               value: "A monolith since Q1" },
    ],
    impact: "Every technical discussion starts from a false mental model. Planning decisions built on wrong foundations.",
  },
];

export default function ProblemV2() {
  return (
    <section id="section-problem" className="v2-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(226,75,74,0.55) 30%, rgba(226,75,74,0.55) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(226,75,74,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Diagonal strikethrough lines — broken-docs feel */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(-45deg, rgba(226,75,74,0.045) 0px, rgba(226,75,74,0.045) 1px, transparent 1px, transparent 18px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 600, height: 600, background: "rgba(226,75,74,0.08)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "0%", left: "-5%", width: 500, height: 500, background: "rgba(83,74,183,0.12)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header row: title left, callout right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 56, display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}
        >
          {/* Left: heading */}
          <div style={{ flex: "1 1 360px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(226,75,74,0.8)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              The documentation trust problem
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 3.2vw, 52px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 18 }}>
              Your documentation lies.
              <br />
              <span style={{ color: "rgba(226,75,74,0.75)" }}>Every day. To everyone.</span>
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 520 }}>
              Developers don&apos;t struggle to <em>create</em> documentation.
              They struggle to <strong style={{ color: "var(--text)" }}>trust</strong>{" "}it.
              Code evolves continuously. Documentation doesn&apos;t. The gap becomes a liability.
            </p>
          </div>

          {/* Right: callout block */}
          <div style={{
            flex: "0 1 380px",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            padding: "22px 24px",
            background: "rgba(226,75,74,0.05)",
            border: "1px solid rgba(226,75,74,0.15)",
            borderRadius: 16,
            alignSelf: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(226,75,74,0.7)" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text)", lineHeight: 1.65, fontWeight: 500, marginBottom: 10 }}>
                Documentation doesn&apos;t become stale overnight.
                It happens one commit at a time — until nobody trusts it anymore.
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                AI coding tools make this 10× worse — they accelerate code creation without improving documentation accuracy.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Lie cards */}
        <div className="v2-problem-grid">
          {LIES.map((lie, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.09 }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.25s, box-shadow 0.25s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(226,75,74,0.28)";
                el.style.boxShadow = "0 24px 56px rgba(0,0,0,0.35)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.boxShadow = "none";
              }}
            >
              {/* Card header */}
              <div style={{ padding: "24px 24px 20px" }}>
                {/* Tag */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999, marginBottom: 16,
                  background: "rgba(226,75,74,0.08)",
                  border: "1px solid rgba(226,75,74,0.2)",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(226,75,74,0.8)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    {lie.tag}
                  </span>
                </div>

                {/* Icon + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "rgba(226,75,74,0.1)",
                    border: "1px solid rgba(226,75,74,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(226,75,74,0.85)",
                  }}>
                    {lie.icon}
                  </div>
                  <h3 style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: 17,
                    color: "#F0EEF8",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.35,
                    paddingTop: 2,
                  }}>
                    {lie.title}
                  </h3>
                </div>
              </div>

              {/* Diff block */}
              <div style={{
                margin: "0 16px",
                background: "#07051a",
                border: "1px solid rgba(175,169,236,0.08)",
                borderRadius: 12,
                overflow: "hidden",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
              }}>
                {/* Diff chrome */}
                <div style={{
                  padding: "8px 14px",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.3)", marginLeft: 6 }}>
                    diff --documentation
                  </span>
                </div>

                {/* Diff rows */}
                {lie.diff.map((row, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 0,
                      padding: "10px 14px",
                      background: row.type === "removed"
                        ? "rgba(226,75,74,0.07)"
                        : "rgba(29,158,117,0.07)",
                      borderBottom: j < lie.diff.length - 1 ? "1px solid rgba(175,169,236,0.05)" : "none",
                    }}
                  >
                    {/* Prefix */}
                    <span style={{
                      color: row.type === "removed" ? "rgba(226,75,74,0.6)" : "rgba(29,158,117,0.6)",
                      fontWeight: 700,
                      fontSize: 14,
                      marginRight: 10,
                      userSelect: "none",
                      flexShrink: 0,
                      lineHeight: 1,
                    }}>
                      {row.type === "removed" ? "−" : "+"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 10,
                        color: row.type === "removed" ? "rgba(226,75,74,0.45)" : "rgba(29,158,117,0.45)",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}>
                        {row.label}
                      </div>
                      <div style={{
                        color: row.type === "removed" ? "rgba(226,75,74,0.9)" : "rgba(29,158,117,0.95)",
                        fontWeight: 500,
                        wordBreak: "break-all",
                        textDecoration: row.type === "removed" ? "line-through" : "none",
                        textDecorationColor: "rgba(226,75,74,0.4)",
                      }}>
                        {row.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Impact */}
              <div style={{ padding: "16px 24px 24px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(239,159,39,0.7)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#F0EEF8", lineHeight: 1.65 }}>
                  {lie.impact}
                </p>
              </div>

            </motion.div>
          ))}
        </div>


      </div>
    </section>
  );
}
