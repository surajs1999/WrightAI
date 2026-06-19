"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonBlock, SpinnerArc } from "@/components/dashboard/Spinner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuotaEntry {
  used: number;
  limit: number;
  unlimited: boolean;
  pct: number;
  warning: boolean;
  blocked: boolean;
}

interface UsageStats {
  // Activity counts
  docs_generated: number;
  drift_checks_run: number;
  coverage_scans: number;
  chat_messages: number;
  fix_prs: number;
  tokens_used: number;
  api_calls_today: number;
  api_calls_month: number;
  // Plan + quota (from quota module)
  plan?: string;
  plan_display?: string;
  features?: {
    semantic_drift: boolean;
    auto_pr: boolean;
    github_action_comments: boolean;
  };
  quotas?: {
    docs_generated: QuotaEntry;
    drift_checks: QuotaEntry;
    chat_messages: QuotaEntry;
    repos: QuotaEntry;
  };
  upgrade_url?: string;
}

const EMPTY: UsageStats = {
  docs_generated: 0,
  drift_checks_run: 0,
  coverage_scans: 0,
  chat_messages: 0,
  fix_prs: 0,
  tokens_used: 0,
  api_calls_today: 0,
  api_calls_month: 0,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "20px 24px",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 30, color: color ?? "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

function QuotaBar({ label, entry, color }: { label: string; entry: QuotaEntry; color: string }) {
  const barColor = entry.blocked ? "var(--red, #E24B4A)"
    : entry.warning ? "var(--amber, #EF9F27)"
    : color;

  const limitLabel = entry.unlimited ? "∞" : String(entry.limit);
  const pctLabel = entry.unlimited ? "" : `${entry.pct}%`;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: entry.blocked ? "#E24B4A" : entry.warning ? "#EF9F27" : "var(--text-muted)" }}>
          {entry.unlimited ? `${entry.used} used · unlimited` : `${entry.used} / ${limitLabel}`}
        </span>
      </div>
      {!entry.unlimited && (
        <div style={{ height: 6, background: "rgba(175,169,236,0.08)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, entry.pct)}%`,
            background: barColor,
            borderRadius: 999,
            transition: "width 0.4s ease",
            opacity: 0.75,
          }} />
        </div>
      )}
      {(entry.warning || entry.blocked) && (
        <div style={{
          marginTop: 7, fontFamily: "var(--font-mono)", fontSize: 10,
          color: entry.blocked ? "#E24B4A" : "#EF9F27",
        }}>
          {entry.blocked
            ? "Limit reached — upgrade to continue"
            : `${pctLabel} used — approaching limit`}
        </div>
      )}
    </div>
  );
}

