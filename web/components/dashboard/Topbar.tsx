"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/generate": "Generate",
  "/dashboard/coverage": "Coverage",
  "/dashboard/drift": "Drift Check",
  "/dashboard/chat": "Codebase Chat",
  "/dashboard/llms-txt": "llms.txt",
  "/dashboard/mcp": "MCP Server",
  "/dashboard/keys": "API Keys",
  "/dashboard/settings": "Settings",
  "/dashboard/usage": "Usage",
  "/dashboard/help": "Need Help?",
};

/**
 * Renders a sticky top navigation bar component for the dashboard with page title, user avatar dropdown menu, and mobile hamburger button.
 *
 * The Topbar component displays the current page title based on the pathname, a clickable user avatar with initials that toggles a dropdown menu containing navigation links (Settings, API Keys, Help) and a sign-out option, and a hamburger menu button for mobile navigation. The dropdown menu automatically closes when clicking outside of it using a ref-based click-outside handler.
 *
 * @param {string} userInitials - The user's initials to display in the avatar circle, defaults to 'U' if not provided. Only the first two characters are shown in uppercase.
 * @param {() => void} onMenuClick - Optional callback function triggered when the hamburger menu button is clicked, typically used to toggle the mobile sidebar navigation.
 * @returns {JSX.Element} A React header element containing the navigation bar with title, hamburger button, user avatar, and dropdown menu.
 * @example
 * <Topbar userInitials="JS" onMenuClick={() => setSidebarOpen(true)} />
 */
export default function Topbar({
  userInitials = "U",
  onMenuClick,
}: {
  userInitials?: string;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header style={{
      height: 54,
      borderBottom: "1px solid var(--border)",
      background: "rgba(13,11,31,0.85)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Hamburger — visible only on mobile via CSS */}
        <button className="dash-hamburger" onClick={onMenuClick} aria-label="Open menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: 15,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}>
          {title}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }} ref={ref}>
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--purple)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12, color: "#fff",
            boxShadow: open ? "0 0 18px rgba(83,74,183,0.6)" : "0 0 12px rgba(83,74,183,0.4)",
            cursor: "pointer", flexShrink: 0,
            transition: "box-shadow 0.15s",
            userSelect: "none",
          }}
        >
          {userInitials.toUpperCase().slice(0, 2)}
        </div>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 180,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 50,
          }}>
            {[
              { label: "Settings", href: "/dashboard/settings", icon: "⚙" },
              { label: "API Keys", href: "/dashboard/keys", icon: "🔑" },
              { label: "Need Help?", href: "/dashboard/help", icon: "?" },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "10px 14px",
                  fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)",
                  textDecoration: "none", transition: "all 0.12s",
                  borderBottom: "1px solid var(--border)",
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(175,169,236,0.06)"; el.style.color = "var(--text)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--text-muted)"; }}
              >
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <a
              href="/api/auth/logout"
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "10px 14px",
                fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--red)",
                textDecoration: "none", transition: "background 0.12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(226,75,74,0.07)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Sign out
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
