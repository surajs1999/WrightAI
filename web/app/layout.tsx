import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Mono, Poppins } from "next/font/google";
import "./globals.css";

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
    default: "Wright AI — AI Docstring Generator for VS Code, CLI & CI",
    template: "%s | Wright AI",
  },
  description:
    "Auto-generate docstrings for Python, TypeScript, Go & Rust. Detect doc drift. Serve live docs to Claude Code & Cursor via MCP. Free to start.",
  keywords: [
    "ai docstring generator",
    "auto generate docstrings",
    "code documentation generator",
    "documentation drift detection",
    "mcp server documentation",
    "docstring generator vscode extension",
    "document codebase with ai",
    "python docstring generator",
    "typescript docstring generator",
    "javascript documentation generator",
    "go documentation generator",
    "llms.txt generator",
    "wright ai",
    "ai code documentation",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Wright AI",
    title: "Wright AI — AI Docstring Generator for VS Code, CLI & CI",
    description:
      "Auto-generate docstrings for Python, TypeScript, Go & more. Detect documentation drift. Serve live docs to Claude Code, Cursor, and Copilot via MCP. Free to start.",
    images: [
      {
        url: "/opengraph-image",
        width: 1000,
        height: 420,
        alt: "Wright AI — AI-Powered Code Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wright AI — AI Docstring Generator",
    description:
      "Auto-generate docstrings, catch documentation drift, and give Claude Code & Cursor live access to your codebase via MCP. Free.",
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
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Wright AI",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  description:
    "AI-powered code documentation generator. Auto-generates docstrings for Python, TypeScript, JavaScript, Go, and Rust. Detects documentation drift and serves live docs via MCP to Claude Code, Cursor, and Copilot.",
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

/**
 * Renders the root HTML layout for the Next.js application, injecting JSON-LD structured data and applying global font variables.
 *
 * Serves as the top-level layout component for the Next.js App Router, wrapping all page content in a standard HTML document shell. It applies three custom font CSS variables (bricolage, dmMono, poppins) to the html element, embeds a JSON-LD structured data script in the document head for SEO purposes, and renders child components inside the body tag.
 *
 * @param {React.ReactNode} children - The nested page or layout content to be rendered inside the document body, provided automatically by the Next.js App Router.
 * @returns {JSX.Element} A full HTML document element containing a head with JSON-LD structured data and a body wrapping the provided children.
 * @example
 * // Used automatically by Next.js App Router as app/layout.tsx
 * // All pages are implicitly wrapped:
 * <RootLayout>
 *   <HomePage />
 * </RootLayout>
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmMono.variable} ${poppins.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
