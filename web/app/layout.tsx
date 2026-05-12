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

export const metadata: Metadata = {
  title: "Wright AI — AI-Powered Code Documentation",
  description:
    "Wright AI automatically generates, maintains, and serves code documentation using Claude AI. Works in VS Code, CLI, GitHub Actions, and MCP.",
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmMono.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
