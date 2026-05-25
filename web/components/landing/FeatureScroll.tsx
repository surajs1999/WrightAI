"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  {
    id: "generate",
    label: "Generate",
    eyebrow: "01 / Generate",
    headline: "One command generates docs for your entire codebase.",
    desc: "Wright reads each function's structure, callers, and callees — then writes a complete docstring in your team's style. Preview the diff before anything changes.",
    points: [
      "Reads callers and callees for full context — not just the function body",
      "Preview the diff before a single line is committed",
      "Supports JSDoc, Google, NumPy, and Sphinx styles out of the box",
    ],
    stat: { value: "12% → 73%", label: "typical first-run coverage jump" },
    mockup: {
      type: "code",
      title: "payments/core.ts",
      lines: [
        { n: 10, text: "// @Wright: Generate Docs ↑", color: "rgba(127,119,221,0.75)", italic: true },
        { n: 11, text: "" },
        { n: 12, text: "/**", color: "#1D9E75", added: true },
        { n: 13, text: " * Process a payment transaction.", color: "#1D9E75", added: true },
        { n: 14, text: " * @param amount - Payment amount in paise", color: "#1D9E75", added: true },
        { n: 15, text: " * @param card   - Card details (CardInput)", color: "#1D9E75", added: true },
        { n: 16, text: " * @returns      PaymentResult with status + txId", color: "#1D9E75", added: true },
        { n: 17, text: " * @throws       InvalidCardError on bad card", color: "#1D9E75", added: true },
        { n: 18, text: " */", color: "#1D9E75", added: true },
        { n: 19, text: "" },
        { n: 20, text: "async function processPayment(", color: "#AFA9EC" },
        { n: 21, text: "  amount: number,", color: "#F0EEF8" },
        { n: 22, text: "  card: CardInput,", color: "#F0EEF8" },
        { n: 23, text: "): Promise<PaymentResult> {", color: "#AFA9EC" },
        { n: 24, text: "  // ...", color: "rgba(175,169,236,0.22)" },
        { n: 25, text: "}", color: "#AFA9EC" },
      ],
    },
  },
  {
    id: "coverage",
    label: "Coverage",
    eyebrow: "02 / Coverage",
    headline: "See exactly which functions are undocumented.",
    desc: "Coverage by folder, by file, by function. Set a threshold in CI — if it drops below 80%, the build fails. Same rigor you apply to tests.",
    points: [
      "Drilldown from repo → folder → file → function",
      "Block PRs that drop below your enforced threshold",
      "Trend reports show coverage improving over sprints",
    ],
    stat: { value: "847", label: "functions scanned in under 3 seconds" },
    mockup: {
      type: "terminal",
      title: "bash — ~/project",
      cmd: "wright coverage --report",
      bars: [
        { folder: "payments/", pct: 91, color: "#1D9E75" },
        { folder: "auth/middleware", pct: 73, color: "#EF9F27" },
        { folder: "webhooks/", pct: 48, color: "#EF9F27" },
        { folder: "utils/helpers", pct: 18, color: "#E24B4A" },
        { folder: "api/routes/", pct: 85, color: "#1D9E75" },
        { folder: "db/queries", pct: 62, color: "#EF9F27" },
      ],
      footer: "Overall: 71%  ✓  above threshold (80% required)",
    },
  },
  {
    id: "drift",
    label: "Drift",
    eyebrow: "03 / Drift",
    headline: "Stale docs are caught before they reach main.",
    desc: "Every commit, Wright diffs function signatures against their docstrings. Drift shows as a gutter warning in your editor and blocks PRs automatically.",
    points: [
      "Detects added, removed, or renamed params on every commit",
      "Gutter warning appears inline — no context switching",
      "CI gate blocks the PR before stale docs ever merge",
    ],
    stat: { value: "0", label: "stale docs reach production" },
    mockup: {
      type: "code",
      title: "auth/middleware.ts — ⚠ drift detected",
      lines: [
        { n: 11, text: "/**", color: "#8884A8" },
        { n: 12, text: " * Authenticate a request.", color: "#8884A8" },
        { n: 13, text: " * @param token  - JWT token string", color: "#8884A8" },
        { n: 14, text: " * @param userId - User identifier", color: "#8884A8", removed: true },
        { n: 15, text: " */", color: "#8884A8" },
        { n: 16, text: "", warn: "⚠  Param 'userId' removed from signature — docs drifted" },
        { n: 17, text: "async function authenticate(", color: "#AFA9EC" },
        { n: 18, text: "  token: string", color: "#F0EEF8" },
        { n: 19, text: "): Promise<User> {", color: "#AFA9EC" },
        { n: 20, text: "  return jwt.verify(token, SECRET);", color: "rgba(175,169,236,0.35)" },
        { n: 21, text: "}", color: "#AFA9EC" },
        { n: 22, text: "" },
        { n: 23, text: "", ciblock: "✕  CI blocked — fix drift before merge" },
      ],
    },
  },
  {
    id: "chat",
    label: "Chat",
    eyebrow: "04 / Chat",
    headline: "Ask anything. Get a sourced answer in seconds.",
    desc: "Type a question, get an answer with exact file and line citations. Onboard new teammates or debug legacy modules — without reading every file.",
    points: [
      "Every answer cites the exact file and line number",
      "Indexes your whole codebase, not just open files",
      "Runs locally — no code leaves your machine",
    ],
    stat: { value: "<2s", label: "average time to a sourced answer" },
    mockup: {
      type: "terminal",
      title: "bash — ~/project",
      cmd: "wright chat",
      chat: [
        { role: "user", text: "How does the payment flow handle retries?" },
        {
          role: "wright",
          text: "retryWithBackoff() in payments/retry.ts handles it — exponential backoff, max 3 attempts, then throws PaymentError.",
          sources: ["payments/retry.ts:22", "payments/core.ts:67"],
        },
        { role: "user", text: "Where is JWT token validation done?" },
        {
          role: "wright",
          text: "validateToken() in auth/middleware.ts:14 — verifies signature and expiry, returns decoded User.",
          sources: ["auth/middleware.ts:14"],
        },
      ],
    },
  },
  {
    id: "mcp",
    label: "MCP",
    eyebrow: "05 / MCP",
    headline: "Your docs feed Claude Code, Cursor, and Copilot live.",
    desc: "Wright runs a local MCP server. Every AI tool that supports MCP gets your indexed docs automatically — no copy-pasting, no stale context.",
    points: [
      "Works with Claude Code, Cursor, Copilot, and any MCP client",
      "Docs re-index automatically as you save files",
      "Zero config — one command, runs on stdio",
    ],
    stat: { value: "3", label: "AI tools served from one server" },
    mockup: {
      type: "terminal",
      title: "bash — ~/project",
      cmd: "wright mcp --serve",
      mcp: true,
    },
  },
  {
    id: "llmstxt",
    label: "llms.txt",
    eyebrow: "06 / llms.txt",
    headline: "A machine-readable index of your entire codebase.",
    desc: "Wright generates an llms.txt file following the open standard — a structured, token-efficient summary that any LLM can consume to understand your project instantly.",
    points: [
      "Follows the open llms.txt standard used across the industry",
      "Token-efficient format — designed for LLM context windows",
      "Serve it as a hosted endpoint or commit it to your repo",
    ],
    stat: { value: "~12k", label: "tokens for a 100-file codebase" },
    mockup: {
      type: "code",
      title: "llms.txt",
      llmstxt: true,
    },
  },
];

