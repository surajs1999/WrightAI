export default function DashboardLoading() {
  const shimmer: React.CSSProperties = {
    background: "linear-gradient(90deg, rgba(175,169,236,0.06) 25%, rgba(175,169,236,0.12) 50%, rgba(175,169,236,0.06) 75%)",
    backgroundSize: "800px 100%",
    animation: "skeleton-wave 1.6s ease-in-out infinite",
    borderRadius: 6,
  };

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Metric card row skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ ...shimmer, width: 80, height: 10, marginBottom: 12 }} />
            <div style={{ ...shimmer, width: 64, height: 32 }} />
          </div>
        ))}
      </div>

      {/* Content block skeleton */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ ...shimmer, width: 140, height: 11, marginBottom: 20 }} />
        {[1, 0.8, 0.65, 0.9, 0.5].map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
            <div style={{ ...shimmer, width: 12, height: 12, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ ...shimmer, width: `${w * 55}%`, height: 11 }} />
            <div style={{ ...shimmer, width: 28, height: 6, borderRadius: 999, marginLeft: "auto" }} />
            <div style={{ ...shimmer, width: 36, height: 11 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
