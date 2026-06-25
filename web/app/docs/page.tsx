"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import NavbarV2 from "@/components/landing-v2/NavbarV2";
import FooterV2 from "@/components/landing-v2/FooterV2";
import { ga } from "@/lib/ga";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

// ─── Sidebar nav tree ────────────────────────────────────────────────────────

const NAV: NavItem[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    children: [
      { id: "what-is-wright", label: "What is Wright AI?" },
      { id: "quick-start", label: "Quick Start" },
      { id: "prerequisites", label: "Prerequisites" },
    ],
  },
  {
    id: "installation",
    label: "Installation",
    children: [
      { id: "vscode", label: "VS Code Extension" },
      { id: "cli", label: "Command Line" },
      { id: "github-action", label: "GitHub Action" },
      { id: "mcp-install", label: "MCP Server" },
    ],
  },
  {
    id: "features",
    label: "Core Features",
    children: [
      { id: "generate", label: "Generate" },
      { id: "coverage", label: "Coverage" },
      { id: "drift", label: "Drift Detection" },
      { id: "chat", label: "Chat" },
      { id: "llmstxt", label: "llms.txt" },
    ],
  },
  {
    id: "ci",
    label: "CI / GitHub Actions",
  },
  {
    id: "mcp-reference",
    label: "MCP Server Reference",
  },
  {
    id: "configuration",
    label: "Configuration",
  },
  {
    id: "faq",
    label: "FAQ",
  },
];

// ─── Copy button ─────────────────────────────────────────────────────────────

/**
 * Renders a clipboard copy button that visually confirms a successful copy for 2 seconds before resetting.
 *
 * A React functional component that displays a styled button. When clicked, it writes the provided text to the user's clipboard using the Clipboard API, transitions to a 'copied' visual state with a checkmark icon and green styling, and automatically reverts to the default 'copy' state after 2000 milliseconds.
 *
 * @param {string} text - The string content to be written to the clipboard when the button is clicked.
 * @returns {JSX.Element} A styled <button> element that toggles between 'copy' and 'copied' states based on clipboard interaction.
 * @example
 * <CopyButton text="npm install wright" />
 */




function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        background: copied ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(29,158,117,0.35)" : "rgba(175,169,236,0.12)"}`,
        borderRadius: 6,
        color: copied ? "#1D9E75" : "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        padding: "4px 11px",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
          copied
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          copy
        </>
      )}
    </button>
  );
}

// ─── Code block ──────────────────────────────────────────────────────────────

 /**
 * Renders a styled code block UI component with a macOS-style header bar, optional filename or language label, a copy button, and syntax-aware line coloring.
 *
 * Displays multi-line code in a dark-themed container. The header shows three decorative traffic-light dots alongside either the provided filename or the language identifier (uppercased). Lines beginning with '#' or '//' are rendered in a dimmed color to simulate comment styling. Each line is mapped to its own div to preserve whitespace formatting, and empty lines are rendered with a non-breaking space to maintain line height. A CopyButton component is included in the header for clipboard access.
 *
 * @param {string} code - The raw source code string to display inside the block. Newlines are split into individual rendered lines.
 * @param {string} lang - The programming language or shell identifier shown in the header when no filename is provided. Defaults to 'bash'.
 * @param {string | undefined} filename - Optional filename displayed in the header instead of the language label. When provided, the language label is hidden.
 * @returns {JSX.Element} A React JSX element representing the fully styled code block container with header and code body.
 * @example
 * <CodeBlock code={`npm install wright\n# installs the package`} lang="bash" filename="terminal.sh" />
 */




function CodeBlock({ code, lang = "bash", filename }: { code: string; lang?: string; filename?: string }) {
  return (
    <div style={{
      background: "#07051a",
      border: "1px solid rgba(175,169,236,0.1)",
      borderRadius: 12,
      overflow: "hidden",
      margin: "20px 0",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid rgba(175,169,236,0.07)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
          {filename && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.4)", marginLeft: 6 }}>
              {filename}
            </span>
          )}
          {!filename && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.3)", marginLeft: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {lang}
            </span>
          )}
        </div>
        <CopyButton text={code} />
      </div>
      <div style={{ padding: "18px 20px", overflowX: "auto" }}>
        {code.split("\n").map((line, i) => (
          <div key={i} style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13.5,
            color: line.startsWith("#") || line.startsWith("//") ? "rgba(175,169,236,0.4)" : "var(--text-code)",
            lineHeight: "1.85",
            whiteSpace: "pre",
          }}>
            {line || "\u00A0"}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline code ─────────────────────────────────────────────────────────────

  /**
 * Renders inline code snippets with a styled monospace font and a subtle purple-tinted background.
 *
 * @param {React.ReactNode} children - The content to be displayed inside the styled <code> element, typically a string or inline text.
 * @returns {JSX.Element} A <code> HTML element styled with a monospace font, purple accent color, semi-transparent background, and rounded border.
 * @example
 * <Code>npm install wright</Code>
 */




function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: "var(--font-mono)",
      fontSize: "0.875em",
      color: "#AFA9EC",
      background: "rgba(175,169,236,0.1)",
      border: "1px solid rgba(175,169,236,0.12)",
      borderRadius: 5,
      padding: "2px 7px",
    }}>
      {children}
    </code>
  );
}

// ─── Callout ─────────────────────────────────────────────────────────────────

          /**
 * Renders a styled callout box with a type-specific icon, border color, and background for displaying informational, tip, or warning messages.
 *
 * A React functional component that maps a callout type ('info', 'tip', or 'warning') to a corresponding visual style set (background color, border color, accent color, and icon). It renders a flex container with a left-accented border and an icon beside the provided children content, suitable for documentation or instructional UI.
 *
 * @param {'info' | 'tip' | 'warning'} type - Determines the visual style and icon of the callout. Defaults to 'info' if not provided.
 * @param {React.ReactNode} children - The content to display inside the callout box, rendered beside the type icon.
 * @returns {JSX.Element} A styled div element containing a type-specific icon and the provided children content.
 * @example
 * <Callout type="warning">Be careful when modifying this configuration in production.</Callout>
 */




