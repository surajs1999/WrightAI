interface MetricCardProps {
  label: string;
  value: string;
  color?: string;
  trend?: { dir: "up" | "down"; text: string };
}

/**
 * Renders a styled metric card component displaying a label, value, optional color, and optional trend indicator.
 *
 * A React functional component that creates a card UI element to display dashboard metrics. The card features a monospaced uppercase label, a large heading-style value, and an optional trend indicator with directional arrow and text. Styling uses CSS custom properties for theming.
 *
 * Args:
 *     label (string): The metric label text displayed in uppercase monospace font at the top of the card.
 *     value (string | number): The primary metric value displayed prominently in large font size.
 *     color (string | undefined): Optional CSS color value for the metric value text. Defaults to 'var(--text)' if not provided.
 *     trend ({ dir: 'up' | 'down', text: string } | undefined): Optional trend object containing direction ('up' or 'down') and descriptive text, displayed as a colored badge with an arrow indicator.
 *
 * Returns:
 *     JSX.Element: A React JSX element representing the styled metric card.
 *
 * Example:
 *     ```
 *     <MetricCard label="Total Users" value="1,234" color="var(--blue)" trend={{ dir: 'up', text: '+12.5%' }} />
 *     ```
 */
export default function MetricCard({ label, value, color, trend }: MetricCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
      }}
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
    </div>
  );
}
