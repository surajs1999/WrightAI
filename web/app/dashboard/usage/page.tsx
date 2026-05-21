"use client";

import { useEffect, useState } from "react";

interface UsageStats {
  api_calls_today: number;
  api_calls_month: number;
  docs_generated: number;
  drift_checks_run: number;
  coverage_scans: number;
  tokens_used: number;
}

const MOCK: UsageStats = {
  api_calls_today: 0,
  api_calls_month: 0,
  docs_generated: 0,
  drift_checks_run: 0,
  coverage_scans: 0,
  tokens_used: 0,
};

/**
 * Renders a styled statistics card component displaying a label, value, and optional subtitle with support for coming soon state.
 *
 * A React functional component that displays a statistic in a card format with customizable styling. When the 'coming' flag is true, it displays a 'SOON' badge, blurs the value (showing '99' as placeholder), and shows 'Coming soon' text instead of the subtitle.
 *
 * @param {string} label - The label text displayed at the top of the card in uppercase monospace font.
 * @param {string} value - The main statistic value to display prominently in the card (hidden if coming is true).
 * @param {string | undefined} sub - Optional subtitle text displayed below the value in smaller monospace font.
 * @param {string | undefined} color - Optional CSS color value for the main statistic value text (defaults to '--text' CSS variable).
 * @param {boolean | undefined} coming - Optional flag that when true, displays a 'SOON' badge, blurs the value, and shows 'Coming soon' text.
 * @returns {JSX.Element} A React element representing the styled statistics card with configured content and appearance.
 * @example
 * <StatCard label="Total Users" value="1,234" sub="+12% from last month" color="var(--green)" />
 */
function StatCard({
  label, value, sub, color, coming,
}: {
  label: string; value: string; sub?: string; color?: string; coming?: boolean;
}) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "20px 24px", position: "relative", overflow: "hidden",
    }}>
      {coming && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em",
          color: "var(--purple-light)", background: "rgba(83,74,183,0.1)",
          border: "1px solid rgba(83,74,183,0.2)", borderRadius: 999,
          padding: "2px 8px",
        }}>
          SOON
        </div>
      )}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 30,
        color: coming ? "rgba(175,169,236,0.2)" : (color ?? "var(--text)"),
        lineHeight: 1,
        filter: coming ? "blur(6px)" : "none",
        userSelect: coming ? "none" : undefined,
      }}>
        {coming ? "99" : value}
      </div>
      {sub && !coming && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
          {sub}
        </div>
      )}
      {coming && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
          Coming soon
        </div>
      )}
    </div>
  );
}

/**
 * Renders a horizontal progress bar with a label and percentage indicator.
 *
 * A React component that displays a labeled progress bar with customizable color. The bar shows a percentage-based fill within a light purple background container. The label is displayed on the left with a decorative dash on the right.
 *
 * @param {string} label - The text label displayed above the progress bar.
 * @param {number} pct - The percentage value (0-100) that determines the width of the filled portion of the bar.
 * @param {string} color - The CSS color value for the progress bar fill.
 * @returns {JSX.Element} A React element containing the styled progress bar with label.
 * @example
 * <MiniBar label="CPU Usage" pct={75} color="#4CAF50" />
 */
function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>—</span>
      </div>
      <div style={{ height: 4, background: "rgba(175,169,236,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, opacity: 0.25 }} />
      </div>
    </div>
  );
}

/**
 * Renders a React component displaying usage statistics and analytics for the application, including activity metrics, API usage, and a sidebar with plan information.
 *
 * A functional React component that fetches usage statistics from the /api/proxy/usage endpoint on mount and displays them in a grid layout. The main content area shows activity statistics (docs generated, drift checks, coverage scans) and API usage metrics (calls today, calls this month, tokens used). A sidebar displays the current plan information and a usage breakdown visualization. Includes a banner announcing upcoming detailed analytics features.
 * @returns {JSX.Element} A React element containing the usage page layout with statistics, plan information, and activity breakdown.
 * @example
 * <UsagePage />
 */
export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats>(MOCK);

  useEffect(() => {
    fetch("/api/proxy/usage")
      .then(r => r.json())
      .then((d: UsageStats) => { if (d && typeof d === "object") setStats(d); })
      .catch(() => {});
  }, []);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  const totalActivity = stats.docs_generated + stats.drift_checks_run + stats.coverage_scans || 1;
  const breakdownPct = {
    generate: Math.round((stats.docs_generated / totalActivity) * 100),
    coverage: Math.round((stats.coverage_scans / totalActivity) * 100),
    drift:    Math.round((stats.drift_checks_run / totalActivity) * 100),
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "flex-start" }}>

      {/* Main */}
      <div>
        {/* Coming soon banner — top */}
        <div style={{
          background: "linear-gradient(135deg, rgba(83,74,183,0.06) 0%, rgba(83,74,183,0.02) 100%)",
          border: "1px solid rgba(83,74,183,0.18)",
          borderRadius: 12, padding: "24px 28px", marginBottom: 24,
          display: "flex", gap: 20, alignItems: "flex-start",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "rgba(83,74,183,0.12)", border: "1px solid rgba(83,74,183,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            📊
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>
              Detailed analytics coming soon
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14 }}>
              We&apos;re building per-repo breakdowns, time-series charts, function-level audit logs, and team usage views.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Per-repo breakdown", "Time-series charts", "Token usage detail", "Team & member views", "Audit log", "Export CSV"].map(f => (
                <span key={f} style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  padding: "4px 12px", borderRadius: 999,
                  background: "rgba(83,74,183,0.08)", border: "1px solid rgba(83,74,183,0.15)",
                  color: "var(--purple-light)",
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Activity stats */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Activity
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          <StatCard label="Docs generated" value={fmt(stats.docs_generated)} color="var(--purple-light)" sub="all time" />
          <StatCard label="Drift checks" value={fmt(stats.drift_checks_run)} color="var(--amber)" sub="all time" />
          <StatCard label="Coverage scans" value={fmt(stats.coverage_scans)} color="var(--green)" sub="all time" />
        </div>

        {/* API stats */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          API usage
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <StatCard label="Calls today" value={fmt(stats.api_calls_today)} sub="resets midnight UTC" />
          <StatCard label="Calls this month" value={fmt(stats.api_calls_month)} sub={currentMonth} />
          <StatCard label="Tokens used" value={fmt(stats.tokens_used)} sub="across all generations" />
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Plan card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Current plan</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--text)" }}>Free</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "3px 10px", borderRadius: 999, background: "rgba(83,74,183,0.12)", color: "var(--purple-light)", border: "1px solid rgba(83,74,183,0.2)", letterSpacing: "0.05em" }}>
              FREE PLAN
            </span>
          </div>
        </div>

        {/* Activity breakdown placeholder */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Usage breakdown
          </div>
          <MiniBar label="Generate" pct={breakdownPct.generate} color="var(--purple-light)" />
          <MiniBar label="Coverage" pct={breakdownPct.coverage} color="var(--green)" />
          <MiniBar label="Drift" pct={breakdownPct.drift} color="var(--amber)" />
          <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(83,74,183,0.06)", borderRadius: 6, border: "1px solid rgba(83,74,183,0.12)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--purple-light)" }}>
              Detailed breakdown coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
