"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "all 0.3s ease",
        background: scrolled ? "rgba(8, 6, 18, 0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <div className="nav-inner">
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <Image
            src="/wright-logo.svg"
            alt="Wright AI"
            width={36}
            height={36}
            style={{ height: 36, width: "auto" }}
            priority
          />
          <span style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}>
            Wright AI
          </span>
        </Link>

        {/* Center links */}
        <div className="desktop-only" style={{ display: "none", alignItems: "center", gap: 48 }}>
          {[
            { label: "Features", href: "#features" },
            { label: "Docs", href: "/docs" },
            { label: "Changelog", href: "https://github.com/surajs1999/WrightAI/releases" },
            { label: "Get Started", href: "#install" },
          ].map(l => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 16,
                fontWeight: 400,
                color: "var(--text-muted)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--text)")}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--text-muted)")}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="btn-cyan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "13px 30px",
            color: "#050310",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 16,
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Start for free
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </nav>
  );
}
