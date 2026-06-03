"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/**
 * Renders a fixed navigation bar component that changes styling based on scroll position.
 *
 * A React functional component that displays a responsive navigation bar with logo, navigation links, and a call-to-action button. The navbar applies a glassmorphism effect (backdrop blur and semi-transparent background) when the user scrolls past 24 pixels from the top of the page. The component tracks scroll position using a useState hook and attaches/detaches scroll event listeners via useEffect.
 *
 * Returns:
 *     JSX.Element: A JSX element representing the fixed navigation bar with conditional styling based on scroll state.
 *
 * Example:
 *     ```
 *     <Navbar />
 *     ```
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(  /**
   * Sets up a scroll event listener that updates the scrolled state when the user scrolls beyond 24 pixels and returns a cleanup function to remove the listener.
   *
   * This effect callback establishes a passive scroll event listener on the window object that monitors vertical scroll position. When the scroll position exceeds 24 pixels, it triggers a state update via setScrolled. The passive event listener option improves scrolling performance by indicating the handler won't call preventDefault(). The returned cleanup function ensures proper removal of the event listener when the component unmounts or the effect re-runs.
   * @returns {() => void} A cleanup function that removes the scroll event listener from the window object.
   * @example
   * useEffect(() => {
   *   const onScroll = () => setScrolled(window.scrollY > 24);
   *   window.addEventListener('scroll', onScroll, { passive: true });
   *   return () => window.removeEventListener('scroll', onScroll);
   * }, [])
   */
() => {
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
            { label: "Pricing", href: "/pricing" },
            { label: "Docs", href: "/docs" },
            { label: "Get Started", href: "#install" },
          ].map(          /**
           * Renders a styled anchor element with dynamic hover effects and conditional external link attributes based on link properties.
           *
           * This arrow function creates a React anchor element that applies custom styling, handles hover state changes for text color, and conditionally sets target and rel attributes for external links (those starting with 'http'). It uses CSS custom properties for theming and implements smooth color transitions.
           *
           * @param {{ label: string; href: string }} l - Link object containing label text to display and href URL for navigation.
           * @returns {JSX.Element} A React anchor element with conditional attributes, inline styles, and hover event handlers.
           * @example
           * const link = { label: 'Documentation', href: 'https://example.com/docs' }; const element = renderLink(link);
           */
l => (
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