/**
 * Renders a styled code mockup block from an array of line descriptor objects, supporting normal, added, removed, warning, and CI-block line types.
 *
 * Each element in the `lines` array is inspected for special properties: `warn` renders an amber-highlighted warning banner, `ciblock` renders a red-highlighted CI error banner, and all other lines render a line-number gutter alongside code text. Added lines (`added: true`) are highlighted in green, removed lines (`removed: true`) are highlighted in red with strikethrough, and lines may carry optional `color`, `italic`, and `text` styling properties.
 *
 * @param {any[]} lines - Array of line descriptor objects. Each object may contain: `n` (line number), `text` (code string), `added` (boolean, green diff highlight), `removed` (boolean, red diff highlight with strikethrough), `warn` (string, renders amber warning banner), `ciblock` (string, renders red CI error banner), `color` (CSS color string for text), and `italic` (boolean for italic style).
 * @returns {JSX.Element} A vertically stacked `<div>` containing one rendered row per line descriptor, styled according to each line's type and properties.
 * @example
 * <CodeMockup lines={[
 *   { n: 1, text: 'const x = 1;' },
 *   { n: 2, text: 'const y = 2;', added: true },
 *   { n: 3, text: 'const z = 3;', removed: true },
 *   { warn: 'Unused variable detected' },
 *   { ciblock: 'Build failed: lint errors found' },
 * ]} />
 */