function FeatureFlag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(175,169,236,0.05)" }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)" }}>{label}</span>
      {enabled ? (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#1D9E75", background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)", padding: "2px 9px", borderRadius: 999 }}>Enabled</span>
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.35)", background: "rgba(175,169,236,0.05)", border: "1px solid rgba(175,169,236,0.1)", padding: "2px 9px", borderRadius: 999 }}>Pro</span>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/usage")
      .then(r => r.json())
      .then((d: UsageStats) => { if (d && typeof d === "object") setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [currentMonth, setCurrentMonth] = useState("");
  useEffect(() => {
    setCurrentMonth(new Date().toLocaleString("default", { month: "long", year: "numeric" }));
  }, []);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const plan = stats.plan ?? "free";
  const planDisplay = stats.plan_display ?? (plan === "free" ? "Free" : plan.charAt(0).toUpperCase() + plan.slice(1));
  const isPro = plan !== "free";
  const features = stats.features ?? { semantic_drift: false, auto_pr: false, github_action_comments: false };

  const quotas = stats.quotas ?? {
    docs_generated: { used: stats.docs_generated, limit: 500, unlimited: false, pct: Math.min(100, Math.round(stats.docs_generated / 500 * 100)), warning: false, blocked: false },
    drift_checks:   { used: stats.drift_checks_run ?? 0, limit: 200, unlimited: false, pct: Math.min(100, Math.round((stats.drift_checks_run ?? 0) / 200 * 100)), warning: false, blocked: false },
    chat_messages:  { used: stats.chat_messages ?? 0, limit: 300, unlimited: false, pct: Math.min(100, Math.round((stats.chat_messages ?? 0) / 300 * 100)), warning: false, blocked: false },
    repos: { used: 0, limit: 1, unlimited: false, pct: 0, warning: false, blocked: false },
  };

  const anyWarning = Object.values(quotas).some(q => q.warning || q.blocked);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "flex-start" }}>

      {/* ── Main column ── */}
      <div>

        {/* Upgrade prompt if on free plan */}
        {!isPro && (
          <div style={{
            background: "linear-gradient(135deg, rgba(83,74,183,0.08) 0%, rgba(83,74,183,0.03) 100%)",
            border: "1px solid rgba(83,74,183,0.2)", borderRadius: 12,
            padding: "20px 24px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>
                You&apos;re on the Free plan
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)" }}>
                Upgrade to Pro for 3× higher limits, auto-PR, GitHub Action comments, enhanced dashboard, and prioritized support.
              </div>
            </div>
            <Link href="/dashboard/pricing" style={{
              padding: "9px 20px", borderRadius: 8, whiteSpace: "nowrap",
              background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "#fff",
              textDecoration: "none",
            }}>
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {/* Quota warning banner */}
        {anyWarning && (
          <div style={{
            background: "rgba(239,159,39,0.06)", border: "1px solid rgba(239,159,39,0.25)",
            borderRadius: 12, padding: "14px 20px", marginBottom: 24,
            display: "flex", gap: 10, alignItems: "center",
          }}>
            <span style={{ color: "#EF9F27", fontSize: 16 }}>⚠</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)" }}>
              You&apos;re approaching or have reached a usage limit.{" "}
              <Link href="/dashboard/pricing" style={{ color: "#EF9F27", textDecoration: "underline" }}>Upgrade to Pro</Link>
              {" "}to continue without interruption.
            </span>
          </div>
        )}

        {/* Activity stat cards */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
          Activity — {currentMonth}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
                <SkeletonBlock width={90} height={10} style={{ marginBottom: 14 }} />
                <SkeletonBlock width={56} height={30} />
              </div>
            ))
          ) : (
            <>
              <StatCard label="Docs Generated" value={fmt(stats.docs_generated)} color="var(--purple-light)" />
              <StatCard label="Drift Checks" value={fmt(stats.drift_checks_run)} />
              <StatCard label="Coverage Scans" value={fmt(stats.coverage_scans)} />
            </>
          )}
        </div>

        {/* API usage cards */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
          API Usage
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
                <SkeletonBlock width={90} height={10} style={{ marginBottom: 14 }} />
                <SkeletonBlock width={56} height={30} />
              </div>
            ))
          ) : (
            <>
              <StatCard label="Calls Today" value={fmt(stats.api_calls_today)} />
              <StatCard label="Calls This Month" value={fmt(stats.api_calls_month)} />
              <StatCard label="Tokens Used" value={fmt(stats.tokens_used)} sub="cumulative" />
            </>
          )}
        </div>

        {/* Quota bars */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "24px 28px",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
            Monthly quotas
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <SkeletonBlock width={120} height={12} />
                    <SkeletonBlock width={60} height={12} />
                  </div>
                  <SkeletonBlock width="100%" height={6} style={{ borderRadius: 999 }} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <QuotaBar label="Doc generations" entry={quotas.docs_generated} color="var(--purple-light, #AFA9EC)" />
              <QuotaBar label="Drift detections" entry={quotas.drift_checks} color="var(--amber, #EF9F27)" />
              <QuotaBar label="Chat messages" entry={quotas.chat_messages} color="var(--cyan, #00D4FF)" />
              <QuotaBar label="Connected repos" entry={quotas.repos} color="var(--green, #1D9E75)" />
            </>
          )}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Plan card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Current plan</div>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <SkeletonBlock width={80} height={22} />
              <SkeletonBlock width={44} height={20} style={{ borderRadius: 999 }} />
            </div>
          ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--text)" }}>{planDisplay}</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, padding: "3px 10px", borderRadius: 999,
              background: isPro ? "rgba(29,158,117,0.12)" : "rgba(83,74,183,0.12)",
              color: isPro ? "#1D9E75" : "var(--purple-light)",
              border: isPro ? "1px solid rgba(29,158,117,0.2)" : "1px solid rgba(83,74,183,0.2)",
              letterSpacing: "0.05em",
            }}>
              {planDisplay.toUpperCase()}
            </span>
          </div>
          )}

          {!loading && !isPro && (
            <Link href="/dashboard/pricing" style={{
              display: "block", textAlign: "center",
              padding: "9px 0", borderRadius: 8,
              background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "#fff",
              textDecoration: "none", marginBottom: 4,
            }}>
              Upgrade to Pro
            </Link>
          )}
          {!loading && isPro && (
            <button
              onClick={async () => {
                const res = await fetch("/api/proxy/billing/portal", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ return_url: window.location.href }),
                });
                if (res.ok) {
                  const { portal_url } = await res.json();
                  window.location.href = portal_url;
                }
              }}
              style={{
                display: "block", width: "100%", textAlign: "center",
                padding: "9px 0", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(175,169,236,0.12)",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13, color: "var(--text-muted)",
              }}
            >
              Manage billing →
            </button>
          )}
        </div>

        {/* Feature flags */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Plan features
          </div>
          <FeatureFlag label="Semantic drift detection" enabled={features.semantic_drift} />
          <FeatureFlag label="Auto-PR for fixes" enabled={features.auto_pr} />
          <FeatureFlag label="GitHub Action comments" enabled={features.github_action_comments} />
          {!isPro && (
            <div style={{ marginTop: 14 }}>
              <Link href="/dashboard/pricing" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#AFA9EC", textDecoration: "none" }}>
                See what Pro unlocks →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
