"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (ev: { name: string }) => void }) => void;
      Checkout: {
        open: (opts: {
          transactionId?: string;
          settings?: Record<string, unknown>;
        }) => void;
      };
    };
  }
}

function CheckoutLoader() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const ptxn = searchParams.get("_ptxn");

  useEffect(() => {
    if (initialized.current || !ptxn) return;
    initialized.current = true;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;

    const openCheckout = () => {
      window.Paddle?.Initialize({
        token,
        eventCallback(ev) {
          if (ev.name === "checkout.completed") {
            window.location.href = "/dashboard?upgraded=true";
          }
        },
      });
      window.Paddle?.Checkout.open({
        transactionId: ptxn,
        settings: { displayMode: "overlay", locale: "en" },
      });
    };

    if (window.Paddle) {
      openCheckout();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = openCheckout;
    document.head.appendChild(script);
  }, [ptxn]);

  if (!ptxn) {
    if (typeof window !== "undefined") window.location.href = "/pricing";
    return null;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#06040f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        textAlign: "center",
        fontFamily: "var(--font-body)",
        color: "rgba(175,169,236,0.55)",
        fontSize: 15,
      }}>
        Loading checkout…
      </div>
    </div>
  );
}

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        background: "#06040f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          textAlign: "center",
          fontFamily: "var(--font-body)",
          color: "rgba(175,169,236,0.55)",
          fontSize: 15,
        }}>
          Loading checkout…
        </div>
      </div>
    }>
      <CheckoutLoader />
    </Suspense>
  );
}
