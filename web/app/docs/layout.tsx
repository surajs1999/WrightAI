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

/**
 * Renders a layout wrapper for the documentation section by passing children through a React fragment.
 *
 * @param {React.ReactNode} children - The child elements or components to be rendered inside the documentation layout.
 * @returns {JSX.Element} A React fragment containing the provided children, serving as the layout shell for documentation pages.
 * @example
 * <DocsLayout><DocsPage title="Getting Started" /></DocsLayout>
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
