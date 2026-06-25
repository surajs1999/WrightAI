# GA4 Events — WrightAI

**Measurement ID:** `G-934CQXQ86Z`  
**Utility module:** `web/lib/ga.ts`  
**Last updated:** 2026-06-25

All events are fired via the typed `ga` helper. The helper silently no-ops during SSR and when `window.gtag` is not yet loaded.

```ts
import { ga } from "@/lib/ga";
ga.eventName(params);
```

---

## Event Reference

### Marketing CTAs

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `cta_click` | `location: string` | NavbarV2, HeroV2, FinalCTAV2 | Which CTA drives sign-up. `location` = `"navbar"` \| `"hero"` \| `"hero_get_started"` \| `"final_cta"` |
| `install_click` | `method: "vscode" \| "pip"` | GetStarted card CTA | VS Code Marketplace button clicks |
| `copy_command` | `command: string` | GetStarted code block CopyBtn | pip install copy-to-clipboard |

---

### Authentication

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `sign_up_initiated` | `method: "github" \| "google"` | `app/login/page.tsx` — auth button click | Tracks intent before OAuth redirect. Stored in `sessionStorage` as `wright_sign_up_method`. |
| `sign_up` | `method: "github" \| "google"` | `app/dashboard/page.tsx` — first useEffect, reads sessionStorage | Fires on first dashboard load after successful OAuth. Method carried over from login via sessionStorage handoff. |

---

### Pricing & Checkout

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `pricing_toggle` | `interval: "monthly" \| "annual"` | `app/pricing/page.tsx` — toggle button | Tracks monthly vs annual preference |
| `view_item` | `item_name: string, interval: string` | `app/pricing/page.tsx` | GA4 standard ecommerce event (available but not yet wired to a trigger) |
| `pricing_plan_hover` | `plan: string` | `app/pricing/page.tsx` — plan card `onMouseEnter` | Which plan the visitor showed interest in |
| `pricing_plan_cta` | `plan: string, interval: string` | `app/pricing/page.tsx` — free/team CTA clicks | Free plan "Get started free" and Team "Join waitlist" clicks |
| `pricing_exit_intent` | — | `app/pricing/page.tsx` — `mouseleave` on `document` toward top of page | User about to leave pricing without checkout. Fires when `clientY < 10` |
| `begin_checkout` | `plan, interval, value, currency: "USD"` | `app/pricing/page.tsx` — `handleProCheckout` before `Paddle.Checkout.open()` | Checkout flow started. `value` = 14 (annual) or 18 (monthly) |
| `purchase` | `plan, interval, value, currency, transaction_id?` | `app/pricing/page.tsx` — `checkout.completed` Paddle event | Successful payment. Includes Paddle `transaction_id` when available. |

---

### Homepage Engagement

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `section_view` | `section: string` | `components/landing-v2/ScrollRuler.tsx` — IntersectionObserver | Fires when each section enters the viewport centre. Deduplicated per section per page load. |
| `scroll_depth` | `percent: 25 \| 50 \| 75 \| 90` | `components/landing-v2/HomepageAnalytics.tsx` — scroll listener | Fires once per milestone per session. Tracks how far down the homepage visitors scroll. |
| `time_on_section` | `section: string, seconds: number` | `components/landing-v2/HomepageAnalytics.tsx` — IntersectionObserver + `beforeunload` | Time in seconds spent with a section ≥30% in viewport. Only fires if ≥5 seconds. Sections tracked: The Problem, How It Works, Drift Detection, Get Started, Compare, Why Now, Feedback. |
| `hero_terminal_completed` | — | `components/landing-v2/HeroV2.tsx` — `DriftTerminal` `done` state | User watched the full drift-detect-fix terminal animation (~6 seconds). Strong intent signal. |
| `pillar_tab_click` | `pillar: string` | `components/landing-v2/ThreePillars.tsx` — tab button `onClick` | Which of Generate / Verify / Understand the user clicked |
| `tab_click` | `tab: string, context: string` | Available in `ga.ts`, not yet wired | Generic tab tracking for future use |
| `return_visit` | — | `components/landing-v2/HomepageAnalytics.tsx` — sessionStorage check | Fires if `wright_visited` key exists in sessionStorage, meaning this is not the browser's first session on the site |

---

### Behavioral Signals

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `compare_competitor_hover` | `competitor: string, seconds: number` | `components/landing-v2/CompareV2.tsx` — column `th` `onMouseEnter/Leave` | Which competitor column the visitor hovered, and for how long. Only fires for non-Wright columns. Minimum 2 seconds to exclude accidental mouse-overs. |
| `faq_opened` | `question: string` | `app/pricing/page.tsx` — `FaqItem` `onClick` | Full text of the FAQ question expanded. Fires only on open (not close). Reveals conversion objections. |
| `feedback_abandoned` | `chars_typed: number` | `components/landing-v2/FeedbackV2.tsx` — textarea `onBlur` | User typed in the feedback form but left without submitting. Only fires if `input.trim().length > 0` and form not already sent. |

---

### Language Pages

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `language_page_view` | `language: string` | `components/landing-v2/LanguagePageEvents.tsx` — `useEffect` on mount | Fires on every `/python`, `/typescript`, `/javascript`, `/go`, `/rust` page load. Used to see which language pages drive the most sign-ups. |
| `language_cta_click` | `language: string, location: string` | Available in `ga.ts`, not yet wired | Reserved for CTA tracking on language pages |

