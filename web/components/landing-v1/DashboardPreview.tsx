"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const TABS = ["Overview", "Generate", "Coverage", "Drift", "Chat", "API Keys"] as const;
type Tab = (typeof TABS)[number];

/**
 * Renders an animated horizontal progress bar with a color-coded fill and percentage label based on the provided numeric value.
 *
 * Displays a pill-shaped progress bar using Framer Motion to animate the fill width from 0 to the given percentage. The bar color transitions between red (#E24B4A) for values below 50, orange (#EF9F27) for values between 50 and 79, and green (#1D9E75) for values 80 and above. A monospace percentage label is rendered to the right of the bar, styled in the same color as the fill.
 *
 * @param {number} v - A numeric value between 0 and 100 representing the percentage to display in the progress bar.
 * @returns {JSX.Element} A React element containing an animated progress bar and a percentage label.
 * @example
 * <Bar v={75} />
 */




function Bar({ v }: { v: number }) {
  const color = v >= 80 ? "#1D9E75" : v >= 50 ? "#EF9F27" : "#E24B4A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(175,169,236,0.07)", borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 999, boxShadow: `0 0 6px ${color}55` }}
        />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color, width: 34, textAlign: "right" }}>{v}%</span>
    </div>
  );
}

   /**
 * Renders a styled statistic card UI component displaying a labeled metric value with an optional subtitle and accent color.
 *
 * A React functional component used in dashboard and landing preview contexts to display a single key metric. The card features a semi-transparent dark background, rounded corners, a subtle top gradient accent line derived from the provided color, an uppercase monospace label, a large bold heading-font value, and an optional muted subtitle line.
 *
 * @param {string} label - The uppercase descriptive label displayed above the metric value, identifying what the stat represents (e.g., 'Total Requests').
 * @param {string} value - The primary metric value displayed prominently in large bold text (e.g., '1,240').
 * @param {string} color - A CSS color string used to style the value text and the top gradient accent line of the card (e.g., '#7C3AED').
 * @param {string | undefined} sub - An optional subtitle string rendered beneath the value in small muted monospace text, typically used for context or units (e.g., 'last 30 days').
 * @returns {JSX.Element} A styled React div element representing the stat card with label, value, optional subtitle, and color-accented decorative elements.
 * @example
 * <StatCard label="Total Requests" value="1,240" color="#7C3AED" sub="last 30 days" />
 */




