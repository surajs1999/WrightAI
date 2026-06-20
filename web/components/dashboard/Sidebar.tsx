"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, BarChart2, Zap, GitPullRequest,
  MessageSquare, FileText, Key, Settings, Activity, Server, HelpCircle, CreditCard,
} from "lucide-react";

const NAV = [
  {
    group: "OVERVIEW",
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      { label: "Usage", href: "/dashboard/usage", icon: Activity },
    ],
  },
  {
    group: "TOOLS",
    items: [
      { label: "Generate", href: "/dashboard/generate", icon: Zap },
      { label: "Coverage", href: "/dashboard/coverage", icon: BarChart2 },
      { label: "Drift Check", href: "/dashboard/drift", icon: GitPullRequest },
      { label: "Codebase Chat", href: "/dashboard/chat", icon: MessageSquare },
      { label: "llms.txt", href: "/dashboard/llms-txt", icon: FileText },
      { label: "MCP Server", href: "/dashboard/mcp", icon: Server },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { label: "API Keys", href: "/dashboard/keys", icon: Key },
      { label: "Pricing", href: "/dashboard/pricing", icon: CreditCard },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
      { label: "Need Help?", href: "/dashboard/help", icon: HelpCircle },
    ],
  },
];

/**
 * Renders a fixed-width navigation sidebar with grouped links, active-route highlighting, and an optional close callback for mobile overlays.
 *
 * The Sidebar component displays the Wright AI logo and plan badge at the top, followed by a scrollable navigation area built from a NAV configuration. It uses Next.js `usePathname` to determine the currently active route: the `/dashboard` path requires an exact match, while all other paths use a `startsWith` check. Active links receive a purple accent background and left border. Hover styles are applied via inline mouse-event handlers. The optional `onClose` callback is invoked when any navigation link is clicked, making the component suitable for dismissible mobile drawer patterns.
 *
 * @param {(() => void) | undefined} onClose - Optional callback invoked when a navigation link is clicked; typically used to close a mobile drawer or overlay containing the sidebar.
 * @returns {JSX.Element} An <aside> element containing the Wright AI logo section and a grouped navigation menu with styled, active-aware links.
 * @example
 * // Basic usage inside a layout
 * <Sidebar />
 * 
 * // With a close handler for a mobile drawer
 * <Sidebar onClose={() => setDrawerOpen(false)} />
 */



export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside
      style={{
        width: 228,
        height: "100%",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Image src="/wright-logo.svg" alt="Wright AI" width={36} height={36} style={{ height: 36, width: "auto", flexShrink: 0 }} priority />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>Wright AI</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--purple-light)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>Doc Intelligence</span>
          </div>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          padding: "3px 10px",
          borderRadius: 999,
          background: "rgba(83,74,183,0.12)",
          color: "var(--purple-light)",
          border: "1px solid rgba(83,74,183,0.2)",
          letterSpacing: "0.05em",
        }}>
          Free plan
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
        {NAV.map(group => (
          <div key={group.group} style={{ marginBottom: 18 }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "rgba(136,132,168,0.5)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 8px 4px",
            }}>
              {group.group}
            </div>
            {group.items.map(item => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 8,
                    marginBottom: 1,
                    textDecoration: "none",
                    background: active ? "rgba(83,74,183,0.14)" : "transparent",
                    borderLeft: active ? "2px solid var(--purple)" : "2px solid transparent",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    fontFamily: "var(--font-body)",
                    fontSize: 13.5,
                    fontWeight: active ? 500 : 400,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(175,169,236,0.05)"; el.style.color = "var(--text)"; } }}
                  onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--text-muted)"; } }}
                >
                  <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

    </aside>
  );
}
