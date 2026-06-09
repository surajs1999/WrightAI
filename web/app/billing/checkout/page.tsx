"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: "pri_01kt5dztgzehbz8b1gwd2y58k9",
    annual: "pri_01kt5e1gwgysmdgmjq73xecde2",
  },
};

function CheckoutLoader() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Break redirect loops: if we've already tried twice, give up
    const attempts = parseInt(sessionStorage.getItem("wright_checkout_attempts") || "0");
    if (attempts >= 2) {
      sessionStorage.removeItem("wright_checkout_attempts");
      sessionStorage.removeItem("wright_checkout_plan");
      sessionStorage.removeItem("wright_checkout_interval");
      setStatus("error");
      return;
    }
    sessionStorage.setItem("wright_checkout_attempts", String(attempts + 1));

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) { setStatus("error"); return; }

    const plan = sessionStorage.getItem("wright_checkout_plan") || "pro";
    const interval = sessionStorage.getItem("wright_checkout_interval") || "monthly";
    const priceId = PRICE_IDS[plan]?.[interval];
    if (!priceId) { setStatus("error"); return; }

    const run = async () => {
      // Always fetch fresh user info so api_key is never stale
      let email = "";
      let apiKey = "";
      try {
        const meRes = await fetch("/api/proxy/user/me");
        if (meRes.ok) {
          const me = await meRes.json() as { email?: string; api_key?: string };
          email = me.email ?? "";
          apiKey = me.api_key ?? "";
        }
      } catch { /* non-fatal — checkout proceeds without pre-fill */ }

      const openCheckout = () => {
        window.Paddle?.Initialize({
          token,
          eventCallback(ev) {
            if (ev.name === "checkout.completed") {
              sessionStorage.removeItem("wright_checkout_plan");
              sessionStorage.removeItem("wright_checkout_interval");
              sessionStorage.removeItem("wright_checkout_attempts");
              window.location.href = "/dashboard?upgraded=true";
            }
            if (ev.name === "checkout.error") {
              setStatus("error");
            }
          },
        });

        // 600 ms delay lets Paddle finish async initialisation before open
        setTimeout(() => {
          window.Paddle?.Checkout.open({
            items: [{ priceId, quantity: 1 }],
            ...(email ? { customer: { email } } : {}),
            customData: { api_key: apiKey, plan },
            settings: { displayMode: "overlay", locale: "en" },
          });
        }, 600);
      };

      if (window.Paddle) { openCheckout(); return; }

      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.onload = openCheckout;
      script.onerror = () => setStatus("error");
      document.head.appendChild(script);
    };

    run();
  }, [searchParams]);

  const container: React.CSSProperties = {
    minHeight: "100vh", background: "#06040f",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)",
  };

  if (status === "error") {
    return (
      <div style={container}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <p style={{ color: "rgba(175,169,236,0.7)", fontSize: 16, marginBottom: 8 }}>
            Checkout couldn&apos;t open.
          </p>
          <p style={{ color: "rgba(175,169,236,0.4)", fontSize: 14, marginBottom: 28 }}>
            Make sure pop-ups aren&apos;t blocked in your browser, then try again.
          </p>
          <a
            href="/pricing"
            style={{
              display: "inline-block", padding: "12px 28px", borderRadius: 10,
              background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)",
              color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15,
            }}
          >
            Back to pricing
          </a>
          <p style={{ marginTop: 20, color: "rgba(175,169,236,0.3)", fontSize: 13 }}>
            Still having trouble?{" "}
            <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC" }}>Contact us</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={{ color: "rgba(175,169,236,0.55)", fontSize: 15 }}>
        Opening checkout…
      </div>
    </div>
  );
}

const fallback = (
  <div style={{
    minHeight: "100vh", background: "#06040f",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)", color: "rgba(175,169,236,0.55)", fontSize: 15,
  }}>
    Opening checkout…
  </div>
);

export default function BillingCheckoutPage() {
  return <Suspense fallback={fallback}><CheckoutLoader /></Suspense>;
}