function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.28)",
      borderRadius: 12,
      padding: "18px 20px",
      border: "1px solid rgba(175,169,236,0.08)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}44, transparent)` }} />
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 30, color, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(136,132,168,0.5)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const NAV = [
  { label: "Overview", tab: "Overview" as Tab, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { label: "Generate", tab: "Generate" as Tab, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> },
  { label: "Coverage", tab: "Coverage" as Tab, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg> },
  { label: "Drift", tab: "Drift" as Tab, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { label: "Chat", tab: "Chat" as Tab, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { label: "llms.txt", tab: null, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { label: "API Keys", tab: "API Keys" as Tab, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
];

const CONTENT: Record<Tab, React.ReactNode> = {
  Overview: (
    <div>
      {/* Stat row */}
      <div className="preview-stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Functions" value="847" color="var(--text)" sub="across 12 files" />
        <StatCard label="Coverage" value="73%" color="#EF9F27" sub="target: 80%" />
        <StatCard label="Drifted" value="12" color="#E24B4A" sub="needs fixing" />
        <StatCard label="Last Run" value="2m" color="#1D9E75" sub="ago · commit a3f8d2c" />
      </div>

      {/* Recent activity */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.5)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Recent activity</div>
      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, border: "1px solid rgba(175,169,236,0.07)", overflow: "hidden" }}>
        {[
          { icon: "✓", color: "#1D9E75", bg: "rgba(29,158,117,0.1)", border: "rgba(29,158,117,0.2)", msg: "Generated 41 docstrings in payments/", time: "2 min ago" },
          { icon: "⚠", color: "#EF9F27", bg: "rgba(239,159,39,0.08)", border: "rgba(239,159,39,0.2)", msg: "Drift detected in auth/middleware.ts — PR #214 blocked", time: "18 min ago" },
          { icon: "✓", color: "#1D9E75", bg: "rgba(29,158,117,0.1)", border: "rgba(29,158,117,0.2)", msg: "Coverage check passed — 73% ≥ threshold", time: "1 hour ago" },
          { icon: "◌", color: "#AFA9EC", bg: "rgba(127,119,221,0.08)", border: "rgba(127,119,221,0.2)", msg: "MCP server re-indexed 847 functions", time: "3 hours ago" },
        ].map((a, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(175,169,236,0.05)" : "none" }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: a.bg, border: `1px solid ${a.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: a.color }}>{a.icon}</span>
            </div>
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", lineHeight: 1.4, opacity: 0.85 }}>{a.msg}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.4)", flexShrink: 0 }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  Generate: (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Left: file selector */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.5)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Select scope</div>
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, border: "1px solid rgba(175,169,236,0.07)", padding: "8px 0", overflow: "hidden" }}>
          {[
            { name: "/ (root)", indent: 0, checked: true },
            { name: "payments/", indent: 1, checked: true },
            { name: "auth/", indent: 1, checked: true },
            { name: "api/routes/", indent: 1, checked: false },
            { name: "webhooks/", indent: 1, checked: false },
            { name: "utils/", indent: 1, checked: false },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", paddingLeft: 12 + f.indent * 14 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${f.checked ? "rgba(127,119,221,0.5)" : "rgba(175,169,236,0.15)"}`, background: f.checked ? "rgba(83,74,183,0.25)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {f.checked && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: f.checked ? "var(--text)" : "var(--text-muted)" }}>{f.name}</span>
            </div>
          ))}
        </div>

        {/* Style picker */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.5)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "14px 0 8px" }}>Style</div>
        {["JSDoc", "Google", "NumPy"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${i === 0 ? "rgba(127,119,221,0.5)" : "rgba(175,169,236,0.15)"}`, background: i === 0 ? "rgba(83,74,183,0.3)" : "transparent", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: i === 0 ? "var(--text)" : "var(--text-muted)" }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Right: preview */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Preview — payments/core.ts</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 12px", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer" }}>Preview</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 14px", background: "rgba(83,74,183,0.2)", border: "1px solid rgba(127,119,221,0.35)", borderRadius: 5, color: "#AFA9EC", cursor: "pointer" }}>Apply all →</span>
          </div>
        </div>
        <div style={{ background: "#07051a", border: "1px solid rgba(175,169,236,0.09)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(175,169,236,0.06)", display: "flex", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.7 }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.7 }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.7 }} />
          </div>
          <div style={{ padding: "14px 0" }}>
            {[
              { n: 12, text: "/**", color: "#1D9E75", added: true },
              { n: 13, text: " * Process a payment transaction.", color: "#1D9E75", added: true },
              { n: 14, text: " * @param amount - Amount in paise", color: "#1D9E75", added: true },
              { n: 15, text: " * @param card   - CardInput details", color: "#1D9E75", added: true },
              { n: 16, text: " * @returns PaymentResult with txId", color: "#1D9E75", added: true },
              { n: 17, text: " */", color: "#1D9E75", added: true },
              { n: 18, text: "" },
              { n: 19, text: "async function processPayment(", color: "#AFA9EC" },
              { n: 20, text: "  amount: number, card: CardInput", color: "#F0EEF8" },
              { n: 21, text: "): Promise<PaymentResult> {", color: "#AFA9EC" },
            ].map((line, i) => (
              <div key={i} style={{ display: "flex" }}>
                <div style={{ width: 40, flexShrink: 0, textAlign: "right", paddingRight: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.16)", lineHeight: "1.75em", userSelect: "none", borderRight: line.added ? "2px solid rgba(29,158,117,0.5)" : "2px solid transparent", background: line.added ? "rgba(29,158,117,0.04)" : "transparent" }}>{line.n}</div>
                <div style={{ paddingLeft: 14, fontFamily: "var(--font-mono)", fontSize: 12.5, color: line.color ?? "var(--text)", lineHeight: "1.75em", background: line.added ? "rgba(29,158,117,0.055)" : "transparent", flex: 1, whiteSpace: "pre" }}>{line.text || "\u00A0"}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#1D9E75" }}>
          ✓ 228 functions will be documented across payments/, auth/
        </div>
      </div>
    </div>
  ),

  Coverage: (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Functions" value="847" color="var(--text)" sub="across 12 files" />
        <StatCard label="Documented" value="619" color="#1D9E75" sub="+41 this week" />
        <StatCard label="Coverage" value="73%" color="#EF9F27" sub="target: 80%" />
        <StatCard label="Drifted" value="12" color="#E24B4A" sub="needs fixing" />
      </div>

      {/* Folder breakdown */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Coverage by folder</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)" }}>Last run: 2 min ago</span>
      </div>
      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, border: "1px solid rgba(175,169,236,0.07)", overflow: "hidden" }}>
        {[
          { name: "payments/", pct: 91, fns: 94 },
          { name: "auth/", pct: 73, fns: 138 },
          { name: "api/routes/", pct: 85, fns: 210 },
          { name: "webhooks/", pct: 48, fns: 67 },
          { name: "utils/", pct: 18, fns: 338 },
        ].map((f, i, arr) => (
          <div key={f.name} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 16, alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(175,169,236,0.05)" : "none" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-muted)" }}>{f.name}</span>
            <Bar v={f.pct} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.5)", textAlign: "right" }}>{f.fns} fns</span>
          </div>
        ))}
      </div>
    </div>
  ),

  Drift: (
    <div>
      {/* Summary banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "rgba(239,159,39,0.07)", borderRadius: 10, border: "1px solid rgba(239,159,39,0.18)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#EF9F27" }}>3 drifted · 12 undocumented · 832 up to date</span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 12px", background: "rgba(239,159,39,0.12)", border: "1px solid rgba(239,159,39,0.25)", borderRadius: 5, color: "#EF9F27", cursor: "pointer" }}>Fix all →</span>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid rgba(175,169,236,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1fr 80px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(175,169,236,0.07)", padding: "0 4px" }}>
          {["Function", "File", "Issue", ""].map(h => (
            <div key={h} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(136,132,168,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>
        {[
          { fn: "processPayment", file: "payments/core.ts:44", issue: "Signature changed", severity: "drift" },
          { fn: "validateCard", file: "payments/card.ts:12", issue: "Param added", severity: "drift" },
          { fn: "handleWebhook", file: "api/webhooks.ts:88", issue: "Undocumented", severity: "missing" },
        ].map((r, i, arr) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1fr 80px", borderBottom: i < arr.length - 1 ? "1px solid rgba(175,169,236,0.05)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.1)", padding: "0 4px" }}>
            <div style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#AFA9EC" }}>{r.fn}</div>
            <div style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(136,132,168,0.6)" }}>{r.file}</div>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                padding: "3px 9px",
                background: r.severity === "drift" ? "rgba(239,159,39,0.1)" : "rgba(226,75,74,0.1)",
                border: `1px solid ${r.severity === "drift" ? "rgba(239,159,39,0.25)" : "rgba(226,75,74,0.25)"}`,
                borderRadius: 5,
                color: r.severity === "drift" ? "#EF9F27" : "#E24B4A",
              }}>
                {r.issue}
              </span>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 10px", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 5, color: "var(--cyan)", cursor: "pointer", transition: "all 0.15s" }}>Fix →</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.4)" }}>
        Checked on commit a3f8d2c · 2 minutes ago
      </div>
    </div>
  ),

  Chat: (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[
        { role: "user", text: "How does the auth middleware work?" },
        {
          role: "wright",
          text: <>Auth is handled by <code style={{ fontFamily: "var(--font-mono)", color: "#AFA9EC", fontSize: 12 }}>validateToken()</code> in auth/middleware.ts. It verifies a JWT against the Supabase secret and attaches <code style={{ fontFamily: "var(--font-mono)", color: "#AFA9EC", fontSize: 12 }}>req.user</code> to the request context.</>,
          sources: ["auth/middleware.ts:14", "lib/supabase.ts:31"],
        },
        { role: "user", text: "What happens if the token is expired?" },
        {
          role: "wright",
          text: <>It calls <code style={{ fontFamily: "var(--font-mono)", color: "#AFA9EC", fontSize: 12 }}>refreshToken()</code> if the token is within the 15-minute refresh window. Outside that window, it throws <code style={{ fontFamily: "var(--font-mono)", color: "#AFA9EC", fontSize: 12 }}>TokenExpiredError</code> and returns 401.</>,
          sources: ["auth/middleware.ts:42", "auth/refresh.ts:18"],
        },
      ].map((msg, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
            background: msg.role === "user" ? "rgba(83,74,183,0.35)" : "rgba(29,158,117,0.2)",
            border: `1px solid ${msg.role === "user" ? "rgba(83,74,183,0.45)" : "rgba(29,158,117,0.35)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: msg.role === "user" ? "#AFA9EC" : "#1D9E75", fontWeight: 700 }}>
              {msg.role === "user" ? "S" : "W"}
            </span>
          </div>
          <div style={{
            flex: 1,
            padding: "10px 14px",
            background: msg.role === "user" ? "rgba(255,255,255,0.03)" : "rgba(29,158,117,0.05)",
            border: `1px solid ${msg.role === "user" ? "rgba(175,169,236,0.09)" : "rgba(29,158,117,0.15)"}`,
            borderRadius: msg.role === "user" ? "12px 12px 12px 3px" : "12px 12px 3px 12px",
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: msg.role === "user" ? "var(--text-muted)" : "var(--text)", lineHeight: 1.65 }}>
              {msg.text}
            </p>
            {(msg as any).sources && (
              <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                {(msg as any).sources.map((s: string) => (
                  <span key={s} style={{ padding: "3px 9px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)" }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Input */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 9, padding: "10px 16px", fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(175,169,236,0.22)" }}>
          Ask anything about your codebase...
        </div>
        <div style={{ padding: "10px 18px", background: "var(--purple)", borderRadius: 9, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", fontSize: 16 }}>→</div>
      </div>
    </div>
  ),

  "API Keys": (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>Your API Keys</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>Used by the CLI, CI, and MCP server</div>
        </div>
        <button style={{ padding: "8px 18px", background: "rgba(83,74,183,0.2)", color: "#AFA9EC", border: "1px solid rgba(127,119,221,0.3)", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          + New key
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { name: "Production CI", key: "wai_prod_****8f2a", env: "production", created: "Apr 18, 2026", used: "2 hours ago", active: true },
          { name: "Local dev", key: "wai_dev_****3c91", env: "development", created: "Apr 10, 2026", used: "5 days ago", active: true },
          { name: "Staging", key: "wai_stg_****7b44", env: "staging", created: "Mar 28, 2026", used: "12 days ago", active: false },
        ].map((k, i) => (
          <div key={i} style={{
            border: "1px solid rgba(175,169,236,0.08)",
            borderRadius: 11,
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: k.active ? "#1D9E75" : "rgba(136,132,168,0.3)",
                boxShadow: k.active ? "0 0 6px #1D9E75" : "none",
              }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>{k.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 8px", background: "rgba(83,74,183,0.12)", border: "1px solid rgba(127,119,221,0.2)", borderRadius: 4, color: "#AFA9EC" }}>{k.env}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-code)", marginBottom: 2 }}>{k.key}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.45)" }}>Created {k.created} · Last used {k.used}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "5px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer" }}>Copy</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "5px 12px", background: "rgba(226,75,74,0.06)", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 6, color: "#E24B4A", cursor: "pointer" }}>Revoke</span>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(136,132,168,0.35)", marginTop: 14 }}>
        Keys are shown once at creation. Store them in environment variables.
      </p>
    </div>
  ),
};

/**
 * Renders an interactive dashboard preview section with animated content tabs, decorative background effects, and a call-to-action button.
 *
 * A React functional component that displays a preview of the WrightAI dashboard interface. It manages tab navigation state, renders a mock browser window with chrome controls, includes a sidebar navigation menu, and displays tab-specific content with animations. The component features decorative background elements including grid lines, gradient orbs, and concentric rings for visual enhancement.
 * @returns {JSX.Element} A section element containing the complete dashboard preview UI with animated transitions, navigation sidebar, content area, and call-to-action button.
 * @example
 * <DashboardPreview />
 */
export default function DashboardPreview() {
  const [active, setActive] = useState<Tab>("Overview");

  return (
    <section className="preview-section" style={{ background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Background layer */}
      {/* Grid lines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(175,169,236,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.05) 1px, transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none", zIndex: 0 }} />
      {/* Central blurred orb */}
      <div style={{ position: "absolute", top: "-5%", left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "rgba(83,74,183,0.5)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "0%", left: "50%", transform: "translateX(-50%)", width: 400, height: 300, background: "rgba(34,211,238,0.2)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
      {/* Concentric rings centered */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 700, height: 700, borderRadius: "50%", border: "1px solid rgba(127,119,221,0.08)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 500, borderRadius: "50%", border: "1px solid rgba(127,119,221,0.06)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(127,119,221,0.05)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1600, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: 60 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Dashboard</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 4vw, 52px)", color: "var(--text)", letterSpacing: "-0.035em", lineHeight: 1.04, marginBottom: 16 }}>
            Everything in one place.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>
            Coverage, drift, chat, and keys — all from a single dashboard your whole team can use.
          </p>
        </motion.div>

        {/* Dashboard shell */}
        <div className="preview-shell">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="preview-shell-min"
          style={{
            border: "1px solid rgba(175,169,236,0.14)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 48px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(175,169,236,0.04), 0 0 100px rgba(83,74,183,0.08)",
            background: "var(--surface)",
          }}
        >
          {/* Window chrome */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 18px", background: "#07051a", borderBottom: "1px solid rgba(175,169,236,0.08)" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.8 }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.8 }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#1D9E75", display: "block", opacity: 0.8 }} />
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ padding: "4px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(175,169,236,0.08)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(175,169,236,0.3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "rgba(175,169,236,0.3)" }}>app.wrightai.dev/dashboard</span>
              </div>
            </div>
            <div style={{ width: 44 }} />
          </div>

          {/* App topbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, background: "rgba(10,8,24,0.9)", borderBottom: "1px solid rgba(175,169,236,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.35)" }}>WrightAI</span>
              <span style={{ color: "rgba(175,169,236,0.2)", fontSize: 12 }}>/</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", fontWeight: 500 }}>my-project</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: "5px 12px", background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 999, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "block" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1D9E75" }}>MCP live</span>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--purple)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#fff" }}>SS</div>
            </div>
          </div>

          {/* Body */}
          <div style={{ display: "flex" }}>

            {/* Sidebar */}
            <div style={{ width: 210, background: "#08061a", borderRight: "1px solid rgba(175,169,236,0.07)", padding: "14px 0 20px", flexShrink: 0 }}>
              <div style={{ padding: "0 14px 12px", marginBottom: 4 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(136,132,168,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Navigation</div>
              </div>
              {NAV.map(item => {
                const isActive = item.tab === active;
                return (
                  <button
                    key={item.label}
                    onClick={() => item.tab && setActive(item.tab)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 14px 8px 16px",
                      background: isActive ? "rgba(83,74,183,0.14)" : "transparent",
                      border: "none",
                      borderLeft: isActive ? "2px solid #7F77DD" : "2px solid transparent",
                      cursor: item.tab ? "pointer" : "default",
                      textAlign: "left",
                      outline: "none",
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ color: isActive ? "#7F77DD" : "rgba(136,132,168,0.5)", flexShrink: 0, display: "flex" }}>{item.icon}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: isActive ? "var(--text)" : "var(--text-muted)", fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
                  </button>
                );
              })}

              {/* Sidebar footer */}
              <div style={{ margin: "20px 14px 0", paddingTop: 16, borderTop: "1px solid rgba(175,169,236,0.07)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(136,132,168,0.35)", marginBottom: 6 }}>Coverage</div>
                <div style={{ height: 4, background: "rgba(175,169,236,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: "73%", height: "100%", background: "#EF9F27", borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#EF9F27", marginTop: 4 }}>73% — 7% below target</div>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: "24px 28px", minHeight: 420, overflow: "hidden" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {CONTENT[active]}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
        </div>{/* /preview-shell */}

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <Link
            href="/dashboard"
            className="btn-cyan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 32px",
              color: "#050310",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              borderRadius: 10,
            }}
          >
            Start for free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
