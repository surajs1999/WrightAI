"use client";

const ITEMS = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 12l2 2 4-4"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
      </svg>
    ),
    label: "Documentation Drift Detection",
    color: "#1D9E75",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12h6M12 9v6"/>
      </svg>
    ),
    label: "AI Documentation Generation",
    color: "#7F77DD",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
    label: "Codebase Intelligence Chat",
    color: "#00D4FF",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
    label: "GitHub Actions CI Enforcement",
    color: "#EF9F27",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    label: "VS Code Extension",
    color: "#00D4FF",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    label: "MCP Server for AI Assistants",
    color: "#7F77DD",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: "Documentation Health Dashboard",
    color: "#1D9E75",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: "Coverage Tracking & Reporting",
    color: "#EF9F27",
  },
];

export default function TrustStrip() {
  return (
    <div style={{
      borderTop: "1px solid rgba(175,169,236,0.08)",
      borderBottom: "1px solid rgba(175,169,236,0.08)",
      background: "rgba(13,11,31,0.5)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Fade edges */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
        background: "linear-gradient(to right, var(--bg), transparent)",
        zIndex: 2, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
        background: "linear-gradient(to left, var(--bg), transparent)",
        zIndex: 2, pointerEvents: "none",
      }} />

      <div style={{
        display: "flex",
        gap: 0,
        padding: "0",
        animation: "marquee 30s linear infinite",
      }}>
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 32px",
              borderRight: "1px solid rgba(175,169,236,0.07)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span style={{ color: item.color, display: "flex", opacity: 0.85 }}>{item.icon}</span>
            <span style={{
              fontFamily: "var(--font-body)",
              fontSize: 13.5,
              color: "var(--text-muted)",
              fontWeight: 400,
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