function Callout({ type = "info", children }: { type?: "info" | "tip" | "warning"; children: React.ReactNode }) {
  const styles = {
    info:    { bg: "rgba(0,212,255,0.05)",    border: "rgba(0,212,255,0.2)",    icon: "ℹ", color: "#00D4FF" },
    tip:     { bg: "rgba(29,158,117,0.06)",   border: "rgba(29,158,117,0.22)",  icon: "✦", color: "#1D9E75" },
    warning: { bg: "rgba(239,159,39,0.07)",   border: "rgba(239,159,39,0.25)",  icon: "⚠", color: "#EF9F27" },
  }[type];

  return (
    <div style={{
      background: styles.bg,
      border: `1px solid ${styles.border}`,
      borderLeft: `3px solid ${styles.color}`,
      borderRadius: "0 10px 10px 0",
      padding: "14px 18px",
      margin: "20px 0",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
    }}>
      <span style={{ color: styles.color, fontSize: 15, flexShrink: 0, marginTop: 1 }}>{styles.icon}</span>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Step ────────────────────────────────────────────────────────────────────

                  /**
 * Renders a numbered step component with a styled circular badge, title, and descriptive content for use in documentation pages.
 *
 * A React functional component that displays a single instructional step in a visually structured layout. It renders a circular numbered badge on the left using a monospace font and a purple-tinted style, alongside a bold title and body content area that accepts arbitrary React children. Intended for use in sequential, step-by-step documentation or onboarding guides.
 *
 * @param {number} n - The step number displayed inside the circular badge on the left side of the component.
 * @param {string} title - The bold heading text displayed at the top of the step's content area.
 * @param {React.ReactNode} children - The descriptive body content rendered below the title; accepts any valid React renderable node.
 * @returns {JSX.Element} A styled React div element containing a numbered badge, a step title, and the provided children as body content.
 * @example
 * <Step n={1} title="Install dependencies">
 *   Run <code>npm install</code> in your project root.
 * </Step>
 */




function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 18, margin: "24px 0" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "rgba(83,74,183,0.18)",
        border: "1px solid rgba(127,119,221,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "#AFA9EC",
        marginTop: 2,
      }}>
        {n}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.75 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

 /**
 * Renders a styled section heading component with an anchor id, an eyebrow label, a title, and a decorative divider.
 *
 * Used in documentation pages to visually separate and label major sections. The component applies CSS custom properties for typography and color, and exposes an `id` attribute to support in-page anchor navigation.
 *
 * @param {string} id - The HTML `id` attribute applied to the wrapper `<div>`, enabling anchor-based navigation to this section.
 * @param {string} eyebrow - A short uppercase label rendered above the main title using a monospace font and cyan accent color.
 * @param {string} title - The primary heading text rendered as an `<h2>` element with bold weight and tight letter-spacing.
 * @returns {JSX.Element} A React `<div>` element containing a styled eyebrow paragraph, an `<h2>` heading, and a thin horizontal rule.
 * @example
 * <SectionHeading id="getting-started" eyebrow="Introduction" title="Getting Started with Wright" />
 */



function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div id={id} style={{ paddingTop: 80, marginBottom: 32 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
        {eyebrow}
      </p>
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 30, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
        {title}
      </h2>
      <div style={{ height: 1, background: "rgba(175,169,236,0.08)", marginTop: 24 }} />
    </div>
  );
}

 /**
 * Renders a styled third-level heading element with an anchor ID for in-page navigation.
 *
 * A React functional component that outputs an <h3> element with a predefined visual style using CSS custom properties for font family, color, and spacing. The `id` prop enables deep-linking and table-of-contents navigation within a documentation page.
 *
 * @param {string} id - The HTML `id` attribute applied to the <h3> element, used for anchor-based navigation.
 * @param {string} title - The visible text content rendered inside the <h3> heading element.
 * @returns {JSX.Element} A styled <h3> React element with the given id and title text.
 * @example
 * <SubHeading id="installation" title="Installation" />
 */


function SubHeading({ id, title }: { id: string; title: string }) {
  return (
    <h3 id={id} style={{
      fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20,
      color: "var(--text)", letterSpacing: "-0.02em",
      paddingTop: 48, marginBottom: 14,
    }}>
      {title}
    </h3>
  );
}

 /**
 * Renders a styled paragraph element with predefined typography settings for documentation body text.
 *
 * A React functional component that wraps its children in a <p> element styled with CSS custom properties for font family, muted text color, and relaxed line height, intended for use in documentation pages.
 *
 * @param {React.ReactNode} children - The content to be rendered inside the paragraph element, which can be any valid React node such as strings, elements, or fragments.
 * @returns {JSX.Element} A <p> element styled with body font family, 15px font size, muted text color, 1.8 line height, and 12px vertical margins containing the provided children.
 * @example
 * <P>This is a documentation paragraph explaining a concept in detail.</P>
 */


function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.8, margin: "12px 0" }}>
      {children}
    </p>
  );
}

   /**
 * Renders a styled unordered list component with a custom bullet character and consistent typography for each item.
 *
 * UL is a React functional component that accepts an array of ReactNode items and renders them as a vertically stacked unordered list. Each list item is preceded by a purple '›' chevron bullet and displayed using the application's body font with muted text color. The component is intended for use in documentation pages to present information in a visually consistent list format.
 *
 * @param {React.ReactNode[]} items - An array of React nodes (strings, elements, or other renderable content) to be displayed as individual list items.
 * @returns {JSX.Element} A styled <ul> element containing one <li> per item, each with a decorative chevron bullet and formatted text span.
 * @example
 * <UL items={['Install dependencies with npm install', 'Run the dev server with npm run dev', <span key="link">See the <a href="/docs">documentation</a> for more</span>]} />
 */



