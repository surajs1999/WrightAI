"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NavbarV2 from "@/components/landing-v2/NavbarV2";
import FooterV2 from "@/components/landing-v2/FooterV2";
import { ga } from "@/lib/ga";


type Interval = "monthly" | "annual";

type CheckoutNotice = { type: "error" | "success" | "info"; text: string };

const NOTICE_STYLES: Record<CheckoutNotice["type"], { bg: string; border: string; color: string; icon: string }> = {
  error: { bg: "rgba(226,75,74,0.08)", border: "rgba(226,75,74,0.3)", color: "#E24B4A", icon: "✕" },
  success: { bg: "rgba(29,158,117,0.08)", border: "rgba(29,158,117,0.3)", color: "#1D9E75", icon: "✓" },
  info: { bg: "rgba(83,74,183,0.08)", border: "rgba(127,119,221,0.3)", color: "#AFA9EC", icon: "ℹ" },
};

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
    ctaHref: "/login",
    ctaExternal: false,
    highlighted: false,
    comingSoon: false,
    features: [
      { label: "VS Code extension", included: true },
      { label: "CLI & MCP server (self-hosted)", included: true },
      { label: "500 doc generations / month", included: true },
      { label: "200 drift detections / month", included: true },
      { label: "300 chat messages / month", included: true },
      { label: "Structural + semantic drift detection", included: true },
      { label: "Unlimited automated coverage scans", included: true },
      { label: "Usage dashboard + email support", included: true },
      { label: "1 repository · 1 API key", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most popular",
    monthlyPrice: 18,
    annualPrice: 14,
    description: "For active developers who need more power and automation.",
    cta: "Get started",
    ctaHref: "/dashboard",
    ctaExternal: false,
    highlighted: true,
    comingSoon: false,
    features: [
      { label: "Everything in Free", included: true },
      { label: "1,500 doc generations / month", included: true },
      { label: "1,000 drift detections / month", included: true },
      { label: "1,000 chat messages / month", included: true },
      { label: "Auto-PR for drift fixes", included: true },
      { label: "GitHub Action PR comments", included: true },
      { label: "5 repositories · 5 API keys", included: true },
      { label: "Enhanced dashboard (drift history & trends)", included: true },
      { label: "Prioritized support", included: true },
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
      { label: "Pooled generations, drift & chat quota", included: true },
      { label: "Org-wide coverage analytics", included: true },
      { label: "Centralized team dashboard", included: true },
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
    a: "Yes. The Free plan includes the VS Code extension, CLI, and MCP server with 500 doc generations, 200 drift detections, and 300 chat messages per month — no credit card required. Structural and semantic drift detection are both included on Free.",
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
      ["Doc generations / month", "500", "1,500", "Pooled / seat"],
      ["Drift detections / month", "200", "1,000", "Pooled / seat"],
      ["Chat messages / month", "300", "1,000", "Pooled / seat"],
      ["Connected repositories", "1", "5", "Unlimited"],
      ["API keys", "1", "5", "10"],
    ],
  },
  {
    category: "Core features",
    icon: "✦",
    rows: [
      ["VS Code extension", "✓", "✓", "✓"],
      ["CLI tool (self-hosted)", "✓", "✓", "✓"],
      ["MCP server", "✓", "✓", "✓"],
      ["Structural + semantic drift detection", "✓", "✓", "✓"],
      ["Codebase chat", "✓", "✓", "✓"],
      ["Coverage dashboard", "✓", "✓", "✓"],
      ["llms.txt generation", "✓", "✓", "✓"],
      ["Auto-PR for drift fixes", "—", "✓", "✓"],
      ["GitHub Action PR comments", "—", "✓", "✓"],
    ],
  },
  {
    category: "Support & analytics",
    icon: "◈",
    rows: [
      ["Email support", "✓", "✓", "✓"],
      ["Usage dashboard", "✓", "✓", "✓"],
      ["Enhanced dashboard (drift history & trends)", "—", "✓", "✓"],
      ["Prioritized support", "—", "✓", "✓"],
      ["Org-wide coverage reports", "—", "—", "✓"],
      ["Centralized team dashboard", "—", "—", "✓"],
      ["Priority support (SLA)", "—", "—", "✓"],
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
      onClick={() => { const opening = !open; setOpen(opening); if (opening) ga.faqOpened(q); }}
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

export function PricingContent({ embedded = false }: { embedded?: boolean }) {
  const [interval, setInterval] = useState<Interval>("annual");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Exit intent — user moves mouse toward top of page without starting checkout
  useEffect(() => {
    if (embedded) return;
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10 && !checkoutCompletedRef.current) {
        ga.pricingExitIntent();
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [embedded]);
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email?: string; api_key?: string } | null>(null);
  const checkoutCompletedRef = useRef(false);

  // Pre-fetch user info on load so handleProCheckout stays synchronous
  useEffect(() => {
    fetch("/api/proxy/user/me")
      .then(r => { if (r.status === 401) return null; return r.ok ? r.json() : null; })
      .then(me => setUserInfo(me ?? {}))
      .catch(() => setUserInfo({}));
  }, []);

  // Load Paddle.js
  useEffect(() => {
    if (embedded) return;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    const init = () => {
      // Live tokens start with "live_" — sandbox tokens start with "test_".
      // Environment must be set before Initialize().
      window.Paddle?.Environment.set(token.startsWith("live_") ? "production" : "sandbox");
      window.Paddle?.Initialize({
        token,
        eventCallback(ev) {
          console.log("[Paddle]", ev.name, ev);
          if (ev.name === "checkout.completed") {
            checkoutCompletedRef.current = true;
            setCheckoutNotice({ type: "success", text: "Payment successful — redirecting to your dashboard…" });
            const transactionId = ev.data?.transaction_id as string | undefined;
            const _plan = sessionStorage.getItem("wright_checkout_plan") ?? "pro";
            const _iv = sessionStorage.getItem("wright_checkout_interval") ?? "annual";
            ga.purchase(_plan, _iv, _iv === "annual" ? 14 : 18, transactionId);
            const sync = transactionId
              ? fetch("/api/proxy/billing/sync-transaction", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ transaction_id: transactionId }),
                }).catch(() => {})
              : Promise.resolve();
            sync.finally(() => {
              window.location.href = "/dashboard?upgraded=true";
            });
          }
          if (ev.name === "checkout.error" || ev.name === "checkout.warning") {
            const detail = typeof ev.error === "string"
              ? ev.error
              : ev.error?.detail ?? ev.error?.message ?? ev.error?.code;
            setCheckoutNotice({ type: "error", text: detail ? `Paddle: ${detail}` : `Paddle ${ev.name}` });
            setCheckoutLoading(false);
          }
          if (ev.name === "checkout.closed") {
            if (checkoutCompletedRef.current) return;
            setCheckoutNotice({ type: "info", text: "Checkout closed — no charge was made. Click “Get Started” whenever you’re ready." });
            setTimeout(() => {
              setCheckoutNotice(n => (n?.type === "info" ? null : n));
            }, 6000);
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

  // Synchronous click handler — no await before Paddle.Checkout.open so the
  // browser preserves the user-gesture context required for overlay iframes.
  function handleProCheckout(planId: string) {
    if (userInfo === null) {
      window.location.href = `/dashboard?redirect=/pricing`;
      return;
    }
    const priceId = PRICE_IDS[planId]?.[interval];
    if (!priceId) { setCheckoutNotice({ type: "error", text: "Plan not found — please try again." }); return; }
    if (!window.Paddle) { setCheckoutNotice({ type: "error", text: "Checkout not ready — please refresh and try again." }); return; }

    setCheckoutLoading(true);
    setCheckoutNotice(null);
    checkoutCompletedRef.current = false;

    sessionStorage.setItem("wright_checkout_plan", planId);
    sessionStorage.setItem("wright_checkout_interval", interval);
    sessionStorage.removeItem("wright_checkout_attempts");

    ga.beginCheckout(planId, interval, interval === "annual" ? 14 : 18);

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      ...(userInfo.email ? { customer: { email: userInfo.email } } : {}),
      customData: { api_key: userInfo.api_key ?? "", plan: planId },
      settings: { displayMode: "overlay", locale: "en" },
    });

    setCheckoutLoading(false);
  }

  return (
    <div style={embedded ? {} : { minHeight: "100vh", background: "var(--bg, #06040f)" }}>

      {/* ── Navbar (public page only) ── */}
      {!embedded && <NavbarV2 />}

      {/* ── Hero ── */}
      <div style={{ position: "relative", overflow: "hidden", paddingBottom: 8 }}>
        {/* Background */}
        {!embedded && <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(175,169,236,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: "radial-gradient(ellipse, rgba(83,74,183,0.25) 0%, rgba(0,212,255,0.07) 50%, transparent 72%)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", top: "20%", right: "-5%", width: 400, height: 400, background: "rgba(29,158,117,0.07)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
        </>}

        <div style={{ textAlign: "center", padding: "112px 24px 56px", maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 999, marginBottom: 28,
            background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.3)",
          }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--purple-light)", boxShadow: "0 0 8px var(--purple-light)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--purple-light)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Simple, transparent pricing</span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(38px, 5vw, 60px)",
            color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20,
          }}>
            Documentation that{" "}
            <span style={{ background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 55%, #1D9E75 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              pays for itself.
            </span>
          </h1>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 18, color: "var(--text-muted)",
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
              onClick={() => { setInterval(iv); ga.pricingToggle(iv); }}
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
      </div>{/* end hero background wrapper */}

      {/* ── Checkout notice ── */}
      {checkoutNotice && (
        <div style={{ maxWidth: 1400, margin: "-24px auto 24px", padding: "0 48px" }}>
          <div style={{
            padding: "13px 18px", borderRadius: 10,
            background: NOTICE_STYLES[checkoutNotice.type].bg,
            border: `1px solid ${NOTICE_STYLES[checkoutNotice.type].border}`,
            fontFamily: "var(--font-body)", fontSize: 13.5, color: NOTICE_STYLES[checkoutNotice.type].color,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ flexShrink: 0 }}>{NOTICE_STYLES[checkoutNotice.type].icon}</span>
            <span>{checkoutNotice.text}</span>
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
              onMouseEnter={() => ga.pricingPlanHover(plan.id)}
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
                  onClick={() => ga.pricingPlanCta(plan.id, interval)}
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
                    onClick={() => ga.pricingPlanCta("free", interval)}
                    {...(plan.ctaExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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

      {!embedded && <FooterV2 />}
    </div>
  );
}

export default function PricingPage() {
  return <PricingContent />;
}
