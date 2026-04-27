interface MetricCardProps {
  label: string;
  value: string;
  color?: string;
  trend?: { dir: "up" | "down"; text: string };
}

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