function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: "12px 0 12px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: "#534AB7", fontSize: 18, lineHeight: "1.4", flexShrink: 0 }}>›</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.7 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

      /**
 * Renders a styled HTML table component with a header row and multiple data rows from provided headers and row content arrays.
 *
 * A React functional component that produces a horizontally scrollable, fully-styled table. Column headers are rendered in uppercase monospace font with subtle styling, while body cells use a body font with muted color and comfortable padding. Accepts arbitrary React nodes as cell content, making it flexible for both plain text and rich UI elements. Used by generate, coverage, and drift documentation sections to display structured information.
 *
 * @param {string[]} headers - An array of string labels rendered as uppercase column header cells in the table's thead row.
 * @param {React.ReactNode[][]} rows - A two-dimensional array where each inner array represents a table row, and each element within that array is a React node rendered as an individual table cell (td).
 * @returns {JSX.Element} A JSX element consisting of a horizontally scrollable div containing a fully styled HTML table with a thead and tbody populated from the provided headers and rows.
 * @example
 * <Table
 *   headers={["Name", "Type", "Description"]}
 *   rows={[
 *     ["limit", <code>number</code>, "Maximum number of results to return."],
 *     ["offset", <code>number</code>, "Number of results to skip before returning."]
 *   ]}
 * />
 */




function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto", margin: "20px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.5)",
                textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "10px 16px", textAlign: "left",
                borderBottom: "1px solid rgba(175,169,236,0.1)",
                background: "rgba(255,255,255,0.02)",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(175,169,236,0.05)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)",
                  padding: "12px 16px", lineHeight: 1.6,
                  verticalAlign: "top",
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Renders the main documentation page with a sticky navigation sidebar, scrollable content sections, and automatic active section tracking via IntersectionObserver.
 *
 * A React component that displays comprehensive product documentation with a fixed header, left sidebar navigation, main content area, and right table of contents. Automatically highlights the active section in the navigation based on scroll position using IntersectionObserver with custom root margins to trigger when sections enter the viewport.
 * @returns {JSX.Element} A complete documentation page layout with header, navigation, content sections covering Getting Started, Installation, Core Features, CI/GitHub Actions, MCP Server Reference, Configuration, and FAQ.
 * @example
 * <DocsPage />
 */