function CodeMockup({ lines }: { lines: any[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: "flex" }}>
          {line.warn ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "5px 16px 5px 44px",
              padding: "7px 13px",
              background: "rgba(239,159,39,0.08)",
              border: "1px solid rgba(239,159,39,0.22)",
              borderRadius: 6, width: "100%",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#EF9F27" }}>{line.warn}</span>
            </div>
          ) : line.ciblock ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "5px 16px 5px 44px",
              padding: "7px 13px",
              background: "rgba(226,75,74,0.08)",
              border: "1px solid rgba(226,75,74,0.22)",
              borderRadius: 6, width: "100%",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#E24B4A" }}>{line.ciblock}</span>
            </div>
          ) : (
            <>
              <div style={{
                width: 44, flexShrink: 0, textAlign: "right", paddingRight: 14,
                fontFamily: "var(--font-mono)", fontSize: 12.5,
                color: "rgba(175,169,236,0.16)", lineHeight: "1.8em", userSelect: "none",
                borderRight: line.added
                  ? "2px solid rgba(29,158,117,0.5)"
                  : line.removed
                  ? "2px solid rgba(226,75,74,0.45)"
                  : "2px solid transparent",
                background: line.added
                  ? "rgba(29,158,117,0.04)"
                  : line.removed
                  ? "rgba(226,75,74,0.04)"
                  : "transparent",
              }}>
                {line.n}
              </div>
              <div style={{
                flex: 1, paddingLeft: 18, paddingRight: 24,
                fontFamily: "var(--font-mono)", fontSize: 13.5,
                color: line.color ?? "var(--text)",
                fontStyle: line.italic ? "italic" : "normal",
                lineHeight: "1.8em",
                background: line.added
                  ? "rgba(29,158,117,0.055)"
                  : line.removed
                  ? "rgba(226,75,74,0.055)"
                  : "transparent",
                textDecoration: line.removed ? "line-through" : "none",
                whiteSpace: "pre",
              }}>
                {line.text || "\u00A0"}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

              /**
 * Renders a styled dark-themed mockup panel for a given feature tab, conditionally displaying code lines, coverage bars, a chat interface, MCP server logs, or an llms.txt preview based on the tab's mockup data.
 *
 * This React component accepts a single tab entry from the TABS configuration array and inspects its `mockup` property to determine which UI variant to render. It always renders a macOS-style window chrome (title bar with traffic-light dots and a monospace title). Depending on which keys are present on the mockup object — `cmd`, `lines`, `bars`, `chat`, `mcp`, or `llmstxt` — it conditionally renders the appropriate content section inside the panel body. Coverage bars are animated using Framer Motion. The component is used inside a feature-scroll section to visually demonstrate different product capabilities.
 *
 * @param {(typeof TABS)[number]} tab - A single element from the TABS constant array, containing at minimum a `mockup` object whose keys (`title`, `cmd`, `lines`, `bars`, `chat`, `mcp`, `llmstxt`, `footer`) determine which content variant is rendered inside the panel.
 * @returns {JSX.Element} A styled React div representing a dark-themed mockup window panel with a title bar and conditionally rendered content section (code, coverage bars, chat, MCP logs, or llms.txt preview).
 * @example
 * <Mockup tab={TABS[0]} />
 */




function Mockup({ tab }: { tab: (typeof TABS)[number] }) {
  const m = tab.mockup as any;

  return (
    <div style={{
      background: "#0A0818",
      border: "1px solid rgba(175,169,236,0.13)",
      borderRadius: 16,
      overflow: "hidden",
      height: 460,
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(175,169,236,0.04)",
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "12px 18px",
        background: "rgba(255,255,255,0.028)",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        flexShrink: 0,
      }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.85 }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.85 }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.85 }} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.38)" }}>
            {m.title}
          </span>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* Terminal prompt */}
      {m.cmd && (
        <div style={{
          padding: "10px 20px 8px",
          display: "flex", gap: 8, alignItems: "center",
          borderBottom: "1px solid rgba(175,169,236,0.05)",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#1D9E75" }}>~/project</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "rgba(175,169,236,0.3)" }}>❯</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#AFA9EC" }}>{m.cmd}</span>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", padding: m.cmd ? "18px 20px 20px" : "18px 0 20px" }}>

        {/* Code lines */}
        {m.lines && <CodeMockup lines={m.lines} />}

        {/* Coverage bars */}
        {m.bars && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(175,169,236,0.06)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Documentation Coverage</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>847 functions scanned</span>
            </div>
            {m.bars.map((b: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", width: 145, flexShrink: 0 }}>{b.folder}</span>
                <div style={{ flex: 1, height: 7, background: "rgba(175,169,236,0.07)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
                    style={{ height: "100%", background: b.color, borderRadius: 3, boxShadow: `0 0 6px ${b.color}55` }}
                  />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: b.color, width: 36, textAlign: "right", flexShrink: 0 }}>{b.pct}%</span>
              </div>
            ))}
            {m.footer && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(29,158,117,0.07)", border: "1px solid rgba(29,158,117,0.18)", borderRadius: 7 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#1D9E75" }}>{m.footer}</span>
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        {m.chat && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {m.chat.map((msg: any, i: number) => (
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
                  {msg.sources && (
                    <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                      {msg.sources.map((s: string) => (
                        <span key={s} style={{ padding: "3px 8px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)" }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#1D9E75" }}>~/project ❯</span>
              <span className="cursor-blink" style={{ display: "inline-block", width: 7, height: 14, background: "rgba(175,169,236,0.45)", verticalAlign: "middle" }} />
            </div>
          </div>
        )}

        {/* MCP */}
        {m.mcp && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { line: "MCP server started on stdio", color: "#1D9E75", icon: "✓" },
              { line: "Indexed 847 functions across 12 files", color: "#1D9E75", icon: "✓" },
              { line: "Tool registered: search_docs", color: "#AFA9EC", icon: "→" },
              { line: "Tool registered: get_function_doc", color: "#AFA9EC", icon: "→" },
              { line: "Tool registered: list_coverage", color: "#AFA9EC", icon: "→" },
              { line: "", icon: "" },
              { line: "[claude-code]  search_docs called  — \"how does auth work\"", color: "rgba(175,169,236,0.5)", icon: "" },
              { line: "  → Returning 3 matching docs  (auth/middleware.ts)", color: "#00D4FF", icon: "" },
              { line: "[cursor]       get_function_doc called  — processPayment", color: "rgba(175,169,236,0.5)", icon: "" },
              { line: "  → Returning docstring + signature", color: "#00D4FF", icon: "" },
              { line: "", icon: "" },
              { line: "Watching for file changes...", color: "rgba(175,169,236,0.3)", icon: "◌" },
            ].map((r, i) => (
              <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: r.color ?? "var(--text-muted)", lineHeight: 1.5 }}>
                {r.icon ? <span style={{ marginRight: 10, opacity: 0.7 }}>{r.icon}</span> : null}
                {r.line || "\u00A0"}
              </div>
            ))}
          </div>
        )}

        {/* llms.txt */}
        {m.llmstxt && (
          <CodeMockup lines={[
            { n: 1,  text: "# Wright AI — Project Documentation Index", color: "#7F77DD" },
            { n: 2,  text: "" },
            { n: 3,  text: "> Auto-generated by Wright AI. Do not edit manually.", color: "rgba(175,169,236,0.35)", italic: true },
            { n: 4,  text: "> Updated: 2025-01-15T09:42:00Z  •  847 functions indexed", color: "rgba(175,169,236,0.35)", italic: true },
            { n: 5,  text: "" },
            { n: 6,  text: "## payments/core.ts", color: "#00D4FF" },
            { n: 7,  text: "" },
            { n: 8,  text: "- processPayment(amount, card): Process a payment transaction.", color: "#F0EEF8" },
            { n: 9,  text: "  Params: amount (paise), card (CardInput). Returns PaymentResult.", color: "rgba(175,169,236,0.5)" },
            { n: 10, text: "- validateCard(card): Validate card details. Throws InvalidCardError.", color: "#F0EEF8" },
            { n: 11, text: "" },
            { n: 12, text: "## auth/middleware.ts", color: "#00D4FF" },
            { n: 13, text: "" },
            { n: 14, text: "- authenticate(token): Verify JWT, return decoded User.", color: "#F0EEF8" },
            { n: 15, text: "- refreshToken(token): Issue a new token if within refresh window.", color: "#F0EEF8" },
            { n: 16, text: "" },
            { n: 17, text: "## Full index: https://wright.dev/docs/llms.txt", color: "rgba(175,169,236,0.3)", italic: true },
          ]} />
        )}

      </div>
    </div>
  );
}

/**
 * Renders an interactive feature showcase section with tabbed navigation, animated transitions, and decorative background elements.
 *
 * A React component that displays a features section with multiple tabs (defined in TABS constant). Users can switch between features by clicking or hovering over tab buttons. Each feature displays an animated mockup on the left and descriptive content (eyebrow, headline, description, bullet points, and statistics) on the right. The component includes decorative background elements such as grid lines, blurred orbs, and concentric rings for visual enhancement.
 * @returns {JSX.Element} A section element containing the complete feature showcase UI with background decorations, tab navigation, feature mockup, and feature details.
 * @example
 * <FeatureScroll />
 */
export default function FeatureScroll() {
  const [active, setActive] = useState(0);

  return (
    <section id="features" className="feature-section" style={{ background: "var(--bg)" }}>
      {/* Background layer */}
      {/* Grid lines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(175,169,236,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.05) 1px, transparent 1px)", backgroundSize: "64px 64px", pointerEvents: "none", zIndex: 0 }} />
      {/* Blurred orbs */}
      <div style={{ position: "absolute", top: "5%", left: "-10%", width: 650, height: 650, background: "rgba(83,74,183,0.45)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "0%", right: "-8%", width: 550, height: 550, background: "rgba(34,211,238,0.25)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
      {/* Concentric rings right */}
      <div style={{ position: "absolute", top: "50%", right: "-80px", transform: "translateY(-50%)", width: 500, height: 500, borderRadius: "50%", border: "1px solid rgba(127,119,221,0.12)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "50%", right: "-20px", transform: "translateY(-50%)", width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(127,119,221,0.09)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "50%", right: "40px", transform: "translateY(-50%)", width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(127,119,221,0.07)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1600, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 16 }}>
            How it works
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(32px, 4vw, 52px)", color: "var(--text)", letterSpacing: "-0.035em", lineHeight: 1.04 }}>
            AI code documentation tools your codebase needs.
          </h2>
        </motion.div>

        {/* Tabs row — centered, full width */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 40 }}
        >
          {TABS.map((tab, i) => {
            const isActive = i === active;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                style={{
                  padding: "9px 22px",
                  borderRadius: 999,
                  fontFamily: "var(--font-body)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14.5,
                  cursor: "pointer",
                  transition: "all 0.22s ease",
                  background: isActive ? "rgba(83,74,183,0.18)" : "rgba(255,255,255,0.04)",
                  border: isActive ? "1px solid rgba(127,119,221,0.45)" : "1px solid rgba(175,169,236,0.1)",
                  color: isActive ? "#AFA9EC" : "var(--text-muted)",
                  boxShadow: isActive ? "0 0 18px rgba(83,74,183,0.3), inset 0 0 12px rgba(127,119,221,0.08)" : "none",
                  outline: "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Two-column: mockup left, heading + description right */}
        <div className="feature-cols">

          {/* Left: mockup */}
          <div className="feature-mockup">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10, scale: 0.992 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.996 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Mockup tab={TABS[active]} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: active feature description */}
          <div className="feature-desc">
            <AnimatePresence mode="wait">
              <motion.div
                key={`desc-${active}`}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                style={{ display: "flex", flexDirection: "column", gap: 0 }}
              >
                {/* Eyebrow */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 20,
                  padding: "5px 13px",
                  background: "rgba(83,74,183,0.12)",
                  border: "1px solid rgba(127,119,221,0.25)",
                  borderRadius: 999,
                  width: "fit-content",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#AFA9EC", letterSpacing: "0.07em" }}>
                    {TABS[active].eyebrow}
                  </span>
                </div>

                {/* Headline */}
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: "clamp(22px, 2.4vw, 34px)",
                  color: "var(--text)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}>
                  {TABS[active].headline}
                </h3>

                {/* Description */}
                <p style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 16,
                  color: "var(--text-muted)",
                  lineHeight: 1.85,
                  marginBottom: 32,
                }}>
                  {TABS[active].desc}
                </p>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(175,169,236,0.08)", marginBottom: 28 }} />

                {/* Bullet points */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 36 }}>
                  {TABS[active].points.map((pt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                        background: "rgba(29,158,117,0.15)",
                        border: "1px solid rgba(29,158,117,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text)", lineHeight: 1.6, opacity: 0.88 }}>
                        {pt}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Stat badge */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(175,169,236,0.1)",
                  borderRadius: 12,
                  width: "fit-content",
                }}>
                  <span style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 28,
                    color: "var(--text)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}>
                    {TABS[active].stat.value}
                  </span>
                  <div style={{ width: 1, height: 28, background: "rgba(175,169,236,0.12)" }} />
                  <span style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13.5,
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                    maxWidth: 140,
                  }}>
                    {TABS[active].stat.label}
                  </span>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
