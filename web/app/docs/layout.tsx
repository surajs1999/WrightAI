import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Complete documentation for Wright AI: install the VS Code extension, CLI, GitHub Action, and MCP server. Learn how to auto-generate docstrings, track coverage, and detect documentation drift in Python, TypeScript, JavaScript, Go, and Rust.",
  openGraph: {
    title: "Wright AI Documentation",
    description:
      "Step-by-step guides for generating docstrings, tracking coverage, detecting drift, and serving live docs via MCP to Claude Code, Cursor, and Copilot.",
    url: "https://wrightai-web.fly.dev/docs",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
