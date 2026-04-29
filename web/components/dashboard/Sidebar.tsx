"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, BarChart2, Zap, GitPullRequest,
  MessageSquare, FileText, Key, Settings, Activity, Server, HelpCircle,
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
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
      { label: "Need Help?", href: "/dashboard/help", icon: HelpCircle },
    ],
  },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside
      style={{
        width: 228,
        minHeight: "100vh",
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
          <Image src="/wright-logo.svg" alt="Wright AI" width={30} height={30} style={{ width: 30, height: 30, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Wright AI
          </span>
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
