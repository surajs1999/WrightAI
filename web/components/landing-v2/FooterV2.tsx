"use client";

import Link from "next/link";
import Image from "next/image";

type NavLink = { label: string; href: string; ext?: boolean };

const LINKS: Record<string, NavLink[]> = {
  Platform: [
    { label: "Drift Detection", href: "#drift" },
    { label: "Documentation Generation", href: "#pillars" },
    { label: "Codebase Chat", href: "#pillars" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" },
  ],
  Languages: [
    { label: "Python", href: "/python" },
    { label: "TypeScript", href: "/typescript" },
    { label: "JavaScript", href: "/javascript" },
    { label: "Go", href: "/go" },
    { label: "Rust", href: "/rust" },
  ],
  Integrations: [
    { label: "VS Code Extension", href: "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai", ext: true },
    { label: "GitHub Actions", href: "/docs#github-action" },
    { label: "MCP Server", href: "/docs#mcp-reference" },
    { label: "CLI", href: "/docs" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "GitHub", href: "https://github.com/surajs1999/WrightAI", ext: true },
    { label: "Support", href: "/dashboard/help" },
    { label: "Changelog", href: "/docs" },
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
  },
  {
    label: "X / Twitter",
    href: "https://x.com/wrightai",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
      </svg>
    ),
  },
];

export default function FooterV2() {
  return (
    <footer style={{ background: "var(--bg)" }}>

      {/* Separation line */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(127,119,221,0.5) 20%, rgba(0,212,255,0.55) 45%, rgba(29,158,117,0.5) 75%, transparent 100%)" }} />

      {/* Main footer */}
      <div className="footer-section section-inner">
        <div className="v2-footer-grid">

          {/* Brand column */}
          <div>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Image src="/wright-logo.svg" alt="Wright AI" width={36} height={36} style={{ height: 36, width: "auto" }} priority />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  Wright AI
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--purple-light)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>
                  Doc Intelligence
                </span>
              </div>
            </Link>

            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: "100%", marginBottom: 24 }}>
              Documentation that never lies. Generate, verify and understand your codebase — continuously.
            </p>

            {/* Socials */}
            <div style={{ display: "flex", gap: 8 }}>
              {SOCIALS.map(s => (
                <Link
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
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
          {(Object.entries(LINKS) as [string, typeof LINKS.Platform][]).map(([group, items]) => (
            <div key={group}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                {group}
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {items.map(l => (
                  <Link
                    key={l.label}
                    href={l.href}
                    target={l.ext ? "_blank" : undefined}
                    rel={l.ext ? "noopener noreferrer" : undefined}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
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
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.35 }}>
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
      <div style={{ borderTop: "1px solid rgba(175,169,236,0.07)", padding: "18px 48px" }}>
        <div style={{
          maxWidth: 1600, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(136,132,168,0.4)" }}>
            © 2026 WrightAI · Documentation that never lies.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "block" }} className="live-dot" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(29,158,117,0.5)" }}>
              MCP server live · wrightai.live
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
}
