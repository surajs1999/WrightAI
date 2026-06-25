"use client";

import Link from "next/link";
import { ga } from "@/lib/ga";

export default function LanguageCTA({ language }: { language: string }) {
  return (
    <Link
      href="/dashboard"
      onClick={() => ga.languageCtaClick(language, "hero")}
      style={{
        textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8,
        padding: "14px 32px", borderRadius: 10,
        background: "linear-gradient(135deg, #00B8E0 0%, #00D4FF 100%)",
        fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, color: "#050310",
        boxShadow: "0 0 28px rgba(0,212,255,0.3)",
      }}
    >
      Start Free
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </Link>
  );
}
