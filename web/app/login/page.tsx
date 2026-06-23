"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ga } from "@/lib/ga";

/**
 * Renders an SVG icon component displaying the GitHub logo.
 *
 * A functional React component that returns an inline SVG element with the GitHub logo path. The icon is sized at 18x18 pixels with a viewBox of 24x24, and uses currentColor for fill to inherit text color from its parent.
 * @returns {JSX.Element} An SVG element containing the GitHub logo icon with 18x18 dimensions.
 * @example
 * <GithubIcon />
 */
const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

/**
 * Renders an SVG icon representing the Google logo with four colored paths forming the distinctive 'G' shape.
 *
 * This is a React functional component that returns an inline SVG element displaying the official Google logo. The icon is sized at 18x18 pixels and uses Google's brand colors: blue (#4285F4), green (#34A853), yellow (#FBBC05), and red (#EA4335).
 * @returns {JSX.Element} A React SVG element containing the Google logo icon.
 * @example
 * <GoogleIcon />
 */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/**
 * Renders a checkmark SVG icon component styled in green.
 *
 * Returns a functional React component that renders an inline SVG checkmark icon with predefined dimensions (14x14), stroke color (#1D9E75 green), and rounded line caps/joins. The icon displays a checkmark symbol using a polyline path.
 * @returns {JSX.Element} An SVG element representing a checkmark icon with green stroke.
 * @example
 * <CheckIcon />
 */
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FEATURES = [
  "Auto-generate docstrings for your entire codebase",
  "Detect documentation drift after every commit",
  "Chat with your codebase using an AI-aware MCP server",
  "Publish docs queryable by Claude, Cursor, and Copilot",
];

/**
 * Renders the login page UI with OAuth provider buttons and promotional content for Wright AI documentation intelligence platform.
 *
 * A React functional component that displays a two-panel login interface. The left panel showcases marketing content including features, testimonials, and decorative elements. The right panel contains authentication buttons for GitHub and Google OAuth, along with error handling for authentication failures. Extracts 'next' and 'error' URL parameters to control post-login redirection and display error messages.
 * @returns {JSX.Element} A React element containing the complete login page UI with left marketing panel and right authentication panel.
 * @example
 * <LoginContent />
 */
function LoginContent() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const error = params.get("error");

  const loginWith = (provider: string) => {
    const method = provider === "GitHubOAuth" ? "github" : "google";
    ga.signUpInitiated(method);
    sessionStorage.setItem("wright_sign_up_method", method);
    window.location.href = `/api/auth/login?provider=${provider}&next=${encodeURIComponent(next)}`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: "0 0 52%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        position: "relative",
        overflow: "hidden",
        borderRight: "1px solid rgba(175,169,236,0.07)",
      }}>

        {/* Background orbs */}
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: 600, height: 500, background: "rgba(83,74,183,0.35)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "-5%", width: 350, height: 300, background: "rgba(34,211,238,0.12)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(175,169,236,0.08) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }} />

        {/* Concentric ring */}
        <div style={{ position: "absolute", bottom: "-120px", left: "-120px", width: 480, height: 480, borderRadius: "50%", border: "1px solid rgba(175,169,236,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(175,169,236,0.06)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Image src="/wright-logo.svg" alt="Wright AI" width={36} height={36} style={{ height: 36, width: "auto" }} priority />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>Wright AI</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--purple-light)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>Doc Intelligence</span>
            </div>
          </Link>
        </div>

        {/* Center content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 12px", borderRadius: 99,
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.2)",
            marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22D3EE", boxShadow: "0 0 6px #22D3EE", display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#22D3EE", letterSpacing: "0.05em" }}>DOCUMENTATION INTELLIGENCE</span>
          </div>

          <h2 style={{
            fontFamily: "var(--font-heading)",
            fontSize: 38,
            fontWeight: 800,
            color: "var(--text)",
            lineHeight: 1.15,
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            Your code, documented.<br />
            <span style={{ background: "linear-gradient(135deg, #AFA9EC 0%, #22D3EE 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Always up to date.
            </span>
          </h2>

          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "var(--text-muted)",
            lineHeight: 1.7,
            maxWidth: 380,
            marginBottom: 40,
          }}>
            Wright AI writes and maintains documentation for your codebase — detecting drift, enabling AI queries, and keeping your team in sync.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: "rgba(29,158,117,0.12)",
                  border: "1px solid rgba(29,158,117,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  <CheckIcon />
                </div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(200,198,230,0.8)", lineHeight: 1.55 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(175,169,236,0.1)",
            maxWidth: 380,
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>
              "Wright cut our docs maintenance time in half. The drift detection alone is worth it."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #534AB7, #22D3EE)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#fff", fontWeight: 700 }}>AL</span>
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Alex L.</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>Staff Engineer · Vercel</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        position: "relative",
      }}>

        {/* Subtle right-side orb */}
        <div style={{ position: "absolute", top: "20%", right: "-5%", width: 300, height: 300, background: "rgba(83,74,183,0.18)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 360, position: "relative", zIndex: 1 }}>

          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 24,
            color: "var(--text)",
            marginBottom: 6,
          }}>
            Sign in to Wright AI
          </h1>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 32,
            lineHeight: 1.5,
          }}>
            Free to start — no credit card required.
          </p>

          {error && (
            <div style={{
              marginBottom: 20,
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(226,75,74,0.08)",
              border: "1px solid rgba(226,75,74,0.25)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#E24B4A",
            }}>
              {error === "missing_code"
                ? "Authentication code missing. Please try again."
                : "Authentication failed. Please try again."}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => loginWith("GitHubOAuth")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "13px 20px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(175,169,236,0.18)",
                color: "var(--text)",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.09)";
                el.style.borderColor = "rgba(175,169,236,0.4)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.05)";
                el.style.borderColor = "rgba(175,169,236,0.18)";
                el.style.transform = "translateY(0)";
              }}
            >
              <GithubIcon />
              Continue with GitHub
            </button>

            <button
              onClick={() => loginWith("GoogleOAuth")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "13px 20px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(175,169,236,0.18)",
                color: "var(--text)",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.09)";
                el.style.borderColor = "rgba(175,169,236,0.4)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.05)";
                el.style.borderColor = "rgba(175,169,236,0.18)";
                el.style.transform = "translateY(0)";
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(175,169,236,0.1)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.5)" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(175,169,236,0.1)" }} />
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 28 }}>
            {[
              { icon: "🔒", label: "Secure OAuth" },
              { icon: "⚡", label: "Set up in 60s" },
              { icon: "✦", label: "Free tier" },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12 }}>{b.icon}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(136,132,168,0.5)" }}>{b.label}</span>
              </div>
            ))}
          </div>

          <p style={{
            textAlign: "center",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "rgba(136,132,168,0.45)",
            lineHeight: 1.6,
          }}>
            By signing in you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(175,169,236,0.6)", textDecoration: "none" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "rgba(175,169,236,0.6)", textDecoration: "none" }}>Privacy Policy</Link>.
          </p>

        </div>
      </div>

    </div>
  );
}

/**
 * Renders the login page component wrapped in a Suspense boundary for handling asynchronous loading states.
 *
 * This component serves as the main entry point for the login page, wrapping the LoginContent component in a React Suspense boundary to enable progressive rendering and fallback UI during data fetching or code-splitting scenarios.
 * @returns {JSX.Element} A React Suspense component containing the LoginContent component.
 * @example
 * <LoginPage />
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
