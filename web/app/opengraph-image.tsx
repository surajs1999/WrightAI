import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wright AI — AI-Powered Code Documentation";
export const size = { width: 1000, height: 420 };
export const contentType = "image/png";

/**
 * Generates and returns a static OpenGraph image response for the Wright AI application using an inline JSX layout.
 *
 * Constructs a branded Open Graph image for the Wright AI web app by rendering a structured JSX layout into an `ImageResponse`. The image includes a gradient accent bar, the Wright AI logo, a live MCP server status badge, a headline block, a row of supported language tags, and a free-tier call-to-action. It is intended to be used as the `opengraph-image` route export in a Next.js App Router project.
 * @returns {ImageResponse} An `ImageResponse` instance containing the rendered Open Graph image at the dimensions specified by the exported `size` constant.
 * @example
 * // In Next.js App Router (app/opengraph-image.tsx)
 * export default Image;
 * // Next.js automatically serves the result at /opengraph-image
 */
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
          padding: "40px 56px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 3,
            background: "linear-gradient(90deg, #534AB7 0%, #00D4FF 100%)",
          }}
        />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Actual Wright logo (SVG inlined) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            width="44"
            height="44"
          >
            <circle cx="256" cy="256" r="256" fill="#26215C" />
            <path
              d="M 86 154 L 163 358 L 256 194 L 349 358 L 426 154"
              stroke="#FFFFFF"
              strokeWidth="46"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: "#F0EEF8",
              letterSpacing: "-0.02em",
            }}
          >
            Wright AI
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginLeft: 16,
              padding: "5px 14px",
              borderRadius: 999,
              backgroundColor: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: "#1D9E75",
              }}
            />
            <span style={{ display: "flex", fontSize: 13, color: "#00D4FF", fontWeight: 500 }}>
              Live MCP Server
            </span>
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 800,
              color: "#F0EEF8",
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
            }}
          >
            Your codebase, written.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "rgba(175,169,236,0.75)",
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            Auto-generate docstrings · Detect drift · Feed Claude Code &amp; Cursor via MCP
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {["Python", "TypeScript", "JavaScript", "Go", "Rust"].map((lang) => (
              <div
                key={lang}
                style={{
                  display: "flex",
                  padding: "6px 14px",
                  borderRadius: 7,
                  backgroundColor: "rgba(175,169,236,0.08)",
                  border: "1px solid rgba(175,169,236,0.2)",
                  fontSize: 14,
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
              display: "flex",
              padding: "8px 20px",
              borderRadius: 8,
              backgroundColor: "rgba(29,158,117,0.12)",
              border: "1px solid rgba(29,158,117,0.3)",
              fontSize: 15,
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