"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ga } from "@/lib/ga";

export default function NavbarV2() {
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
        background: scrolled ? "rgba(6, 4, 15, 0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <div className="nav-inner">
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <Image
            src="/wright-logo.svg"
            alt="Wright AI"
            width={36}
            height={36}
            style={{ height: 36, width: "auto" }}
            priority
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}>
              Wright AI
            </span>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--purple-light)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              lineHeight: 1.4,
            }}>
              Doc Intelligence
            </span>
          </div>
        </Link>

        <div className="desktop-only" style={{ display: "none", alignItems: "center", gap: 40 }}>
          {[
            { label: "How It Works", href: "/#pillars" },
            { label: "Drift Detection", href: "/#drift" },
            { label: "Compare", href: "/#compare" },
            { label: "Pricing", href: "/pricing" },
            { label: "Docs", href: "/docs" },
          ].map(l => (
            <a
              key={l.label}
              href={l.href}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 15,
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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/dashboard"
            className="nav-signin"
            style={{
              alignItems: "center",
              padding: "10px 20px",
              border: "1px solid var(--border-hover)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: 14,
              textDecoration: "none",
              borderRadius: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text)"; el.style.borderColor = "rgba(175,169,236,0.4)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--text-muted)"; el.style.borderColor = "var(--border-hover)"; }}
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="btn-cyan"
            onClick={() => ga.ctaClick("navbar")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 22px",
              color: "#050310",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Start Free
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