export default function DocsPage() {
  const [activeId, setActiveId] = useState("what-is-wright");
  const contentRef = useRef<HTMLDivElement>(null);

  // Track active section + fire docs_section_read via IntersectionObserver
  useEffect(() => {
    const allIds = NAV.flatMap(n => n.children ? n.children.map(c => c.id) : [n.id]);
    const fired = new Set<string>();
    const observers: IntersectionObserver[] = [];

    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
            if (!fired.has(id)) {
              fired.add(id);
              const label = NAV.flatMap(n => n.children ? n.children : [n]).find(n => n.id === id)?.label ?? id;
              ga.docsSectionRead(label);
            }
          }
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative" }}>
      {/* Background */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "40vh", background: "radial-gradient(ellipse at 50% 0%, rgba(83,74,183,0.18) 0%, rgba(0,212,255,0.05) 50%, transparent 75%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(175,169,236,0.05) 1px, transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Navbar ── */}
      <NavbarV2 />

      {/* ── Layout ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "72px 24px 0", display: "flex", gap: 0 }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 240, flexShrink: 0,
          position: "sticky", top: 72,
          height: "calc(100vh - 72px)",
          overflowY: "auto",
          padding: "32px 0 48px",
          borderRight: "1px solid rgba(175,169,236,0.06)",
        }}>
          {NAV.map(section => (
            <div key={section.id} style={{ marginBottom: 8 }}>
              <a
                href={`#${section.children ? section.children[0].id : section.id}`}
                style={{
                  display: "block",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 12.5,
                  color: "rgba(175,169,236,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "6px 20px",
                  textDecoration: "none",
                  marginTop: 16,
                }}
              >
                {section.label}
              </a>
              {section.children && section.children.map(child => {
                const isActive = activeId === child.id;
                return (
                  <a
                    key={child.id}
                    href={`#${child.id}`}
                    style={{
                      display: "block",
                      fontFamily: "var(--font-body)",
                      fontSize: 13.5,
                      color: isActive ? "#AFA9EC" : "var(--text-muted)",
                      padding: "6px 20px 6px 28px",
                      textDecoration: "none",
                      borderLeft: isActive ? "2px solid #534AB7" : "2px solid transparent",
                      transition: "all 0.15s",
                      background: isActive ? "rgba(83,74,183,0.07)" : "transparent",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                  >
                    {child.label}
                  </a>
                );
              })}
              {!section.children && (
                <a
                  href={`#${section.id}`}
                  style={{
                    display: "block",
                    fontFamily: "var(--font-body)",
                    fontSize: 13.5,
                    color: activeId === section.id ? "#AFA9EC" : "var(--text-muted)",
                    padding: "6px 20px",
                    textDecoration: "none",
                    borderLeft: activeId === section.id ? "2px solid #534AB7" : "2px solid transparent",
                    transition: "all 0.15s",
                    background: activeId === section.id ? "rgba(83,74,183,0.07)" : "transparent",
                  }}
                >
                  {section.label}
                </a>
              )}
            </div>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main ref={contentRef} style={{ flex: 1, minWidth: 0, padding: "0 48px 120px 56px", maxWidth: 780 }}>

          {/* Hero */}
          <div style={{ paddingTop: 48, paddingBottom: 16 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.22)", marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D4FF", boxShadow: "0 0 8px #00D4FF", display: "block", animation: "pulse-soft 0.8s ease-in-out infinite" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#00D4FF", letterSpacing: "0.06em", textTransform: "uppercase" }}>v1.0 · Wright AI Docs</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(34px, 4vw, 52px)", letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 18 }}>
              <span style={{ background: "linear-gradient(135deg, #F0EEF8 0%, #7F77DD 50%, #00D4FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Documentation
              </span>
              {" "}Intelligence.
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, marginBottom: 0 }}>
              Everything you need to generate, track, and maintain documentation across your entire codebase — automatically.
            </p>
          </div>

          {/* ─────────────────────────────────────────────
              GETTING STARTED
          ───────────────────────────────────────────── */}
          <SectionHeading id="getting-started" eyebrow="01 · Getting Started" title="Getting Started" />

          <SubHeading id="what-is-wright" title="What is Wright AI?" />
          <P>
            Wright AI is a documentation engine for codebases. It reads your functions, understands their callers and callees, and writes complete docstrings in your team&apos;s chosen style. Once installed, it also watches for <strong style={{ color: "var(--text)" }}>drift</strong> — when your code changes but the docs don&apos;t — and surfaces those gaps before they reach production.
          </P>
          <P>
            The core problem Wright solves: teams write documentation once, then the code drifts away from it over months of iteration. Wright makes documentation a living part of your workflow rather than a one-time chore.
          </P>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, margin: "28px 0" }}>
            {[
              { color: "#7F77DD", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, label: "Generate", desc: "One command for your entire repo" },
              { color: "#1D9E75", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: "Coverage", desc: "Know exactly what's undocumented" },
              { color: "#EF9F27", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, label: "Drift", desc: "Catch stale docs before they merge" },
              { color: "#00D4FF", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: "Chat", desc: "Ask questions, get sourced answers" },
              { color: "#7F77DD", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>, label: "MCP", desc: "Live docs for Claude Code & Cursor" },
              { color: "#1D9E75", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: "llms.txt", desc: "Machine-readable index for any LLM" },
            ].map(f => (
              <div key={f.label} style={{
                padding: "18px 16px", borderRadius: 12,
                background: "var(--surface)", border: "1px solid var(--border)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${f.color}40`; el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.25)`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <SubHeading id="quick-start" title="Quick Start" />
          <P>Get up and running in under 5 minutes with the VS Code extension.</P>

          <Step n={1} title="Install the VS Code Extension">
            Open the VS Code Marketplace and search for <strong style={{ color: "var(--text)" }}>Wright AI</strong>, or click{" "}
            <a href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai" target="_blank" rel="noopener noreferrer" style={{ color: "#00D4FF" }}>
              Install from Marketplace
            </a>. It&apos;s free.
          </Step>

          <Step n={2} title="Open any file with functions">
            Open a TypeScript, JavaScript, or Python file. Wright automatically scans for undocumented functions and shows a <Code>Generate Docs</Code> lens above each one.
          </Step>

          <Step n={3} title="Click Generate Docs">
            A diff preview opens on the right. Review the generated docstring, then accept or discard. Nothing is written until you accept.
          </Step>

          <Step n={4} title="Done">
            The docstring is inserted. Wright tracks coverage for this file — open the sidebar panel to see your overall coverage score.
          </Step>

          <Callout type="tip">
            You can also generate docs for an entire directory at once from the command palette: <Code>Wright: Generate Docs for Folder</Code>.
          </Callout>

          <SubHeading id="prerequisites" title="Prerequisites" />
          <P>Before installing Wright AI, make sure your environment meets these requirements:</P>

          <Table
            headers={["Requirement", "Version", "Notes"]}
            rows={[
              [<Code key="node">Node.js</Code>, "≥ 18", "Required for the VS Code extension and CLI"],
              [<Code key="python">Python</Code>, "≥ 3.9", "Required if using the CLI on Python projects"],
              [<Code key="vscode">VS Code</Code>, "≥ 1.85", "For the VS Code extension"],
              ["Git", "any", "Required for drift detection"],
            ]}
          />

          <P>Supported languages for documentation generation:</P>
          <UL items={[
            <><strong style={{ color: "var(--text)" }}>TypeScript / JavaScript</strong> — JSDoc style</>,
            <><strong style={{ color: "var(--text)" }}>Python</strong> — Google, NumPy, or Sphinx style</>,
            <><strong style={{ color: "var(--text)" }}>Java</strong> — Javadoc style</>,
            <><strong style={{ color: "var(--text)" }}>Go</strong> — godoc style</>,
            <><strong style={{ color: "var(--text)" }}>Rust</strong> — rustdoc style</>,
          ]} />

          {/* ─────────────────────────────────────────────
              INSTALLATION
          ───────────────────────────────────────────── */}
          <SectionHeading id="installation" eyebrow="02 · Installation" title="Installation" />

          <SubHeading id="vscode" title="VS Code Extension" />
          <P>The easiest way to get started. Install from the Marketplace — no config files, no terminal required.</P>

          <Step n={1} title="Install from Marketplace">
            Search <strong style={{ color: "var(--text)" }}>Wright AI</strong> in the VS Code Extensions panel, or visit the Marketplace directly.
          </Step>

          <Step n={2} title="Sign in to Wright AI">
            After install, a prompt appears in the bottom status bar. Click <strong style={{ color: "var(--text)" }}>Sign in to Wright</strong> and authenticate with your account.
          </Step>

          <Step n={3} title="That's it">
            Wright automatically activates for any supported file type. Look for the <Code>Generate Docs ↑</Code> lens that appears above each undocumented function.
          </Step>

          <Callout type="info">
            Doc generation, chat, and drift checks are handled by the hosted Wright AI backend. Only the function signature and surrounding context is sent — never your full codebase. Drift results are cached locally in SQLite so unchanged functions are never re-sent.
          </Callout>

          <SubHeading id="cli" title="Command Line" />
          <P>The CLI gives you full control: batch generation, coverage reports, drift checks, and codebase chat — all from your terminal.</P>

          <CodeBlock lang="bash" code={`pip install wright`} />

          <P>Initialize Wright in your project:</P>
          <CodeBlock lang="bash" code={`wright init .`} />

          <P>This creates a <Code>wright.config.json</Code> at the root of your project with sensible defaults. Then run your first generation:</P>

          <CodeBlock lang="bash" code={`# Generate docs for a single directory
wright generate src/

# Generate docs for the entire project
wright generate .

# Preview without writing (dry run)
wright generate src/ --dry-run`} />

          <SubHeading id="github-action" title="GitHub Action" />
          <P>Add Wright to your CI pipeline to block PRs that drop documentation coverage or introduce drift.</P>

          <CodeBlock
            filename=".github/workflows/wright.yml"
            lang="yaml"
            code={`name: Wright AI — Documentation Check

on:
  pull_request:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check documentation coverage & drift
        uses: surajs1999/WrightAI@v1
        with:
          mode: coverage
          threshold: "0.8"        # fail if coverage drops below 80%
          check_drift: "true"     # also block on stale docstrings
        env:
          WRIGHT_TOKEN: \${{ secrets.WRIGHT_TOKEN }}`}
          />

          <Callout type="warning">
            Store your Wright token in GitHub Secrets as <Code>WRIGHT_TOKEN</Code>. Never commit it directly to your workflow file.
          </Callout>

          <SubHeading id="mcp-install" title="MCP Server" />
          <P>Expose your indexed docs to any MCP-compatible AI tool — Claude Code, Cursor, GitHub Copilot — with one command.</P>

          <CodeBlock lang="bash" code={`# Install the MCP server
pip install wright-mcp

# Start it (stays running in the background)
wright-mcp`} />

          <P>Then add it to your MCP client config:</P>

          <CodeBlock
            filename="claude_code_config.json"
            lang="json"
            code={`{
  "mcpServers": {
    "wright": {
      "command": "wright-mcp"
    }
  }
}`}
          />

          {/* ─────────────────────────────────────────────
              CORE FEATURES
          ───────────────────────────────────────────── */}
          <SectionHeading id="features" eyebrow="03 · Core Features" title="Core Features" />

          <SubHeading id="generate" title="Generate" />
          <P>
            Wright reads each function&apos;s signature, body, callers, and callees to generate a complete, accurate docstring. It doesn&apos;t just describe the function body — it understands what the function is used for.
          </P>

          <CodeBlock lang="bash" code={`# Generate for a specific file
wright generate src/payments/core.ts

# Generate for a directory (recursive)
wright generate src/

# Choose a doc style
wright generate src/ --style google    # or jsdoc, numpy, sphinx

# Preview diff without writing
wright generate src/ --dry-run`} />

          <P>Supported doc styles:</P>
          <Table
            headers={["Style", "Languages", "Example"]}
            rows={[
              ["JSDoc", "TypeScript, JavaScript", <Code key="jsdoc">@param name {`{string}`} - Description</Code>],
              ["Google", "Python", <Code key="google">Args:\n  name (str): Description</Code>],
              ["NumPy", "Python", <Code key="numpy">Parameters\n----------\nname : str</Code>],
              ["Sphinx", "Python", <Code key="sphinx">:param name: Description\n:type name: str</Code>],
              ["godoc", "Go", "Plain prose, first sentence is the summary"],
            ]}
          />

          <Callout type="tip">
            Set your preferred style once in <Code>wright.config.json</Code> under <Code>docStyle</Code> so you never need to pass the flag.
          </Callout>

          <SubHeading id="coverage" title="Coverage" />
          <P>
            Coverage tracks what percentage of your functions have documentation. Run a report at any time, or let the GitHub Action enforce a minimum threshold in CI.
          </P>

          <CodeBlock lang="bash" code={`# Full coverage report
wright coverage .

# Output as JSON (useful for CI scripts)
wright coverage . --output coverage.json`} />

          <P>The report shows total functions, documented count, and undocumented count — broken down by folder and file so you know exactly where the gaps are.</P>

          <P>
            In VS Code, the <strong style={{ color: "var(--text)" }}>Wright Coverage</strong> panel in the Explorer sidebar shows live metrics including coverage %, documented count, undocumented count, and <strong style={{ color: "var(--text)" }}>drifted count</strong>. The panel refreshes automatically every time you save a file or accept a docstring injection.
          </P>

          <Callout type="info">
            Coverage counts functions, methods, and exported constants. Private helpers (prefixed with <Code>_</Code> in Python, or declared with no <Code>export</Code> in TS) are tracked but not required by default. Configure this via <Code>requirePrivate: true</Code> in your config.
          </Callout>

          <SubHeading id="drift" title="Drift Detection" />
          <P>
            Drift happens when your code changes but the docstring doesn&apos;t — leaving readers with documentation that contradicts the actual implementation. Wright detects two categories of drift automatically.
          </P>

          <P><strong style={{ color: "var(--text)" }}>Structural drift</strong> — caught with zero LLM cost:</P>
          <UL items={[
            "A parameter is added, removed, or renamed",
            "The return type changes between two concrete types (e.g. str → dict, list → list[str])",
          ]} />

          <P><strong style={{ color: "var(--text)" }}>Semantic drift</strong> — caught by a fast LLM pass (claude-haiku):</P>
          <UL items={[
            "The function body changes in a way that makes the docstring factually wrong, even if the signature is identical",
            "Results are cached in SQLite keyed by source + docstring hash — unchanged functions are never re-checked",
          ]} />

          <P>
            Vague type changes (e.g. <Code>None → str</Code> or adding a return type where there was none) are intentionally ignored for structural drift — they rarely invalidate existing docs.
          </P>

          <CodeBlock lang="bash" code={`# Check for drift across the whole project
wright drift .

# Output summary:
# Checked: 222  Drifted: 3  Undocumented: 1  Up to date: 218

# Re-generate stale docstrings only (skips undocumented functions)
wright drift . --fix

# Write a JSON report
wright drift . --output report.json`} />

          <Callout type="info"><><Code>--fix</Code> only updates functions whose signatures drifted. To add docs to undocumented functions, use <Code>wright generate</Code>.</></Callout>

          <P>
            In VS Code, drift appears as a gutter <Code>⚠</Code> icon next to the function and as an inline CodeLens. The <strong style={{ color: "var(--text)" }}>Coverage panel</strong> in the Explorer sidebar shows a live drifted count that refreshes automatically on every file save.
          </P>

          <SubHeading id="chat" title="Chat" />
          <P>
            Ask questions about your codebase in plain English. Wright indexes all your documented functions and returns answers with exact file and line citations — no hallucination, no guessing.
          </P>

          <CodeBlock lang="bash" code={`wright chat`} />

          <P>Example session:</P>

          <div style={{
            background: "#07051a", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 12,
            overflow: "hidden", margin: "20px 0",
          }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(175,169,236,0.07)", background: "rgba(255,255,255,0.02)", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.4)" }}>
              ~/project ❯ wright chat
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { role: "user", text: "How does the payment flow handle retries?" },
                { role: "wright", text: "retryWithBackoff() in payments/retry.ts handles it — exponential backoff, max 3 attempts, then throws PaymentError.", sources: ["payments/retry.ts:22", "payments/core.ts:67"] },
                { role: "user", text: "Where is JWT token validation done?" },
                { role: "wright", text: "validateToken() in auth/middleware.ts:14 — verifies signature and expiry, returns decoded User.", sources: ["auth/middleware.ts:14"] },
              ].map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: msg.role === "user" ? "rgba(83,74,183,0.35)" : "rgba(29,158,117,0.2)",
                    border: `1px solid ${msg.role === "user" ? "rgba(83,74,183,0.4)" : "rgba(29,158,117,0.35)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: msg.role === "user" ? "#AFA9EC" : "#1D9E75" }}>
                      {msg.role === "user" ? "$" : "W"}
                    </span>
                  </div>
                  <div style={{
                    background: msg.role === "user" ? "rgba(255,255,255,0.035)" : "rgba(29,158,117,0.05)",
                    border: `1px solid ${msg.role === "user" ? "rgba(175,169,236,0.1)" : "rgba(29,158,117,0.15)"}`,
                    borderRadius: msg.role === "user" ? "10px 10px 10px 3px" : "10px 10px 3px 10px",
                    padding: "9px 13px", flex: 1,
                  }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: msg.role === "user" ? "var(--text-muted)" : "var(--text)", lineHeight: 1.6 }}>
                      {msg.text}
                    </p>
                    {(msg as any).sources && (
                      <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                        {(msg as any).sources.map((s: string) => (
                          <span key={s} style={{ padding: "3px 8px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)" }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Callout type="info">
            Chat answers are generated by the hosted Wright AI backend. Your codebase is indexed locally; only the relevant function summaries and your question are sent — never the full source.
          </Callout>

          <SubHeading id="llmstxt" title="llms.txt" />
          <P>
            Wright generates an <Code>llms.txt</Code> file — a structured, token-efficient index of every function in your codebase, following the open{" "}
            <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer" style={{ color: "#00D4FF" }}>llms.txt standard</a>. Paste it into any AI assistant or feed it to an agent and it instantly understands your entire project — signatures, docstrings, and file layout — without reading every source file.
          </P>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, margin: "20px 0" }}>
            {[
              { icon: "⚡", label: "One command", desc: "Scan and index the whole repo in seconds" },
              { icon: "🤖", label: "Any LLM", desc: "Works with Claude, GPT-4o, Gemini, local models" },
              { icon: "📡", label: "Live endpoint", desc: "Serve it over HTTP so agents always fetch fresh docs" },
            ].map(f => (
              <div key={f.label} style={{
                padding: "16px 14px", borderRadius: 10,
                background: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "var(--text)", marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text-muted)" }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <P>Generate it from the CLI or via the API:</P>

          <CodeBlock lang="bash" code={`# Generate llms.txt at your project root
wright llms-txt

# Write to a custom path
wright llms-txt --output docs/llms.txt

# Serve as a live HTTP endpoint (auto-refreshes on file changes)
wright llms-txt --serve
# → Listening on http://localhost:4242/llms.txt`} />

          <P>The generated file format — one heading per file, one entry per function:</P>

          <CodeBlock
            filename="llms.txt"
            lang="markdown"
            code={`# my-project

> Auto-generated llms.txt for my-project. Provides codebase context for AI tools.

## payments/core.ts

### \`processPayment(amount, card) -> PaymentResult\`
Process a payment transaction with retry logic and idempotency.

### \`validateCard(card) -> boolean\`
Validate card details against Luhn algorithm. Throws InvalidCardError.

## auth/middleware.ts

### \`authenticate(token) -> User\`
Verify JWT signature and expiry, return decoded User or throw 401.

### \`refreshToken(token) -> string\`
Issue a new token if within the refresh window, otherwise throw.`}
          />

          <P>How teams use it:</P>

          <Table
            headers={["Workflow", "How"]}
            rows={[
              ["Paste into Claude / ChatGPT", <>Copy <Code>llms.txt</Code>, paste at the top of a new chat, then ask anything about your codebase.</>],
              ["Feed to a Cursor agent", <>Add the file path in Cursor's context panel — the agent reads it before answering.</>],
              ["GitHub Actions artifact", <>Run <Code>wright llms-txt</Code> in CI and upload as a build artifact. Always stays current with main.</>],
              ["Hosted endpoint", <>Run <Code>wright llms-txt --serve</Code> locally or in a staging environment. Point agents at the URL.</>],
            ]}
          />

          <Callout type="tip">
            Commit <Code>llms.txt</Code> alongside your code. Reviewers and AI tools both benefit from it, and drift detection will flag it when the index is out of date.
          </Callout>

          <Callout type="info">
            The <Code>llms.txt</Code> standard is open and model-agnostic. Wright&apos;s output is compatible with any tool that supports it — you are not locked in to Wright&apos;s own AI features.
          </Callout>

          {/* ─────────────────────────────────────────────
              CI / GITHUB ACTIONS
          ───────────────────────────────────────────── */}
          <SectionHeading id="ci" eyebrow="04 · CI" title="CI / GitHub Actions" />

          <P>
            Wright&apos;s GitHub Action integrates into your existing workflow in one step. It can enforce a coverage threshold, block on drift, and post a summary comment on each PR.
          </P>

          <CodeBlock
            filename=".github/workflows/wright.yml"
            lang="yaml"
            code={`name: Wright AI — Documentation Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  docs:
    name: Documentation Quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed for drift comparison

      - name: Wright AI — Coverage + Drift
        uses: surajs1999/WrightAI@v1
        with:
          # Fail if doc coverage drops below this (0.0 – 1.0)
          threshold: "0.8"

          # Block merge if any doc drift is detected
          check_drift: "true"

          # Post a coverage summary comment on the PR
          post_comment: "true"

          # Only scan these paths (optional)
          # paths: "src/ lib/"
        env:
          WRIGHT_TOKEN: \${{ secrets.WRIGHT_TOKEN }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`}
          />

          <P>Available action inputs:</P>
          <Table
            headers={["Input", "Default", "Description"]}
            rows={[
              [<Code key="threshold">threshold</Code>, <Code key="t08">"0.8"</Code>, "Minimum coverage ratio (0.0–1.0). CI fails if coverage drops below this on the PR."],
              [<Code key="drift">check_drift</Code>, <Code key="dtrue">"true"</Code>, "Fail CI if any documented function has drifted from its implementation."],
              [<Code key="comment">post_comment</Code>, <Code key="ctrue">"true"</Code>, "Post a coverage + drift summary as a PR comment."],
              [<Code key="paths">paths</Code>, <Code key="dot">"."</Code>, "Space-separated list of paths to scan. Defaults to entire repo."],
              [<Code key="style">style</Code>, <Code key="auto">"auto"</Code>, "Doc style override. One of: jsdoc, google, numpy, sphinx."],
            ]}
          />

          <Callout type="tip">
            Set <Code>threshold: "0"</Code> and <Code>check_drift: "true"</Code> to start with drift-only enforcement — a lower bar for teams adopting Wright incrementally.
          </Callout>

          {/* ─────────────────────────────────────────────
              MCP SERVER REFERENCE
          ───────────────────────────────────────────── */}
          <SectionHeading id="mcp-reference" eyebrow="05 · MCP" title="MCP Server Reference" />

          <P>
            Wright&apos;s MCP server exposes your indexed documentation as tools that any MCP-compatible AI assistant can call. The server starts on <Code>stdio</Code> and re-indexes automatically when you save files.
          </P>

          <CodeBlock lang="bash" code={`# Start the server
wright-mcp

# ✓ MCP server started on stdio
# ✓ Indexed 847 functions across 12 files
# → Tool registered: search_docs
# → Tool registered: get_function_doc
# → Tool registered: list_undocumented
# ◌ Watching for file changes...`} />

          <P>Available tools:</P>

          <Table
            headers={["Tool", "Description", "Parameters"]}
            rows={[
              [
                <Code key="search">search_docs</Code>,
                "Semantic search over your documented functions. Returns the top matching docs with file + line citations.",
                <><Code key="q">query: string</Code> — natural language question</>,
              ],
              [
                <Code key="getfn">get_function_doc</Code>,
                "Retrieve the full docstring and signature for a specific function by name.",
                <><Code key="fn">function_name: string</Code></>,
              ],
              [
                <Code key="list">list_undocumented</Code>,
                "List all functions that are missing documentation, optionally filtered by path.",
                <><Code key="path">path?: string</Code> — optional path prefix</>,
              ],
            ]}
          />

          <P>Config for each supported client:</P>

          <CodeBlock filename="Claude Code — ~/.claude/claude_code_config.json" lang="json" code={`{
  "mcpServers": {
    "wright": {
      "command": "wright-mcp"
    }
  }
}`} />

          <CodeBlock filename="Cursor — .cursor/mcp.json" lang="json" code={`{
  "mcpServers": {
    "wright": {
      "command": "wright-mcp",
      "args": []
    }
  }
}`} />

          <Callout type="info">
            The server re-indexes changed files within 2 seconds of a save. AI tools querying Wright always see your latest documentation — there&apos;s no manual refresh step.
          </Callout>

          {/* ─────────────────────────────────────────────
              CONFIGURATION
          ───────────────────────────────────────────── */}
          <SectionHeading id="configuration" eyebrow="06 · Configuration" title="Configuration" />

          <P>
            Running <Code>wright init .</Code> creates a <Code>wright.config.json</Code> at your project root. All settings are optional — Wright works with zero config out of the box.
          </P>

          <CodeBlock
            filename="wright.config.json"
            lang="json"
            code={`{
  // Documentation style for generated docstrings
  // Options: "jsdoc" | "google" | "numpy" | "sphinx" | "godoc"
  "docStyle": "jsdoc",

  // Minimum coverage required (used by CI action and wright coverage)
  "coverageThreshold": 0.8,

  // Paths to scan (relative to project root)
  "include": ["src/", "lib/"],

  // Paths to ignore
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.py",
    "**/node_modules/**",
    "**/__pycache__/**"
  ],

  // Whether to require docs on private functions (default: false)
  "requirePrivate": false,

  // Whether to fail drift check on renamed params (default: true)
  "strictDrift": true,

  // Output path for llms.txt (default: "llms.txt")
  "llmsTxtOutput": "llms.txt"
}`}
          />

          <Table
            headers={["Key", "Type", "Default", "Description"]}
            rows={[
              [<Code key="ds">docStyle</Code>, "string", <Code key="jsdoc2">"jsdoc"</Code>, "Default doc style for generated docstrings."],
              [<Code key="ct">coverageThreshold</Code>, "number", <Code key="08">0.8</Code>, "Minimum ratio of documented functions (0.0–1.0)."],
              [<Code key="inc">include</Code>, "string[]", <Code key="dot2">["./"]</Code>, "Glob patterns of paths to scan."],
              [<Code key="exc">exclude</Code>, "string[]", "see above", "Glob patterns to skip. Test files are excluded by default."],
              [<Code key="rp">requirePrivate</Code>, "boolean", <Code key="false1">false</Code>, "If true, private/unexported functions count toward required coverage."],
              [<Code key="sd">strictDrift</Code>, "boolean", <Code key="true2">true</Code>, "If true, renamed params count as drift. Set to false for looser checking."],
              [<Code key="lo">llmsTxtOutput</Code>, "string", <Code key="llms2">"llms.txt"</Code>, "Where to write the generated llms.txt file."],
            ]}
          />

          {/* ─────────────────────────────────────────────
              FAQ
          ───────────────────────────────────────────── */}
          <SectionHeading id="faq" eyebrow="07 · FAQ" title="FAQ" />

          {[
            {
              q: "Does my code leave my machine?",
              a: "Partially. Doc generation, chat, and LLM drift checks are handled by the hosted Wright AI backend (api.wrightai.live). Only the function signature and a small surrounding context window is transmitted — never your full codebase. Coverage and structural drift checks run entirely locally via the CLI. LLM drift results are cached in SQLite so unchanged functions are never re-sent.",
            },
            {
              q: "What counts as a documented function?",
              a: "A function is considered documented if it has a docstring (Python) or a JSDoc/equivalent block comment immediately preceding the function declaration (TypeScript/JavaScript/Go). Inline comments inside the function body do not count.",
            },
            {
              q: "How is coverage calculated?",
              a: "Coverage = (number of documented public functions) / (total public functions). Private functions (prefixed _ in Python, unexported in Go, or without export in TS) are counted separately and not required by default. You can change this with requirePrivate: true.",
            },
            {
              q: "Can I use Wright without a wright.config.json?",
              a: "Yes. Wright detects your project language and applies sensible defaults. Run wright init . any time to generate a config you can customize.",
            },
            {
              q: "Does Wright work in monorepos?",
              a: "Yes. Place a wright.config.json in each package, or a single one at the root and use the include array to scope which packages are scanned. The CI action supports a paths input for the same purpose.",
            },
            {
              q: "How do I ignore a specific function from coverage?",
              a: <>Add a <Code>// @wright-ignore</Code> comment (TypeScript/JS) or a <Code># wright: ignore</Code> comment (Python) on the line before the function definition. Wright will skip it entirely — no coverage penalty, no drift checks.</>,
            },
            {
              q: "What's the difference between the free and paid plan?",
              a: "The VS Code extension, CLI, and MCP server are free. The GitHub Action's PR comment feature and dashboard analytics require a Wright AI account. Coverage threshold enforcement in CI is free.",
            },
          ].map((item, i) => (
            <details
              key={i}
              style={{
                borderBottom: "1px solid rgba(175,169,236,0.07)",
                padding: "4px 0",
              }}
            >
              <summary style={{
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15,
                color: "var(--text)", cursor: "pointer", padding: "16px 0",
                listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between",
                userSelect: "none",
              }}>
                {item.q}
                <span style={{ color: "var(--text-muted)", fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 16 }}>+</span>
              </summary>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.8, paddingBottom: 20, paddingRight: 32 }}>
                {item.a}
              </p>
            </details>
          ))}

          {/* Bottom CTA */}
          <div style={{
            marginTop: 80, padding: "40px 36px", borderRadius: 16,
            background: "rgba(83,74,183,0.08)", border: "1px solid rgba(127,119,221,0.18)",
            textAlign: "center",
          }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 24, color: "var(--text)", marginBottom: 10 }}>
              Ready to ship?
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.7 }}>
              Start with the VS Code extension — it&apos;s free and takes two minutes.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai"
                target="_blank" rel="noopener noreferrer"
                style={{
                  padding: "11px 24px", borderRadius: 8,
                  background: "#534AB7", color: "#fff",
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Install Extension →
              </a>
              <Link
                href="/dashboard/help"
                style={{
                  padding: "11px 24px", borderRadius: 8,
                  background: "rgba(255,255,255,0.05)", color: "var(--text-muted)",
                  border: "1px solid rgba(175,169,236,0.14)",
                  fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14,
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Need Help?
              </Link>
            </div>
          </div>

        </main>

        {/* ── Right TOC (on-page) ── */}
        <div style={{
          width: 200, flexShrink: 0,
          position: "sticky", top: 60,
          height: "calc(100vh - 60px)",
          overflowY: "auto",
          padding: "32px 0 48px 24px",
          display: "flex", flexDirection: "column",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            On this page
          </p>
          {NAV.map(section => (
            <div key={section.id} style={{ marginBottom: 4 }}>
              <a
                href={`#${section.children ? section.children[0].id : section.id}`}
                style={{
                  display: "block", fontFamily: "var(--font-body)", fontSize: 12.5,
                  color: "var(--text-muted)", textDecoration: "none", padding: "3px 0",
                  fontWeight: 600,
                }}
              >
                {section.label}
              </a>
              {section.children?.map(child => (
                <a
                  key={child.id}
                  href={`#${child.id}`}
                  style={{
                    display: "block", fontFamily: "var(--font-body)", fontSize: 12,
                    color: activeId === child.id ? "#7F77DD" : "rgba(136,132,168,0.6)",
                    textDecoration: "none", padding: "2px 0 2px 10px",
                    transition: "color 0.15s",
                  }}
                >
                  {child.label}
                </a>
              ))}
            </div>
          ))}
        </div>

      </div>
      <FooterV2 />
    </div>
  );
}