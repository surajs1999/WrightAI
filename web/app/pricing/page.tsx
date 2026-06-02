"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────

type Interval = "monthly" | "annual";

// ─── Data ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null,
    monthlyPrice: 0,
    annualPrice: 0,
    description: "For individuals exploring WrightAI.",
    cta: "Get started free",
    ctaHref: "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai",
    ctaExternal: true,
    highlighted: false,
    comingSoon: false,
    features: [
      { label: "VS Code extension — full", included: true },
      { label: "CLI tool (self-hosted)", included: true },
      { label: "MCP server (self-hosted)", included: true },
      { label: "100 doc generations / month", included: true },
      { label: "Structural drift detection", included: true },
      { label: "Coverage scans (unlimited)", included: true },
      { label: "1 connected repository", included: true },
      { label: "1 API key", included: true },
      { label: "Semantic (LLM) drift detection", included: false },
      { label: "Codebase chat", included: false },
      { label: "GitHub Action PR comments", included: false },
      { label: "Auto-PR for drift fixes", included: false },
      { label: "Dashboard analytics", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most popular",
    monthlyPrice: 18,
    annualPrice: 14,
    description: "For active developers who need unlimited documentation power.",
    cta: "Start Pro",
    ctaHref: "/dashboard",
    ctaExternal: false,
    highlighted: true,
    comingSoon: false,
    features: [
      { label: "Everything in Free", included: true },
      { label: "1,000 doc generations / month", included: true },
      { label: "Semantic (LLM) drift detection", included: true },
      { label: "100 chat messages / month", included: true },
      { label: "GitHub Action PR comments", included: true },
      { label: "Auto-PR for drift fixes", included: true },
      { label: "Dashboard analytics", included: true },
      { label: "5 connected repositories", included: true },
      { label: "3 API keys", included: true },
      { label: "Email support", included: true },
    ],
  },
  {
    id: "team",
    name: "Team",
    badge: "Coming soon",
    monthlyPrice: 20,
    annualPrice: 16,
    description: "For engineering teams who ship documentation as a team.",
    cta: "Join waitlist",
    ctaHref: "mailto:surajsahoo19991012@gmail.com?subject=WrightAI Team Waitlist",
    ctaExternal: true,
    highlighted: false,
    comingSoon: true,
    features: [
      { label: "Everything in Pro — per seat", included: true },
      { label: "800 generations / seat / month (pooled)", included: true },
      { label: "Unlimited chat messages", included: true },
      { label: "Unlimited repositories", included: true },
      { label: "10 API keys", included: true },
      { label: "Centralized team dashboard", included: true },
      { label: "Org-wide coverage analytics", included: true },
      { label: "Priority support (48 hr SLA)", included: true },
      { label: "Minimum 3 seats", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Can I use Wright AI without paying?",
    a: "Yes. The Free plan includes the VS Code extension, CLI, and MCP server with 100 hosted doc generations per month — no credit card required. Structural drift detection and coverage scans are always free.",
  },
  {
    q: "What happens when I hit my monthly limit?",
    a: "You'll get a warning in the dashboard and extension when you reach 80% of your limit. At 100% the hosted API is paused until the next calendar month. The CLI still works with your own Anthropic API key.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Cancel from the billing portal in your dashboard and you'll keep Pro access until the end of the billing period, then drop back to the Free plan automatically.",
  },
  {
    q: "Is there an annual discount?",
    a: "Yes — billing annually saves 22% (Pro drops from $18/mo to $14/mo). You can switch between monthly and annual at any time from the billing portal.",
  },
  {
    q: "What does 'self-hosted' mean for the CLI and MCP?",
    a: "You provide your own Anthropic API key and run the CLI or MCP server locally. All processing happens on your machine and goes directly to Anthropic — no usage goes through WrightAI's hosted quota.",
  },
  {
    q: "Is my code sent to WrightAI servers?",
    a: "Only the function signature and a small context window around it are sent to the hosted API — never your full codebase. Drift results are cached locally in SQLite so unchanged functions are never re-sent.",
  },
  {
    q: "What is the Team plan's per-seat pricing?",
    a: "Team is $20/seat/month (or $16/seat/month billed annually) with a minimum of 3 seats. The 800 generations per seat are pooled across the whole team.",
  },
];

// ─── Check icon ──────────────────────────────────────────────────────────────

function Check({ included }: { included: boolean }) {
  if (included) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="7" cy="7" r="7" fill="rgba(29,158,117,0.15)" />
        <path d="M4 7l2 2 4-4" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7" cy="7" r="7" fill="rgba(255,255,255,0.04)" />
      <path d="M5 5l4 4M9 5l-4 4" stroke="rgba(175,169,236,0.25)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(175,169,236,0.07)",
        cursor: "pointer",
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 0",
        fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--text)",
        userSelect: "none",
      }}>
        {q}
        <span style={{
          color: open ? "#AFA9EC" : "var(--text-muted)",
          fontSize: 22, fontWeight: 300, flexShrink: 0, marginLeft: 16,
          transition: "transform 0.2s",
          display: "block",
          transform: open ? "rotate(45deg)" : "none",
        }}>+</span>
      </div>
      {open && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 14.5,
          color: "var(--text-muted)", lineHeight: 1.8,
          paddingBottom: 20, margin: 0,
        }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleProCheckout(planId: string) {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/proxy/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });

      if (res.status === 401) {
        window.location.href = `/dashboard?redirect=/pricing`;
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data as { detail?: string }).detail
          ?? `Server error (${res.status}) — please try again or contact support.`;
        setCheckoutError(msg);
        return;
      }

      const { checkout_url } = data as { checkout_url?: string };
      if (!checkout_url) {
        setCheckoutError("No checkout URL returned — please try again.");
        return;
      }
      window.location.href = checkout_url;
    } catch {
      setCheckoutError("Network error — could not reach the server. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #06040f)" }}>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,4,15,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(175,169,236,0.08)",
        height: 60, display: "flex", alignItems: "center",
      }}>
        <div style={{
          maxWidth: 1200, width: "100%", margin: "0 auto",
          padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/wright-logo.svg" alt="Wright AI" width={22} height={22} style={{ opacity: 0.9 }} />
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "var(--text, #e8e6f4)", letterSpacing: "-0.02em" }}>
              Wright AI
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/docs" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "rgba(175,169,236,0.6)", textDecoration: "none" }}>Docs</Link>
            <Link href="/dashboard" style={{
              padding: "7px 16px", borderRadius: 7,
              background: "rgba(83,74,183,0.2)", border: "1px solid rgba(127,119,221,0.3)",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "#AFA9EC",
              textDecoration: "none",
            }}>
              Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 999,
          background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.25)",
          marginBottom: 22,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#AFA9EC", letterSpacing: "0.06em" }}>Simple, transparent pricing</span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 48,
          color: "var(--text, #e8e6f4)", letterSpacing: "-0.04em", lineHeight: 1.08,
          marginBottom: 18,
        }}>
          Documentation that pays<br />for itself
        </h1>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 17, color: "rgba(175,169,236,0.65)",
          lineHeight: 1.75, marginBottom: 36,
        }}>
          Start free. Upgrade when you need more — cancel any time.
        </p>

        {/* Interval toggle */}
        <div style={{
          display: "inline-flex", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(175,169,236,0.1)", borderRadius: 10,
          padding: 4, gap: 4,
        }}>
          {(["monthly", "annual"] as Interval[]).map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              style={{
                padding: "8px 20px", borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13,
                background: interval === iv ? "rgba(83,74,183,0.35)" : "transparent",
                color: interval === iv ? "#AFA9EC" : "rgba(175,169,236,0.4)",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              {iv === "monthly" ? "Monthly" : (
                <>Annual <span style={{ fontSize: 10, background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(29,158,117,0.25)", padding: "2px 7px", borderRadius: 999 }}>Save 22%</span></>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Checkout error banner ── */}
      {checkoutError && (
        <div style={{
          maxWidth: 680, margin: "-24px auto 24px", padding: "0 24px",
        }}>
          <div style={{
            padding: "13px 18px", borderRadius: 10,
            background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.3)",
            fontFamily: "var(--font-body)", fontSize: 13.5, color: "#E24B4A",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ flexShrink: 0 }}>✕</span>
            <span>{checkoutError}</span>
          </div>
        </div>
      )}

      {/* ── Plan cards ── */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
      }}>
        {PLANS.map(plan => {
          const price = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                background: plan.highlighted
                  ? "linear-gradient(145deg, rgba(83,74,183,0.18) 0%, rgba(6,4,15,0.9) 100%)"
                  : "rgba(255,255,255,0.025)",
                border: plan.highlighted
                  ? "1px solid rgba(127,119,221,0.45)"
                  : "1px solid rgba(175,169,236,0.08)",
                borderRadius: 16, padding: "32px 28px",
                display: "flex", flexDirection: "column",
                opacity: plan.comingSoon ? 0.85 : 1,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
                  padding: "4px 14px", borderRadius: 999,
                  background: plan.highlighted ? "#534AB7" : "rgba(83,74,183,0.15)",
                  color: plan.highlighted ? "#fff" : "#AFA9EC",
                  border: plan.highlighted ? "none" : "1px solid rgba(83,74,183,0.25)",
                  whiteSpace: "nowrap",
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 44, color: "var(--text, #e8e6f4)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {price === 0 ? "Free" : `$${price}`}
                </span>
                {price > 0 && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(175,169,236,0.4)", marginBottom: 6 }}>
                    /mo{plan.comingSoon ? " / seat" : ""}
                  </span>
                )}
              </div>
              {interval === "annual" && plan.monthlyPrice > 0 && !plan.comingSoon && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.4)", marginBottom: 4 }}>
                  Billed ${plan.annualPrice * 12}/yr · saves ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                </div>
              )}

              <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "rgba(175,169,236,0.55)", lineHeight: 1.65, marginTop: 10, marginBottom: 24 }}>
                {plan.description}
              </p>

              {/* CTA */}
              {plan.comingSoon ? (
                <a
                  href={plan.ctaHref}
                  style={{
                    display: "block", textAlign: "center",
                    padding: "11px 0", borderRadius: 9,
                    background: "rgba(83,74,183,0.1)", border: "1px solid rgba(83,74,183,0.2)",
                    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#AFA9EC",
                    textDecoration: "none", marginBottom: 28,
                  }}
                >
                  {plan.cta}
                </a>
              ) : plan.id === "free" ? (
                <a
                  href={plan.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block", textAlign: "center",
                    padding: "11px 0", borderRadius: 9,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(175,169,236,0.12)",
                    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "rgba(175,169,236,0.8)",
                    textDecoration: "none", marginBottom: 28,
                  }}
                >
                  {plan.cta}
                </a>
              ) : (
                <button
                  onClick={() => handleProCheckout(plan.id)}
                  disabled={checkoutLoading}
                  style={{
                    display: "block", width: "100%", textAlign: "center",
                    padding: "12px 0", borderRadius: 9, cursor: checkoutLoading ? "wait" : "pointer",
                    background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
                    border: "none",
                    fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, color: "#fff",
                    marginBottom: 28, opacity: checkoutLoading ? 0.7 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {checkoutLoading ? "Loading…" : plan.cta}
                </button>
              )}

              {/* Feature list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Check included={f.included} />
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.5,
                      color: f.included ? "rgba(175,169,236,0.85)" : "rgba(175,169,236,0.28)",
                    }}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Enterprise callout ── */}
      <div style={{ maxWidth: 800, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{
          background: "rgba(83,74,183,0.06)", border: "1px solid rgba(127,119,221,0.15)",
          borderRadius: 14, padding: "32px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--text, #e8e6f4)", marginBottom: 6 }}>
              Enterprise
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "rgba(175,169,236,0.6)", lineHeight: 1.7, margin: 0, maxWidth: 420 }}>
              Self-hosted deployment, SSO, audit logs, custom model selection, and SLA. Bypasses AGPL obligations with a commercial license.
            </p>
          </div>
          <a
            href="mailto:surajsahoo19991012@gmail.com?subject=WrightAI Enterprise"
            style={{
              padding: "11px 24px", borderRadius: 9, whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(175,169,236,0.15)",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "rgba(175,169,236,0.8)",
              textDecoration: "none",
            }}
          >
            Contact us →
          </a>
        </div>
      </div>

      {/* ── Comparison table ── */}
      <div style={{ maxWidth: 900, margin: "0 auto 96px", padding: "0 24px" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, color: "var(--text, #e8e6f4)", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 36 }}>
          Full comparison
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Feature", "Free", "Pro", "Team"].map((h, i) => (
                  <th key={h} style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "rgba(175,169,236,0.45)",
                    padding: "12px 16px", textAlign: i === 0 ? "left" : "center",
                    borderBottom: "1px solid rgba(175,169,236,0.08)",
                    background: i === 2 ? "rgba(83,74,183,0.06)" : "transparent",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Doc generations / month", "100", "1,000", "800/seat (pooled)"],
                ["Codebase chat messages / month", "—", "100", "Unlimited"],
                ["Connected repositories", "1", "5", "Unlimited"],
                ["API keys", "1", "3", "10"],
                ["VS Code extension", "✓", "✓", "✓"],
                ["CLI tool (self-hosted)", "✓", "✓", "✓"],
                ["MCP server", "✓", "✓", "✓"],
                ["Structural drift detection", "✓", "✓", "✓"],
                ["Semantic (LLM) drift", "—", "✓", "✓"],
                ["Auto-PR for drift fixes", "—", "✓", "✓"],
                ["GitHub Action PR comments", "—", "✓", "✓"],
                ["llms.txt generation", "✓", "✓", "✓"],
                ["Dashboard analytics", "—", "Individual", "Team-wide"],
                ["Support", "GitHub Issues", "Email", "Priority (48 hr)"],
              ].map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid rgba(175,169,236,0.04)" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      fontFamily: ci === 0 ? "var(--font-body)" : "var(--font-mono)",
                      fontSize: ci === 0 ? 14 : 13,
                      color: cell === "—" ? "rgba(175,169,236,0.2)" : cell === "✓" ? "#1D9E75" : "rgba(175,169,236,0.75)",
                      padding: "13px 16px",
                      textAlign: ci === 0 ? "left" : "center",
                      background: ci === 2 ? "rgba(83,74,183,0.04)" : "transparent",
                      fontWeight: ci === 0 ? 400 : 500,
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ maxWidth: 680, margin: "0 auto 100px", padding: "0 24px" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, color: "var(--text, #e8e6f4)", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 40 }}>
          Frequently asked questions
        </h2>
        {FAQ.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ textAlign: "center", padding: "0 24px 100px" }}>
        <div style={{
          maxWidth: 520, margin: "0 auto",
          padding: "48px 40px", borderRadius: 18,
          background: "linear-gradient(145deg, rgba(83,74,183,0.14) 0%, rgba(6,4,15,0.9) 100%)",
          border: "1px solid rgba(127,119,221,0.2)",
        }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 26, color: "var(--text, #e8e6f4)", marginBottom: 12 }}>
            Start documenting today
          </h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "rgba(175,169,236,0.6)", marginBottom: 28, lineHeight: 1.7 }}>
            Free plan. No credit card. Two minutes to first docstring.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "11px 26px", borderRadius: 9,
                background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, color: "#fff",
                textDecoration: "none",
              }}
            >
              Install Extension →
            </a>
            <Link
              href="/docs"
              style={{
                padding: "11px 26px", borderRadius: 9,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(175,169,236,0.12)",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14, color: "rgba(175,169,236,0.7)",
                textDecoration: "none",
              }}
            >
              Read the docs
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
