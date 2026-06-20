"use client";

import { motion } from "framer-motion";

const STAT_CARDS = [
  {
    label: "Documentation Coverage",
    value: "94%",
    change: "+22% this month",
    changeDir: "up",
    color: "#1D9E75",
    bg: "rgba(29,158,117,0.07)",
    border: "rgba(29,158,117,0.18)",
    bar: 94,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    label: "Active Drifts",
    value: "3",
    change: "−12 since last week",
    changeDir: "down",
    color: "#EF9F27",
    bg: "rgba(239,159,39,0.07)",
    border: "rgba(239,159,39,0.18)",
    bar: 3,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    label: "Doc Freshness Score",
    value: "97",
    change: "above 90 target",
    changeDir: "up",
    color: "#7F77DD",
    bg: "rgba(127,119,221,0.07)",
    border: "rgba(127,119,221,0.18)",
    bar: 97,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    label: "Repos Monitored",
    value: "14",
    change: "3 added this sprint",
    changeDir: "up",
    color: "#00D4FF",
    bg: "rgba(0,212,255,0.06)",
    border: "rgba(0,212,255,0.18)",
    bar: 100,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77"/>
      </svg>
    ),
  },
];

const REPO_ROWS = [
  { name: "api-gateway", coverage: 98, drifts: 0, freshness: 99, status: "healthy" },
  { name: "auth-service", coverage: 91, drifts: 1, freshness: 94, status: "warning" },
  { name: "payments-core", coverage: 87, drifts: 2, freshness: 88, status: "warning" },
  { name: "user-service", coverage: 95, drifts: 0, freshness: 97, status: "healthy" },
  { name: "notifications", coverage: 72, drifts: 0, freshness: 81, status: "low" },
];

function StatusDot({ status }: { status: string }) {
  const color = status === "healthy" ? "#1D9E75" : status === "warning" ? "#EF9F27" : "#E24B4A";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "block" }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color, letterSpacing: "0.04em", textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

function CoverageBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "rgba(175,169,236,0.1)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", minWidth: 28 }}>{value}%</span>
    </div>
  );
}

const LEADERSHIP_OUTCOMES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
    label: "Reduce onboarding time",
    desc: "New engineers get sourced answers to codebase questions in seconds, not days.",
    color: "#7F77DD",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: "Enforce documentation standards",
    desc: "Set coverage thresholds. Block PRs that ship without documentation.",
    color: "#1D9E75",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: "Prevent documentation debt",
    desc: "Catch drift before it compounds into organizational knowledge loss.",
    color: "#00D4FF",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    label: "Track health across all repos",
    desc: "Single dashboard showing coverage, drift trends and quality across every repository.",
    color: "#EF9F27",
  },
];

export default function CommandCenter() {
  return (
    <section id="section-command" className="v2-section" style={{ background: "var(--surface)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(29,158,117,0.55) 30%, rgba(29,158,117,0.55) 70%, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 360, background: "radial-gradient(ellipse at center top, rgba(29,158,117,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Bar-chart columns — metrics / dashboard */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, rgba(29,158,117,0.04) 0px, rgba(29,158,117,0.04) 6px, transparent 6px, transparent 56px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", top: "15%", left: "-8%", width: 500, height: 500, background: "rgba(127,119,221,0.1)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 48, display: "flex", gap: 48, alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--purple-light)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              Engineering leadership
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(28px, 3.2vw, 48px)", color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
              Documentation
              <br />
              <span style={{ color: "var(--purple-light)" }}>Command Center.</span>
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", lineHeight: 1.75 }}>
              Not an admin dashboard — a strategic view of your organization&apos;s documentation health.
              Track coverage, drift trends and knowledge quality across every repository.
            </p>
          </div>

          {/* Leadership outcomes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520 }}>
            {LEADERSHIP_OUTCOMES.map((o, i) => (
              <div key={i} style={{
                padding: "14px 16px",
                background: "rgba(13,11,31,0.5)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <span style={{ color: o.color }}>{o.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{o.label}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{o.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dashboard mock */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div style={{
            background: "#08061a",
            border: "1px solid var(--border)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(175,169,236,0.04)",
          }}>

            {/* Dashboard chrome */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 20px",
              background: "rgba(255,255,255,0.025)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E24B4A", display: "block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#EF9F27", display: "block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#1D9E75", display: "block" }} />
              <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.35)" }}>
                Wright AI — Documentation Command Center
              </span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "block" }} className="live-dot" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(29,158,117,0.7)" }}>live</span>
              </div>
            </div>

            {/* Dashboard body */}
            <div style={{ padding: "24px", overflowX: "auto" }}>
              <div style={{ minWidth: 640 }}>

                {/* Stat cards */}
                <div className="preview-stat-grid" style={{ marginBottom: 24 }}>
                  {STAT_CARDS.map((card, i) => (
                    <div key={i} style={{
                      background: "rgba(13,11,31,0.6)",
                      border: `1px solid ${card.border}`,
                      borderRadius: 12,
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)" }}>{card.label}</span>
                        <span style={{ color: card.color, opacity: 0.7 }}>{card.icon}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, color: card.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                        {card.value}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={card.changeDir === "up" ? "#1D9E75" : "#EF9F27"} strokeWidth="2.5" strokeLinecap="round">
                          {card.changeDir === "up" ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
                        </svg>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: card.changeDir === "up" ? "rgba(29,158,117,0.7)" : "rgba(239,159,39,0.7)" }}>
                          {card.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Repo table */}
                <div style={{
                  background: "rgba(13,11,31,0.4)",
                  border: "1px solid rgba(175,169,236,0.08)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(175,169,236,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "rgba(175,169,236,0.6)" }}>Repository</span>
                    <div style={{ marginLeft: "auto", display: "grid", gridTemplateColumns: "80px 64px 80px 64px", gap: 8, textAlign: "right" }}>
                      {["Coverage", "Drifts", "Freshness", "Status"].map(h => (
                        <span key={h} style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(175,169,236,0.35)", fontWeight: 600 }}>{h}</span>
                      ))}
                    </div>
                  </div>

                  {REPO_ROWS.map((repo, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "11px 16px",
                      borderBottom: i < REPO_ROWS.length - 1 ? "1px solid rgba(175,169,236,0.05)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(175,169,236,0.4)" strokeWidth="2" strokeLinecap="round">
                          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77"/>
                        </svg>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-code)" }}>{repo.name}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "80px 64px 80px 64px", gap: 8, alignItems: "center" }}>
                        <CoverageBar value={repo.coverage} color={repo.coverage >= 90 ? "#1D9E75" : repo.coverage >= 75 ? "#EF9F27" : "#E24B4A"} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: repo.drifts === 0 ? "#1D9E75" : "#EF9F27", textAlign: "right" }}>
                          {repo.drifts === 0 ? "✓ 0" : `⚠ ${repo.drifts}`}
                        </span>
                        <CoverageBar value={repo.freshness} color={repo.freshness >= 90 ? "#7F77DD" : "#EF9F27"} />
                        <div style={{ textAlign: "right" }}><StatusDot status={repo.status} /></div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
