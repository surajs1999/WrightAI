"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/landing/Footer";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (ev: { name: string }) => void }) => void;
      Checkout: {
        open: (opts: {
          transactionId?: string;
          items?: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: Record<string, unknown>;
        }) => void;
      };
    };
  }
}


type Interval = "monthly" | "annual";

const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: "pri_01kt5dztgzehbz8b1gwd2y58k9",
    annual: "pri_01kt5e1gwgysmdgmjq73xecde2",
  },
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null,
    monthlyPrice: 0,
    annualPrice: 0,
    description: "For individuals exploring Wright AI.",
    cta: "Get started free",
    ctaHref: "https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai",
    ctaExternal: true,
    highlighted: false,
    comingSoon: false,
    features: [
      { label: "VS Code extension", included: true },
      { label: "CLI & MCP server (self-hosted)", included: true },
      { label: "100 doc generations / month", included: true },
      { label: "Structural drift detection", included: true },
      { label: "Unlimited coverage scans", included: true },
      { label: "1 repository · 1 API key", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most popular",
    monthlyPrice: 18,
    annualPrice: 14,
    description: "For active developers who need unlimited documentation power.",
    cta: "Get started",
    ctaHref: "/dashboard",
    ctaExternal: false,
    highlighted: true,
    comingSoon: false,
    features: [
      { label: "Everything in Free", included: true },
      { label: "1,000 doc generations / month", included: true },
      { label: "Semantic (LLM) drift detection", included: true },
      { label: "100 chat messages / month", included: true },
      { label: "GitHub Action PR comments + Auto-PR", included: true },
      { label: "5 repositories · 3 API keys", included: true },
      { label: "Dashboard analytics + Email support", included: true },
    ],
  },
  {
    id: "team",
    name: "Team",
    badge: "Coming soon",
    monthlyPrice: 20,
    annualPrice: 16,
    description: "For engineering teams who ship documentation together.",
    cta: "Join waitlist",
    ctaHref: "mailto:hello@wrightai.live?subject=WrightAI Team Waitlist",
    ctaExternal: true,
    highlighted: false,
    comingSoon: true,
    features: [
      { label: "Everything in Pro — per seat", included: true },
      { label: "800 generations / seat / month (pooled)", included: true },
      { label: "Unlimited chat + repositories", included: true },
      { label: "Org-wide coverage analytics", included: true },
      { label: "Priority support (48 hr SLA)", included: true },
      { label: "Minimum 3 seats", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Can I change plans later?",
    a: "Yes — upgrade or downgrade at any time from the billing portal in your dashboard. Upgrades take effect immediately; downgrades apply at the end of your current billing period.",
  },
  {
    q: "Can I use Wright AI without paying?",
    a: "Yes. The Free plan includes the VS Code extension, CLI, and MCP server with 100 hosted doc generations per month — no credit card required. Structural drift detection and coverage scans are always free.",
  },
  {
    q: "What happens when I hit my monthly limit?",
    a: "You'll get a warning in the dashboard and extension at 80% usage. At 100% the hosted API is paused until the next calendar month. The CLI still works with your own Anthropic API key.",
  },
  {
    q: "Is there an annual discount?",
    a: "Yes — billing annually saves 22% (Pro drops from $18/mo to $14/mo). Switch between monthly and annual any time from the billing portal.",
  },
  {
    q: "What does 'self-hosted' mean for the CLI and MCP?",
    a: "You provide your own Anthropic API key and run the CLI or MCP server locally. All processing goes directly to Anthropic — nothing counts against your Wright AI quota.",
  },
  {
    q: "Is my code sent to Wright AI servers?",
    a: "Only the function signature and a small context window are sent to the hosted API — never your full codebase. Drift results are cached locally in SQLite so unchanged functions are never re-sent.",
  },
];

const COMPARISON: { category: string; icon: string; rows: [string, string, string, string][] }[] = [
  {
    category: "Usage limits",
    icon: "⚡",
    rows: [
      ["Doc generations / month", "100", "1,000", "800 / seat (pooled)"],
      ["Chat messages / month", "—", "100", "Unlimited"],
      ["Connected repositories", "1", "5", "Unlimited"],
      ["API keys", "1", "3", "10"],
    ],
  },
  {
    category: "Core features",
    icon: "✦",
    rows: [
      ["VS Code extension", "✓", "✓", "✓"],
      ["CLI tool (self-hosted)", "✓", "✓", "✓"],
      ["MCP server", "✓", "✓", "✓"],
      ["Structural drift detection", "✓", "✓", "✓"],
      ["llms.txt generation", "✓", "✓", "✓"],
      ["Semantic (LLM) drift detection", "—", "✓", "✓"],
      ["Auto-PR for drift fixes", "—", "✓", "✓"],
      ["GitHub Action PR comments", "—", "✓", "✓"],
    ],
  },
  {
    category: "Team & analytics",
    icon: "◈",
    rows: [
      ["Dashboard analytics", "—", "Individual", "Team-wide"],
      ["Org-wide coverage reports", "—", "—", "✓"],
      ["Centralized team dashboard", "—", "—", "✓"],
    ],
  },
];

function Check({ included }: { included: boolean }) {
  if (included) {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="7.5" cy="7.5" r="7.5" fill="rgba(29,158,117,0.15)" />
        <path d="M4.5 7.5l2.25 2.25 3.75-3.75" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7.5" cy="7.5" r="7.5" fill="rgba(255,255,255,0.03)" />
      <path d="M5 5l5 5M10 5l-5 5" stroke="rgba(175,169,236,0.2)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid rgba(175,169,236,0.07)", cursor: "pointer" }}
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
          transition: "transform 0.2s", display: "block",
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

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>("annual");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load Paddle.js — overlay used in production; localhost falls back to redirect
  // since Paddle blocks iframes on non-approved domains.
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    const init = () => {
      window.Paddle?.Initialize({
        token,
        eventCallback(ev) {
          if (ev.name === "checkout.completed") {
            window.location.href = "/dashboard?upgraded=true";
          }
        },
      });
    };
    if (window.Paddle) { init(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  async function handleProCheckout(planId: string) {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      // Fetch user info to pre-fill checkout and pass api_key to webhook
      const meRes = await fetch("/api/proxy/user/me");
      if (meRes.status === 401) {
        window.location.href = `/dashboard?redirect=/pricing`;
        return;
      }
      const me = await meRes.json().catch(() => ({})) as { email?: string; api_key?: string };

      const priceId = PRICE_IDS[planId]?.[interval];
      if (!priceId) {
        setCheckoutError("Plan not found — please try again.");
        return;
      }

      if (!window.Paddle) {
        setCheckoutError("Checkout not ready — please refresh and try again.");
        return;
      }

      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        ...(me.email ? { customer: { email: me.email } } : {}),
        customData: { api_key: me.api_key ?? "", plan: planId },
        settings: { displayMode: "overlay", locale: "en" },
      });
    } catch {
      setCheckoutError("Network error — could not reach the server. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #06040f)" }}>

      {/* ── Navbar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: scrolled ? "rgba(8,6,18,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        <div className="nav-inner">
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/wright-logo.svg" alt="Wright AI" width={24} height={24} style={{ opacity: 0.9 }} />
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Wright AI
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/docs" style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(175,169,236,0.6)", textDecoration: "none" }}>Docs</Link>
            <Link href="/dashboard" style={{
              padding: "8px 18px", borderRadius: 8,
              background: "rgba(83,74,183,0.2)", border: "1px solid rgba(127,119,221,0.3)",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#AFA9EC",
              textDecoration: "none",
            }}>
              Dashboard →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ textAlign: "center", padding: "80px 24px 56px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 999,
          background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.25)",
          marginBottom: 22,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#AFA9EC", letterSpacing: "0.06em" }}>Simple, transparent pricing</span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 52,
          color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1.06,
          marginBottom: 18,
        }}>
          Documentation that pays<br />for itself
        </h1>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 17, color: "rgba(175,169,236,0.65)",
          lineHeight: 1.75, marginBottom: 40,
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
                padding: "9px 22px", borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5,
                background: interval === iv ? "rgba(83,74,183,0.35)" : "transparent",
                color: interval === iv ? "#AFA9EC" : "rgba(175,169,236,0.4)",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {iv === "monthly" ? "Monthly" : (
                <>Annual <span style={{ fontSize: 10, background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(29,158,117,0.25)", padding: "2px 8px", borderRadius: 999 }}>Save 22%</span></>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Checkout error ── */}
      {checkoutError && (
        <div style={{ maxWidth: 1400, margin: "-24px auto 24px", padding: "0 48px" }}>
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
        maxWidth: 1400, margin: "0 auto", padding: "0 48px 72px",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
      }}>
        {PLANS.map(plan => {
          const price = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const showSavings = interval === "annual" && plan.monthlyPrice > 0 && !plan.comingSoon;

          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                background: plan.highlighted
                  ? "linear-gradient(145deg, rgba(83,74,183,0.2) 0%, rgba(6,4,15,0.95) 100%)"
                  : "rgba(255,255,255,0.025)",
                border: plan.highlighted
                  ? "1px solid rgba(127,119,221,0.5)"
                  : "1px solid rgba(175,169,236,0.08)",
                borderRadius: 20, padding: "36px 30px 30px",
                display: "flex", flexDirection: "column",
                opacity: plan.comingSoon ? 0.82 : 1,
                boxShadow: plan.highlighted ? "0 0 56px rgba(83,74,183,0.14)" : "none",
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
                  padding: "4px 16px", borderRadius: 999, whiteSpace: "nowrap",
                  background: plan.highlighted ? "#534AB7" : "rgba(83,74,183,0.15)",
                  color: plan.highlighted ? "#fff" : "#AFA9EC",
                  border: plan.highlighted ? "none" : "1px solid rgba(83,74,183,0.25)",
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 50, color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {price === 0 ? "Free" : `$${price}`}
                </span>
                {price > 0 && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(175,169,236,0.4)", marginBottom: 8 }}>
                    /mo{plan.comingSoon ? " / seat" : ""}
                  </span>
                )}
              </div>

              {/* Savings line */}
              {showSavings && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(175,169,236,0.38)", marginBottom: 4 }}>
                  <span style={{ textDecoration: "line-through" }}>${plan.monthlyPrice}/mo</span>
                  <span style={{ color: "#1D9E75", marginLeft: 8 }}>· saves ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr</span>
                </div>
              )}
              {interval === "annual" && plan.monthlyPrice > 0 && !plan.comingSoon && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.28)", marginBottom: 2 }}>
                  Billed ${plan.annualPrice * 12}/yr
                </div>
              )}

              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(175,169,236,0.5)", lineHeight: 1.65, marginTop: 14, marginBottom: 26 }}>
                {plan.description}
              </p>

              {/* CTA */}
              {plan.comingSoon ? (
                <a
                  href={plan.ctaHref}
                  style={{
                    display: "block", textAlign: "center",
                    padding: "13px 0", borderRadius: 10,
                    background: "rgba(83,74,183,0.1)", border: "1px solid rgba(83,74,183,0.2)",
                    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "#AFA9EC",
                    textDecoration: "none", marginBottom: 8,
                  }}
                >
                  {plan.cta}
                </a>
              ) : plan.id === "free" ? (
                <>
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block", textAlign: "center",
                      padding: "13px 0", borderRadius: 10,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(175,169,236,0.14)",
                      fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "rgba(175,169,236,0.85)",
                      textDecoration: "none", marginBottom: 6,
                    }}
                  >
                    {plan.cta}
                  </a>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(175,169,236,0.3)", textAlign: "center", margin: "0 0 22px" }}>
                    No credit card required
                  </p>
                </>
              ) : (
                <button
                  onClick={() => handleProCheckout(plan.id)}
                  disabled={checkoutLoading}
                  style={{
                    display: "block", width: "100%", textAlign: "center",
                    padding: "14px 0", borderRadius: 10, cursor: checkoutLoading ? "wait" : "pointer",
                    background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
                    border: "none",
                    fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14.5, color: "#fff",
                    marginBottom: 28, opacity: checkoutLoading ? 0.7 : 1,
                    transition: "opacity 0.15s",
                    boxShadow: "0 4px 20px rgba(83,74,183,0.32)",
                  }}
                >
                  {checkoutLoading ? "Loading…" : plan.cta}
                </button>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(175,169,236,0.07)", marginBottom: 22 }} />

              {/* Feature list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Check included={f.included} />
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.5,
                      color: f.included ? "rgba(175,169,236,0.85)" : "rgba(175,169,236,0.25)",
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

      {/* ── Section divider ── */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(175,169,236,0.12) 30%, rgba(83,74,183,0.2) 50%, rgba(175,169,236,0.12) 70%, transparent)", margin: "0 0 0" }} />

      {/* ── Enterprise callout ── */}
      <div style={{ background: "rgba(255,255,255,0.012)", padding: "72px 0 80px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(175,169,236,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 28, textAlign: "center" }}>For larger teams</p>
        </div>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
        <div style={{
          background: "rgba(83,74,183,0.05)", border: "1px solid rgba(127,119,221,0.13)",
          borderRadius: 16, padding: "32px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 10 }}>
              Enterprise
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["Self-hosted deployment + SSO + audit logs", "Custom model selection & SLA", "Commercial license (bypasses AGPL)"].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#534AB7", fontSize: 15, lineHeight: 1 }}>›</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(175,169,236,0.55)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <a
            href="mailto:hello@wrightai.live?subject=WrightAI Enterprise"
            style={{
              padding: "12px 28px", borderRadius: 10, whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(175,169,236,0.15)",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "rgba(175,169,236,0.8)",
              textDecoration: "none",
            }}
          >
            Contact us →
          </a>
        </div>
      </div>
      </div>{/* end enterprise section */}

      {/* ── Section divider ── */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(175,169,236,0.12) 30%, rgba(83,74,183,0.2) 50%, rgba(175,169,236,0.12) 70%, transparent)" }} />

      {/* ── Comparison table ── */}
      <div style={{ padding: "72px 0 96px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>

        {/* Section header */}
        <div style={{ marginBottom: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#AFA9EC", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Compare plans
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 32, color: "var(--text)", letterSpacing: "-0.03em", margin: 0 }}>
              Full feature comparison
            </h2>
          </div>
          <button
            onClick={() => setTableOpen(o => !o)}
            style={{
              background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.2)",
              borderRadius: 8, padding: "9px 18px", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "#AFA9EC",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ display: "block", transform: tableOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s", fontSize: 18, lineHeight: 1 }}>+</span>
            {tableOpen ? "Collapse" : "Expand all"}
          </button>
        </div>

        {tableOpen && (
          <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid rgba(175,169,236,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr>
                  {/* Pro accent bar spans the Pro column */}
                  <th style={{ padding: 0, background: "rgba(6,4,15,0.98)" }} />
                  <th style={{ padding: 0, background: "rgba(6,4,15,0.98)" }} />
                  <th style={{ padding: 0, background: "rgba(83,74,183,0.12)" }}>
                    <div style={{ height: 3, background: "linear-gradient(90deg, #534AB7, #7F77DD)" }} />
                  </th>
                  <th style={{ padding: 0, background: "rgba(6,4,15,0.98)" }} />
                </tr>
                <tr>
                  {[
                    { label: "Feature", align: "left" as const },
                    { label: "Free", align: "center" as const },
                    { label: "Pro", align: "center" as const },
                    { label: "Team", align: "center" as const },
                  ].map((h, i) => (
                    <th key={i} style={{
                      fontFamily: i === 0 ? "var(--font-body)" : "var(--font-mono)",
                      fontSize: i === 0 ? 12 : 12,
                      letterSpacing: i === 0 ? "normal" : "0.08em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: i === 2 ? "#AFA9EC" : i === 0 ? "rgba(175,169,236,0.4)" : "rgba(175,169,236,0.35)",
                      padding: i === 0 ? "18px 24px" : "18px 16px",
                      textAlign: h.align,
                      borderBottom: "1px solid rgba(175,169,236,0.08)",
                      background: i === 2 ? "rgba(83,74,183,0.1)" : "rgba(6,4,15,0.98)",
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((group, gi) => (
                  <Fragment key={group.category}>
                    {/* Category header row */}
                    <tr>
                      <td colSpan={4} style={{
                        padding: "20px 24px 10px",
                        background: gi === 0 ? "transparent" : "transparent",
                        borderTop: gi === 0 ? "none" : "1px solid rgba(175,169,236,0.06)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 26, height: 26, borderRadius: 7,
                            background: "rgba(83,74,183,0.12)", border: "1px solid rgba(127,119,221,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, color: "#AFA9EC", flexShrink: 0,
                          }}>
                            {group.icon}
                          </span>
                          <span style={{
                            fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
                            color: "rgba(175,169,236,0.7)", letterSpacing: "0.02em",
                          }}>
                            {group.category}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {/* Data rows */}
                    {group.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{
                          borderBottom: ri === group.rows.length - 1 ? "none" : "1px solid rgba(175,169,236,0.04)",
                        }}
                      >
                        {row.map((cell, ci) => (
                          <td key={ci} style={{
                            padding: ci === 0 ? "14px 24px 14px 44px" : "14px 16px",
                            textAlign: ci === 0 ? "left" : "center",
                            background: ci === 2 ? "rgba(83,74,183,0.04)" : "transparent",
                            verticalAlign: "middle",
                          }}>
                            {cell === "✓" ? (
                              <div style={{ display: "flex", justifyContent: "center" }}>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                  <circle cx="9" cy="9" r="9" fill="rgba(29,158,117,0.15)" />
                                  <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            ) : cell === "—" ? (
                              <div style={{ display: "flex", justifyContent: "center" }}>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                  <circle cx="9" cy="9" r="9" fill="rgba(255,255,255,0.03)" />
                                  <path d="M6 9h6" stroke="rgba(175,169,236,0.2)" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              </div>
                            ) : ci === 0 ? (
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(175,169,236,0.75)", lineHeight: 1.5 }}>
                                {cell}
                              </span>
                            ) : (
                              <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 13,
                                color: ci === 2 ? "#AFA9EC" : "rgba(175,169,236,0.6)",
                                fontWeight: ci === 2 ? 600 : 400,
                              }}>
                                {cell}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>{/* end comparison section */}

      {/* ── Section divider ── */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(175,169,236,0.12) 30%, rgba(83,74,183,0.2) 50%, rgba(175,169,236,0.12) 70%, transparent)" }} />

      {/* ── FAQ ── */}
      <div style={{ background: "rgba(255,255,255,0.012)", padding: "72px 0 100px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 32, color: "var(--text)", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 44 }}>
          Frequently asked questions
        </h2>
        {FAQ.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(175,169,236,0.4)", textAlign: "center", marginTop: 36 }}>
          Still have questions?{" "}
          <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC", textDecoration: "none" }}>hello@wrightai.live</a>
        </p>
      </div>
      </div>{/* end FAQ section */}

      {/* ── Section divider ── */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(175,169,236,0.12) 30%, rgba(83,74,183,0.2) 50%, rgba(175,169,236,0.12) 70%, transparent)" }} />

      {/* ── Bottom CTA ── */}
      <div style={{ textAlign: "center", padding: "72px 24px 110px" }}>
        <div style={{
          maxWidth: 520, margin: "0 auto",
          padding: "52px 44px", borderRadius: 20,
          background: "linear-gradient(145deg, rgba(83,74,183,0.14) 0%, rgba(6,4,15,0.9) 100%)",
          border: "1px solid rgba(127,119,221,0.2)",
        }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, color: "var(--text)", marginBottom: 12 }}>
            Start documenting today
          </h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(175,169,236,0.55)", marginBottom: 30, lineHeight: 1.7 }}>
            Free plan. No credit card. Two minutes to first docstring.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "13px 30px", borderRadius: 10,
                background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, color: "#fff",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(83,74,183,0.3)",
              }}
            >
              Install Extension →
            </a>
            <Link
              href="/docs"
              style={{
                padding: "13px 30px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(175,169,236,0.12)",
                fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15, color: "rgba(175,169,236,0.7)",
                textDecoration: "none",
              }}
            >
              Read the docs
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
