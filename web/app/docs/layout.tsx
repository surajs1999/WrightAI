import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  alternates: {
    canonical: "https://www.wrightai.live/docs",
  },
  description:
    "Complete documentation for Wright AI: install the VS Code extension, CLI, GitHub Action, and MCP server. Learn how to auto-generate docstrings, track coverage, and detect documentation drift in Python, TypeScript, JavaScript, Go, and Rust.",
  openGraph: {
    title: "Wright AI Documentation",
    description:
      "Step-by-step guides for generating docstrings, tracking coverage, detecting drift, and serving live docs via MCP to Claude Code, Cursor, and Copilot.",
    url: "https://www.wrightai.live/docs",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does my code leave my machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Wright processes your code locally. When generating a docstring, only the function signature and a small amount of surrounding context is sent to the AI model — never your full codebase. The chat and coverage features are entirely on-device.",
      },
    },
    {
      "@type": "Question",
      name: "What counts as a documented function?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A function is considered documented if it has a docstring (Python) or a JSDoc/equivalent block comment immediately preceding the function declaration (TypeScript/JavaScript/Go). Inline comments inside the function body do not count.",
      },
    },
    {
      "@type": "Question",
      name: "How is documentation coverage calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Coverage = (number of documented public functions) / (total public functions). Private functions are counted separately and not required by default. You can change this with requirePrivate: true in your config.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use Wright without a config file?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Wright detects your project language and applies sensible defaults. Run wright init . any time to generate a wright.config.json you can customize.",
      },
    },
    {
      "@type": "Question",
      name: "Does Wright AI work in monorepos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Place a wright.config.json in each package, or a single one at the root and use the include array to scope which packages are scanned. The CI action supports a paths input for the same purpose.",
      },
    },
    {
      "@type": "Question",
      name: "How do I ignore a specific function from coverage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Add a // @wright-ignore comment (TypeScript/JS) or a # wright: ignore comment (Python) on the line before the function definition. Wright will skip it entirely — no coverage penalty, no drift checks.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between the free and paid plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The VS Code extension, CLI, and MCP server are completely free. The GitHub Action PR comment feature and dashboard analytics require a Wright AI account. Coverage threshold enforcement in CI is free.",
      },
    },
  ],
};

/**
 * Renders a documentation layout wrapper that injects a JSON-LD FAQ schema script tag and renders child components.
 *
 * This Next.js layout component wraps documentation pages by embedding structured FAQ data as a JSON-LD script tag for SEO purposes, then rendering the provided children beneath it.
 *
 * @param {React.ReactNode} children - The child React elements or components to be rendered within the documentation layout.
 * @returns {JSX.Element} A React fragment containing a JSON-LD script tag with FAQ structured data followed by the rendered children.
 * @example
 * // In a Next.js app/docs/layout.tsx usage:
 * <DocsLayout>
 *   <DocsPage title="Getting Started" />
 * </DocsLayout>
 */




export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
