import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wright AI — AI-Powered Code Documentation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#07051A",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background grid dots */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(175,169,236,0.15) 1.5px, transparent 1.5px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Purple glow orb */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(83,74,183,0.35)",
            filter: "blur(90px)",
          }}
        />
        {/* Cyan glow orb */}
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: 80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(0,212,255,0.18)",
            filter: "blur(80px)",
          }}
        />

        {/* Top: logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          {/* W logomark */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #534AB7 0%, #00D4FF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            W
          </div>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#F0EEF8",
              letterSpacing: "-0.02em",
            }}
          >
            Wright AI
          </span>
          {/* Live MCP badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 16,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.3)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#1D9E75",
              }}
            />
            <span style={{ fontSize: 14, color: "#00D4FF", fontWeight: 500 }}>
              Live MCP Server
            </span>
          </div>
        </div>

        {/* Middle: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#F0EEF8",
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
            }}
          >
            Your codebase,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 100%)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              written.
            </span>
          </div>
          <div
            style={{
              fontSize: 24,
              color: "rgba(175,169,236,0.75)",
              lineHeight: 1.5,
              fontWeight: 400,
              maxWidth: 720,
            }}
          >
            Auto-generate docstrings · Detect drift · Feed Claude Code &amp; Cursor via MCP
          </div>
        </div>

        {/* Bottom: language pills + free badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {["Python", "TypeScript", "JavaScript", "Go", "Rust"].map((lang) => (
              <div
                key={lang}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: "rgba(175,169,236,0.08)",
                  border: "1px solid rgba(175,169,236,0.18)",
                  fontSize: 16,
                  color: "#AFA9EC",
                  fontWeight: 500,
                }}
              >
                {lang}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              background: "rgba(29,158,117,0.12)",
              border: "1px solid rgba(29,158,117,0.3)",
              fontSize: 18,
              color: "#1D9E75",
              fontWeight: 600,
            }}
          >
            Free · No credit card
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
