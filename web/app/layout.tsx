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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmMono.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