---

### Dashboard / Activation

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `dashboard_first_visit` | — | `app/dashboard/page.tsx` — first useEffect, localStorage guard | Fires exactly once per browser (localStorage key `wright_dashboard_visited`). Key activation funnel milestone. |
| `dashboard_page_visit` | `page: string` | `app/dashboard/[page]/page.tsx` — first useEffect | Fires on every dashboard sub-page visit. `page` = `"generate"` \| `"coverage"` \| `"drift"` \| `"chat"` \| `"mcp"` \| `"llms-txt"` |
| `repo_connected` | `repo_name?: string` | `app/dashboard/page.tsx` — `fetch("/api/proxy/repos/connect")` success | Repository successfully connected. Core activation milestone. |
| `connect_repo_error` | `error_type: string` | `app/dashboard/page.tsx` — `fetch("/api/proxy/repos/connect")` failure | Repo connect failed. `error_type` = `"quota_exceeded"` \| `"plan_limit"` \| `"api_error"` \| `"network_error"` |
| `docs_generated` | `language, count, coverage_before?, coverage_after?` | Available in `ga.ts`, not yet wired to generate page | Batch doc generation completed. Wire to the generate dashboard page. |
| `docs_generated_first_time` | — | Available in `ga.ts`, not yet wired | Fires on the very first successful generation. Key activation moment. |
| `drift_detected` | `drifts_found: number` | Available in `ga.ts`, not yet wired | Drift scan results. Wire to drift dashboard page. |
| `mcp_setup_viewed` | — | `app/dashboard/mcp/page.tsx` — first useEffect | User visited MCP setup page. Power user signal. |
| `chat_initiated` | — | Available in `ga.ts`, not yet wired to chat page | First chat message sent. Wire to dashboard chat page. |

---

### Feedback

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `feedback_submitted` | — | `components/landing-v2/FeedbackV2.tsx` — after Supabase insert | User sent feedback via the homepage form |

---

### Docs Engagement

| Event name | Parameters | Where fired | Purpose |
|------------|-----------|-------------|---------|
| `docs_section_read` | `section: string` | Available in `ga.ts`, not yet wired | Which docs section the user reads. Wire via IntersectionObserver on docs `<section>` headings. |

---

## Funnel Funnels (built in GA4 Explore)

See `docs/GA4_SETUP.md` for step-by-step setup of all 5 funnels:

1. **Activation funnel** — `session_start` → `scroll_depth:50` → `cta_click` → `sign_up_initiated` → `sign_up` → `repo_connected` → `docs_generated`
2. **Pricing conversion** — `/pricing` page_view → `pricing_plan_hover` → `begin_checkout` → `purchase`
3. **Homepage depth** — section_view sequence through Problem → Drift → Compare → Get Started → CTA
4. **Post-signup activation** (7-day window) — `sign_up` → `dashboard_first_visit` → `repo_connected` → `docs_generated`
5. **Upgrade funnel** — quota usage → `/pricing` view → `pricing_toggle` → `begin_checkout` → `purchase`

---

## Events Not Yet Wired

All events in `ga.ts` are now wired. The only reserved event for future use:

| Event | When to wire |
|-------|-------------|
| `tab_click` | Any future generic tabbed UI outside of the existing pillar tabs |

### Previously unwired — now implemented (2026-06-25)

| Event | Now wired in |
|-------|-------------|
| `docs_generated` | `app/dashboard/generate/page.tsx` — on successful `/api/proxy/generate` response. `language` = style param, `count` = 1 per generation. |
| `docs_generated_first_time` | Same file — localStorage guard (`wright_docs_generated_first_time`) fires exactly once per browser |
| `drift_detected` | `app/dashboard/drift/page.tsx` — both Redis cached results path and live structural scan fallback |
| `chat_initiated` | `app/dashboard/chat/page.tsx` — `send()` when `messages.length === 0` (first message only) |
| `docs_section_read` | `app/docs/page.tsx` — IntersectionObserver on all NAV section IDs, deduped per page load |
| `language_cta_click` | `components/landing-v2/LanguageCTA.tsx` — tracked client component replacing the plain Link on hero and final CTA of all language pages |
| `view_item` | `app/pricing/page.tsx` — IntersectionObserver `ref` on each plan card (threshold 0.5) |
| `install_card_view` | `components/landing-v2/GetStarted.tsx` — Framer Motion `onViewportEnter` on each install card |

---

## Custom Dimensions to Register in GA4

Go to **GA4 → Configure → Custom definitions → Create custom dimension**:

| Dimension name | Scope | Event parameter |
|---------------|-------|-----------------|
| Section | Event | `section` |
| Pillar | Event | `pillar` |
| Install method | Event | `method` |
| Language | Event | `language` |
| Plan | Event | `plan` |
| Billing interval | Event | `interval` |
| Dashboard page | Event | `page_dashboard` |
| Error type | Event | `error_type` |
| Scroll percent | Event | `scroll_percent` |
| Competitor | Event | `competitor` |
| Time on section (seconds) | Event | `seconds` |
| Chars typed | Event | `chars_typed` |
