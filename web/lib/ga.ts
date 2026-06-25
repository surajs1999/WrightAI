"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

function send(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function setUserId(id: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("set", "user_id", id);
}

export const ga = {
  // ── Marketing CTAs ──────────────────────────────────────────────────
  ctaClick: (location: string) =>
    send("cta_click", { location }),

  installClick: (method: "vscode" | "pip") =>
    send("install_click", { method }),

  copyCommand: (command: string) =>
    send("copy_command", { command }),

  // ── Auth ────────────────────────────────────────────────────────────
  signUpInitiated: (method: "github" | "google") =>
    send("sign_up_initiated", { method }),

  signUp: (method: "github" | "google") =>
    send("sign_up", { method }),

  // ── Pricing / checkout ───────────────────────────────────────────────
  pricingToggle: (interval: "monthly" | "annual") =>
    send("pricing_toggle", { interval }),

  viewItem: (plan: string, interval: string) =>
    send("view_item", { item_name: plan, interval }),

  beginCheckout: (plan: string, interval: string, price: number) =>
    send("begin_checkout", { plan, interval, value: price, currency: "USD" }),

  purchase: (plan: string, interval: string, value: number, transactionId?: string) =>
    send("purchase", {
      plan, interval, value, currency: "USD",
      ...(transactionId ? { transaction_id: transactionId } : {}),
    }),

  // ── Homepage engagement ──────────────────────────────────────────────
  sectionView: (section: string) =>
    send("section_view", { section }),

  tabClick: (tab: string, context: string) =>
    send("tab_click", { tab, context }),

  // ── Language pages ───────────────────────────────────────────────────
  languagePageView: (language: string) =>
    send("language_page_view", { language }),

  // ── Behavioral signals ───────────────────────────────────────────────
  heroTerminalCompleted: () =>
    send("hero_terminal_completed"),

  timeOnSection: (section: string, seconds: number) =>
    send("time_on_section", { section, seconds }),

  compareCompetitorHover: (competitor: string, seconds: number) =>
    send("compare_competitor_hover", { competitor, seconds }),

  faqOpened: (question: string) =>
    send("faq_opened", { question }),

  feedbackAbandoned: (charsTyped: number) =>
    send("feedback_abandoned", { chars_typed: charsTyped }),

  // ── Scroll depth ─────────────────────────────────────────────────────
  scrollDepth: (pct: 25 | 50 | 75 | 90) =>
    send("scroll_depth", { percent: pct }),

  // ── Pricing drop-off signals ─────────────────────────────────────────
  pricingPlanHover: (plan: string) =>
    send("pricing_plan_hover", { plan }),

  pricingPlanCta: (plan: string, interval: string) =>
    send("pricing_plan_cta", { plan, interval }),

  pricingExitIntent: () =>
    send("pricing_exit_intent"),

  // ── Feature engagement ───────────────────────────────────────────────
  pillarTabClick: (pillar: string) =>
    send("pillar_tab_click", { pillar }),

  installCardView: (method: string) =>
    send("install_card_view", { method }),

  // ── Dashboard / product ──────────────────────────────────────────────
  dashboardFirstVisit: () =>
    send("dashboard_first_visit"),

  dashboardPageVisit: (page: string) =>
    send("dashboard_page_visit", { page }),

  repoConnected: (repoName?: string) =>
    send("repo_connected", { repo_name: repoName }),

  connectRepoError: (errorType: string) =>
    send("connect_repo_error", { error_type: errorType }),

  docsGenerated: (language: string, count: number, coverageBefore?: number, coverageAfter?: number) =>
    send("docs_generated", { language, count, coverage_before: coverageBefore, coverage_after: coverageAfter }),

  docsGeneratedFirstTime: () =>
    send("docs_generated_first_time"),

  driftDetected: (count: number) =>
    send("drift_detected", { drifts_found: count }),

  mcpSetupViewed: () =>
    send("mcp_setup_viewed"),

  chatInitiated: () =>
    send("chat_initiated"),

  feedbackSubmitted: () =>
    send("feedback_submitted"),

  // ── Docs engagement ──────────────────────────────────────────────────
  docsSectionRead: (section: string) =>
    send("docs_section_read", { section }),

  // ── Language page CTA ────────────────────────────────────────────────
  languageCtaClick: (language: string, location: string) =>
    send("language_cta_click", { language, location }),

  // ── Return visit ─────────────────────────────────────────────────────
  returnVisit: () =>
    send("return_visit"),
};
