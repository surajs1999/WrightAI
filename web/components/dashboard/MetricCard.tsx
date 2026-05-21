interface MetricCardProps {
  label: string;
  value: string;
  color?: string;
  trend?: { dir: "up" | "down"; text: string };
  href?: string;
  cta?: string;
}

/**
 * Renders a styled dashboard metric card displaying a label, value, optional trend indicator, and an optional call-to-action link.
 *
 * MetricCard is a React component that presents a single key metric in a visually consistent card layout. When an `href` is provided, the entire card becomes a clickable anchor element with hover highlight effects. An optional `trend` prop renders a color-coded badge (green for upward, red for downward) beneath the primary value. The card uses CSS custom properties for theming and a monospaced font for labels.
 *
 * @param {string} label - Short uppercase label displayed above the metric value, identifying what the metric represents (e.g., 'Total Users').
 * @param {string | number} value - The primary metric value rendered in large bold text (e.g., '1,240' or 98.6).
 * @param {string | undefined} color - Optional CSS color string used to style the metric value text. Falls back to the CSS variable `--text` when not provided.
 * @param {{ dir: 'up' | 'down'; text: string } | undefined} trend - Optional trend object. `dir` controls arrow direction and badge color (green for 'up', red for 'down'); `text` is the accompanying trend description (e.g., '+12% this week').
 * @param {string | undefined} href - Optional URL that, when provided, wraps the card in an anchor tag and enables pointer cursor and hover highlight transitions.
 * @param {string} cta - Call-to-action label shown at the bottom of the card when `href` is set. Defaults to 'View'.
 * @returns {JSX.Element} A styled card JSX element — either a plain `<div>` or an `<a>` wrapping a `<div>` depending on whether `href` is provided.
 * @example
 * <MetricCard
 *   label="Active Users"
 *   value="4,823"
 *   color="var(--accent)"
 *   trend={{ dir: "up", text: "+8% this week" }}
 *   href="/dashboard/users"
 *   cta="See all"
 * />
 */



export default function MetricCard({ label, value, color, trend, href, cta = "View" }: MetricCardProps) {
  const inner = (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
        cursor: href ? "pointer" : undefined,
        transition: href ? "border-color 0.15s, background 0.15s" : undefined,
      }}
      onMouseEnter={href ? e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(175,169,236,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(175,169,236,0.04)"; } : undefined}
      onMouseLeave={href ? e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--surface)"; } : undefined}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 32, color: color ?? "var(--text)", marginBottom: trend ? 6 : 0 }}>
        {value}
      </div>
      {trend && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            display: "inline-block",
            background: trend.dir === "up" ? "rgba(29,158,117,0.1)" : "rgba(226,75,74,0.1)",
            color: trend.dir === "up" ? "var(--green)" : "var(--red)",
          }}
        >
          {trend.dir === "up" ? "↑" : "↓"} {trend.text}
        </div>
      )}
      {href && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.4)", marginTop: 8 }}>
          {cta} →
        </div>
      )}
    </div>
  );

  if (href) {
    return <a href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</a>;
  }
  return inner;
}
