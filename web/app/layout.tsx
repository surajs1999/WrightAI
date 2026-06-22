import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Mono, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-934CQXQ86Z";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = "https://www.wrightai.live";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  title: {
    default: "Wright AI — Documentation Intelligence Platform | Documentation that Never Lies",
    template: "%s | Wright AI",
  },
  description:
    "Wright AI is the Documentation Intelligence Platform. Generate documentation automatically, detect drift continuously, and give developers and AI tools a source of truth they can trust. Free to start.",
  keywords: [
    "documentation intelligence platform",
    "documentation drift detection",
    "ai code documentation tools",
    "ai code documentation tool",
    "ai docstring generator",
    "auto generate docstrings",
    "code documentation generator",
    "documentation reliability",
    "keep documentation accurate",
    "stale documentation detection",
    "documentation accuracy",
    "mcp server documentation",
    "docstring generator vscode extension",
    "document codebase with ai",
    "python docstring generator",
    "typescript docstring generator",
    "javascript documentation generator",
    "go documentation generator",
    "rust docstring generator",
    "llms.txt generator",
    "wright ai",
    "documentation that never lies",
    "ai documentation generator",
    "github action documentation",
    "documentation coverage tracking",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Wright AI",
    title: "Wright AI — Documentation Intelligence Platform",
    description:
      "Documentation that never lies. Generate docs automatically, detect drift continuously, and give Claude Code, Cursor, and Copilot a source of truth they can trust. Free to start.",
    images: [
      {
        url: "/opengraph-image",
        width: 1000,
        height: 420,
        alt: "Wright AI — Documentation Intelligence Platform | Documentation that Never Lies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wright AI — Documentation that Never Lies",
    description:
      "Generate docs automatically. Detect drift continuously. Give Claude Code & Cursor a source of truth they can trust. Free.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/**
 * Renders the root HTML layout structure with configured font variables and wraps children components.
 *
 * This is a Next.js root layout component that provides the base HTML structure with language attribute set to English and applies CSS custom properties for three font families (Bricolage, DM Mono, and Poppins) to the document root for global font usage throughout the application.
 *
 * @param {React.ReactNode} children - The child components or elements to be rendered within the body tag of the HTML document.
 * @returns {JSX.Element} A JSX element representing the complete HTML document structure with head and body sections containing the provided children.
 * @example
 * <RootLayout><HomePage /></RootLayout>
 */
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Wright AI",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  description:
    "The Documentation Intelligence Platform. Auto-generates docstrings for Python, TypeScript, JavaScript, Go, and Rust. Detects drift so documentation never lies. Serves live docs via MCP to Claude Code, Cursor, and Copilot.",
  url: SITE_URL,
  downloadUrl: "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: "Wright AI",
    url: SITE_URL,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Wright AI",
  url: SITE_URL,
  logo: `${SITE_URL}/wright-logo.svg`,
  description:
    "Wright AI is the Documentation Intelligence Platform — the AI code documentation tool that never lies. Generate docstrings, verify with drift detection, and expose your codebase to AI assistants via MCP.",
  sameAs: [
    "https://github.com/surajs1999/WrightAI",
    "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai",
    "https://pypi.org/project/wright/",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@wrightai.live",
    contactType: "customer support",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Wright AI",
  url: SITE_URL,
  description: "The Documentation Intelligence Platform — the AI code documentation tool that never lies.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/docs?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const homepageFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Wright AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wright AI is the Documentation Intelligence Platform — a tool built around the insight that documentation accuracy over time is the most important and most underserved problem in software engineering. It works across three pillars: Generate (auto-generate docstrings for Python, TypeScript, JavaScript, Go, and Rust), Verify (detect drift continuously so documentation never lies), and Understand (expose your codebase to Claude Code, Cursor, and Copilot via MCP so AI tools always have a reliable source of truth). Available as a VS Code extension, CLI, GitHub Action, and MCP server.",
      },
    },
    {
      "@type": "Question",
      name: "What is a Documentation Intelligence Platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Documentation Intelligence Platform generates, verifies, and maintains documentation as software evolves. Unlike documentation generators that only create docs once, Wright AI continuously monitors your codebase for documentation drift — when code changes make existing documentation stale, inaccurate, or misleading. Wright AI is the category creator of Documentation Intelligence.",
      },
    },
    {
      "@type": "Question",
      name: "How is Wright AI different from GitHub Copilot, Cursor, or Mintlify?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GitHub Copilot and Cursor help you write code — they are AI coding assistants with no capability to generate or verify documentation at scale. Mintlify formats documentation sites from existing content. Wright AI does something none of them do: it continuously detects when your documentation has drifted from your code, and it generates documentation across your entire codebase in batch. Wright AI is the only tool with documentation drift detection, coverage tracking, CI enforcement, and MCP integration all in one platform.",
      },
    },
    {
      "@type": "Question",
      name: "Is Wright AI free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The VS Code extension, CLI tool, and MCP server are completely free to use. Sign in at wrightai.live with GitHub or Google to get your personal API key.",
      },
    },
    {
      "@type": "Question",
      name: "What programming languages does Wright AI support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wright AI supports Python, TypeScript, JavaScript, Go, and Rust. It generates language-native documentation formats: Google/NumPy/JSDoc/epytext style docstrings for Python, JSDoc for TypeScript and JavaScript, godoc line comments for Go, and rustdoc /// comments for Rust.",
      },
    },
    {
      "@type": "Question",
      name: "How do I install Wright AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Install the VS Code extension from the VS Code Marketplace (search WrightAI), or install the CLI with: pip install wright. For the CLI, add your Anthropic API key to a .env file, then run wright init . to get started.",
      },
    },
    {
      "@type": "Question",
      name: "What is documentation drift?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Documentation drift occurs when a function's code changes — parameters renamed, return types changed — but the docstring is not updated to match. Wright AI detects drift automatically on every file save in VS Code, and the CLI command wright drift . reports all stale docstrings across your entire codebase.",
      },
    },
    {
      "@type": "Question",
      name: "Does Wright AI work with GitHub Actions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Add the Wright AI GitHub Action to your workflow to enforce documentation coverage thresholds on every pull request, auto-generate missing docstrings, or detect drift in CI. It supports coverage, generate, and drift modes.",
      },
    },
    {
      "@type": "Question",
      name: "What is the MCP server and how does it work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Wright AI MCP server exposes your codebase documentation to AI assistants (Claude Code, Cursor, Copilot) via the Model Context Protocol. Once configured in your .mcp.json, AI tools can search your docs, retrieve function documentation, and list undocumented functions — all without leaving the editor.",
      },
    },
  ],
};

/**
 * Renders the root HTML layout shell for the Next.js application, injecting global font class names and JSON-LD structured data into the document head.
 *
 * Acts as the top-level layout component for the Next.js App Router. It wraps all page content in an `<html>` element with the language set to English and CSS variable class names applied for the Bricolage, DM Mono, and Poppins fonts. A JSON-LD structured data script is injected into `<head>` for SEO purposes, and the provided child components are rendered inside `<body>`.
 *
 * @param {React.ReactNode} children - The child React nodes to be rendered inside the document body, typically representing the active page and its nested layouts.
 * @returns {JSX.Element} A JSX element representing the full HTML document structure including the `<html>`, `<head>` with JSON-LD script, and `<body>` wrapping the provided children.
 * @example
 * // Used automatically by Next.js App Router via app/layout.tsx
 * // Manual usage example:
 * <RootLayout>
 *   <main>
 *     <h1>Hello World</h1>
 *   </main>
 * </RootLayout>
 */




export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmMono.variable} ${poppins.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema) }}
        />
      </head>
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
