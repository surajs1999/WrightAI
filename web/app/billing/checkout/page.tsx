"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: "pri_01kt5dztgzehbz8b1gwd2y58k9",
    annual: "pri_01kt5e1gwgysmdgmjq73xecde2",
  },
};

type CheckoutNotice = { type: "error" | "success" | "info"; text: string };

const NOTICE_STYLES: Record<CheckoutNotice["type"], { bg: string; border: string; color: string; icon: string }> = {
  error: { bg: "rgba(226,75,74,0.08)", border: "rgba(226,75,74,0.3)", color: "#E24B4A", icon: "✕" },
  success: { bg: "rgba(29,158,117,0.08)", border: "rgba(29,158,117,0.3)", color: "#1D9E75", icon: "✓" },
  info: { bg: "rgba(83,74,183,0.08)", border: "rgba(127,119,221,0.3)", color: "#AFA9EC", icon: "ℹ" },
};

const container: React.CSSProperties = {
  minHeight: "100vh", background: "#06040f",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-body)",
};

function CheckoutLoader() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("_ptxn") ?? undefined;

  const [paddleReady, setPaddleReady] = useState(false);
  const [notice, setNotice] = useState<CheckoutNotice | null>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string; api_key?: string }>({});
  const completedRef = useRef(false);

  // Pre-fetch user info — no Checkout.open() here, so no user-gesture constraint.
  useEffect(() => {
    fetch("/api/proxy/user/me")
      .then(r => (r.ok ? r.json() : null))
      .then(me => setUserInfo(me ?? {}))
      .catch(() => setUserInfo({}));
  }, []);

  // Load and initialize Paddle.js so it's ready before the user clicks.
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
     
    if (!token) { setNotice({ type: "error", text: "Checkout is not configured." }); return; }

    const init = () => {
      window.Paddle?.Environment.set(token.startsWith("live_") ? "production" : "sandbox");
      window.Paddle?.Initialize({
        token,
        eventCallback(ev) {
          console.log("[Paddle]", ev.name, ev);
          if (ev.name === "checkout.completed") {
            completedRef.current = true;
            setNotice({ type: "success", text: "Payment successful — redirecting to your dashboard…" });
            sessionStorage.removeItem("wright_checkout_plan");
            sessionStorage.removeItem("wright_checkout_interval");
            const transactionId = ev.data?.transaction_id as string | undefined;
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
            setNotice({ type: "error", text: detail ? `Paddle: ${detail}` : `Paddle ${ev.name}` });
          }
          if (ev.name === "checkout.closed") {
            if (completedRef.current) return;
            setNotice({ type: "info", text: "Checkout closed — no charge was made. Click “Open checkout” whenever you’re ready." });
            setTimeout(() => {
              setNotice(n => (n?.type === "info" ? null : n));
            }, 6000);
          }
        },
      });
      setPaddleReady(true);
    };

    if (window.Paddle) { init(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = init;
    script.onerror = () => setNotice({ type: "error", text: "Couldn't load checkout. Please try again." });
    document.head.appendChild(script);
  }, []);

  // Synchronous click handler — this IS the user gesture the overlay needs.
  function openCheckout() {
    if (!window.Paddle) { setNotice({ type: "error", text: "Checkout not ready — please refresh and try again." }); return; }
    setNotice(null);
    completedRef.current = false;

    if (transactionId) {
      window.Paddle.Checkout.open({
        transactionId,
        settings: { displayMode: "overlay", locale: "en" },
      });
      return;
    }

    const plan = sessionStorage.getItem("wright_checkout_plan") || "pro";
    const interval = sessionStorage.getItem("wright_checkout_interval") || "monthly";
    const priceId = PRICE_IDS[plan]?.[interval];
    if (!priceId) { setNotice({ type: "error", text: "Plan not found — please go back to pricing and try again." }); return; }

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      ...(userInfo.email ? { customer: { email: userInfo.email } } : {}),
      customData: { api_key: userInfo.api_key ?? "", plan },
      settings: { displayMode: "overlay", locale: "en" },
    });
  }

  return (
    <div style={container}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
        <p style={{ color: "var(--text)", fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
          Complete your purchase
        </p>
        <p style={{ color: "rgba(175,169,236,0.5)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Click below to open the secure Paddle checkout.
        </p>

        {notice && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 20,
            background: NOTICE_STYLES[notice.type].bg,
            border: `1px solid ${NOTICE_STYLES[notice.type].border}`,
            color: NOTICE_STYLES[notice.type].color, fontSize: 13.5, textAlign: "left",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ flexShrink: 0 }}>{NOTICE_STYLES[notice.type].icon}</span>
            <span>{notice.text}</span>
          </div>
        )}

        <button
          onClick={openCheckout}
          disabled={!paddleReady}
          style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
            color: "#fff", fontWeight: 700, fontSize: 15,
            cursor: paddleReady ? "pointer" : "wait",
            opacity: paddleReady ? 1 : 0.7,
            marginBottom: 20,
          }}
        >
          {paddleReady ? "Open checkout" : "Loading…"}
        </button>

        <p style={{ margin: 0 }}>
          <Link href="/pricing" style={{ color: "#AFA9EC", fontSize: 13.5, textDecoration: "none" }}>
            ← Back to pricing
          </Link>
        </p>
        <p style={{ marginTop: 20, color: "rgba(175,169,236,0.3)", fontSize: 13 }}>
          Still having trouble?{" "}
          <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC" }}>Contact us</a>
        </p>
      </div>
    </div>
  );
}

const fallback = (
  <div style={{ ...container, color: "rgba(175,169,236,0.55)", fontSize: 15 }}>
    Loading…
  </div>
);

export default function BillingCheckoutPage() {
  return <Suspense fallback={fallback}><CheckoutLoader /></Suspense>;
}
