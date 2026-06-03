"use client";

import Link from "next/link";
import Image from "next/image";

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Getting Started", href: "#install" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" },
    { label: "Support", href: "/dashboard/help" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "GitHub", href: "https://github.com/surajs1999/WrightAI", ext: true },
    { label: "VS Code Extension", href: "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai", ext: true },
    { label: "MCP Server", href: "/docs#mcp-reference" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Refund Policy", href: "/refund-policy" },
  ],
};

const SOCIALS = [
  {
    label: "GitHub",
    href: "https://github.com/surajs1999/WrightAI",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
  },
  {
    label: "X / Twitter",
    href: "https://x.com/wrightai",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
      </svg>
    ),
  },
];

/**
 * Renders the footer component for the Wright AI landing page with branding, navigation links, social media icons, and copyright information.
 *
 * A React functional component that returns a complete footer section featuring a gradient top border, a grid layout containing the Wright AI logo and tagline, social media links from the SOCIALS constant, grouped navigation links from the LINKS constant, and a bottom copyright bar. The footer uses CSS custom properties for theming and includes hover effects on interactive elements.
 * @returns {JSX.Element} A React element representing a footer with brand information, navigation links organized by category, social media icons, and a copyright notice.
 * @example
 * <Footer />
 */
export default function Footer() {
  return (
    <footer style={{ background: "var(--bg)", borderTop: "1px solid rgba(175,169,236,0.08)" }}>

      {/* Top gradient line */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(175,169,236,0.2) 30%, rgba(34,211,238,0.15) 60%, transparent)" }} />

      {/* Main footer grid */}
      <div className="footer-section section-inner">
        <div className="footer-grid">

          {/* Brand column */}
          <div>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Image src="/wright-logo.svg" alt="Wright AI" width={28} height={28} style={{ height: 28, width: "auto", opacity: 0.9 }} />
              <span style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                opacity: 0.9,
              }}>
                Wright AI
              </span>
            </Link>
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: 13.5,
              color: "var(--text-muted)",
              lineHeight: 1.65,
              maxWidth: 240,
              marginBottom: 24,
            }}>
              Documentation that writes itself, stays current, and speaks to AI.
            </p>

            {/* Socials */}
            <div style={{ display: "flex", gap: 10 }}>
              {SOCIALS.map(s => (
                <Link
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  style={{
                    width: 36, height: 36, borderRadius: 9,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(175,169,236,0.1)",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text)"; el.style.borderColor = "rgba(175,169,236,0.3)"; el.style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text-muted)"; el.style.borderColor = "rgba(175,169,236,0.1)"; el.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  {s.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {(Object.entries(LINKS) as [string, typeof LINKS.Product][]).map(([group, items]) => (
            <div key={group}>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "rgba(175,169,236,0.5)",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}>{group}</p>
              <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map(l => (
                  <Link
                    key={l.label}
                    href={l.href}
                    target={l.ext ? "_blank" : undefined}
                    rel={l.ext ? "noopener noreferrer" : undefined}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13.5,
                      color: "var(--text-muted)",
                      textDecoration: "none",
                      transition: "color 0.15s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
                  >
                    {l.label}
                    {l.ext && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(175,169,236,0.07)", padding: "20px 48px" }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(136,132,168,0.45)" }}>
            © 2026 WrightAI · Built with Love
          </p>
        </div>
      </div>

    </footer>
  );
}
