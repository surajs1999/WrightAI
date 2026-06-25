# GA4 Setup Guide — WrightAI

Measurement ID: `G-934CQXQ86Z`

---

## UTM Parameter Reference

Every link pointing to wrightai.live from an external source should carry UTM parameters so GA4 can attribute sessions to their source.

### Active UTM sources

| Source | Where | utm_source | utm_medium | utm_campaign |
|--------|-------|------------|------------|--------------|
| GitHub README | README.md badges + links | `github` | `readme` | `repo_readme` |
| VS Code Marketplace (extension README) | vscode-extension/README.md | `vscode_marketplace` | `extension_readme` | `extension_onboarding` |
| VS Code Marketplace (extension overview) | vscode-extension/OVERVIEW.md | `vscode_marketplace` | `extension_overview` | `extension_onboarding` |
| Welcome email | Brevo transactional | `email` | `transactional` | `welcome` |
| Quota 80% warning email | Brevo transactional | `email` | `transactional` | `quota_warning_80` |
| Quota exceeded email | Brevo transactional | `email` | `transactional` | `quota_exceeded` |
| Day-7 onboarding drip | Brevo drip | `email` | `drip` | `onboarding_day7` |
| Day-14 onboarding drip | Brevo drip | `email` | `drip` | `onboarding_day14` |

### UTMs to add when you post externally

Copy these base URLs when sharing anywhere:

```
# Hacker News / Reddit post
https://wrightai.live?utm_source=hackernews&utm_medium=social&utm_campaign=post&utm_content=show_hn

# Product Hunt launch
https://wrightai.live?utm_source=producthunt&utm_medium=listing&utm_campaign=launch&utm_content=tagline

# Twitter / X post
https://wrightai.live?utm_source=twitter&utm_medium=social&utm_campaign=general&utm_content=tweet

# LinkedIn post
https://wrightai.live?utm_source=linkedin&utm_medium=social&utm_campaign=general&utm_content=post

# PyPI package page (add to pyproject.toml homepage)
https://wrightai.live?utm_source=pypi&utm_medium=package_page&utm_campaign=pypi_listing&utm_content=homepage_link

# Dev.to / blog post
https://wrightai.live?utm_source=devto&utm_medium=blog&utm_campaign=content&utm_content=article_cta

# Newsletter mention / sponsorship
https://wrightai.live?utm_source=newsletter&utm_medium=email&utm_campaign=sponsorship&utm_content=cta
```

---

## GA4 Funnel Explorations

Go to **GA4 → Explore → Funnel exploration** to build each funnel below.

---

### Funnel 1: Awareness → Activation (primary)

**Purpose:** Where do visitors drop off before becoming active users?

**Steps:**

| Step | Event name | Condition |
|------|-----------|-----------|
| 1 | `session_start` | — |
| 2 | `scroll_depth` | `scroll_percent` = 50 |
| 3 | `cta_click` | any location |
| 4 | `sign_up_initiated` | — |
| 5 | `sign_up` | — |
| 6 | `repo_connected` | — |
| 7 | `docs_generated` | — |

**Segments to apply:** Breakdown by `utm_source` to see which channels produce the most activated users (not just sign-ups).

---

### Funnel 2: Pricing conversion (revenue)

**Purpose:** Where do visitors drop between landing on pricing and paying?

**Steps:**

| Step | Event name | Condition |
|------|-----------|-----------|
| 1 | `page_view` | `page_location` contains `/pricing` |
| 2 | `pricing_plan_hover` | — |
| 3 | `begin_checkout` | — |
| 4 | `purchase` | — |

**Key drop-off to watch:** Step 2→3 (saw the plans, didn't click any). This is the primary pricing friction point.

---

### Funnel 3: Homepage engagement depth

**Purpose:** How deep into the homepage do visitors get, and which section drives sign-up?

**Steps:**

| Step | Event name | Condition |
|------|-----------|-----------|
| 1 | `section_view` | `section` = "The Problem" |
| 2 | `section_view` | `section` = "Drift Detection" |
| 3 | `section_view` | `section` = "Compare" |
| 4 | `section_view` | `section` = "Get Started" |
| 5 | `cta_click` | — |

**Insight:** If 70% reach "The Problem" but only 20% reach "Get Started", you have a middle-page drop-off problem.

---

### Funnel 4: Post-sign-up activation (7-day)

**Purpose:** What % of new users connect a repo and generate docs within 7 days?

**Steps:**

| Step | Event name | Condition |
|------|-----------|-----------|
| 1 | `sign_up` | — |
| 2 | `dashboard_first_visit` | — |
| 3 | `repo_connected` | — |
| 4 | `docs_generated` | — |
| 5 | `dashboard_page_visit` | `page` = "drift" or "mcp" |

Set **completion window** to 7 days.

**Benchmark:** For developer tools, 30-40% of sign-ups should reach step 4 within 7 days. Below 20% = onboarding problem.

---

### Funnel 5: Upgrade funnel (free → pro)

**Purpose:** How does quota pressure translate to upgrades?

**Steps:**

| Step | Event name | Condition |
|------|-----------|-----------|
| 1 | `docs_generated` | `count` cumulative > 400 (approaching quota) |
| 2 | `page_view` | `page_location` contains `/pricing` |
| 3 | `pricing_toggle` | — |
| 4 | `begin_checkout` | — |
| 5 | `purchase` | — |

---

## GA4 Audiences to create

Go to **GA4 → Configure → Audiences** and create these for retargeting and analysis:

| Audience name | Conditions |
|--------------|-----------|
| **High-intent visitors** | `pricing_plan_hover` OR `scroll_depth` ≥ 75 AND no `sign_up` |
| **Pricing drop-offs** | `begin_checkout` AND no `purchase` within 7 days |
| **Activated users** | `docs_generated` within 7 days of `sign_up` |
| **Stalled sign-ups** | `sign_up` AND no `repo_connected` within 3 days |
| **Power users** | `docs_generated` count > 10 AND `dashboard_page_visit` `mcp` OR `drift` |
| **Pricing exit intent** | `pricing_exit_intent` fired |

---

## GA4 Custom dimensions to set up

Go to **GA4 → Configure → Custom definitions → Create custom dimension**:

| Dimension name | Scope | Event parameter |
|---------------|-------|-----------------|
| Section viewed | Event | `section` |
| Pillar tab | Event | `pillar` |
| Install method | Event | `method` |
| Language | Event | `language` |
| Plan name | Event | `plan` |
| Billing interval | Event | `interval` |
| Dashboard page | Event | `page_dashboard` |
| Error type | Event | `error_type` |
| Scroll percent | Event | `scroll_percent` |

---

## Recommended GA4 reports to check weekly

1. **Acquisition → Traffic acquisition** → filter by `utm_source` → which channels drive sign-ups
2. **Engagement → Events** → `pricing_exit_intent` vs `begin_checkout` ratio — your conversion rate
3. **Explore → Funnel** #1 → activation drop-off rate by cohort week
4. **Explore → Path** → session_start → what do users do FIRST on the homepage
5. **Explore → Cohort** → % of week-1 sign-ups who return in week 2

---

## Search Console integration (free, 5 min)

1. GA4 → Admin → Product links → Search Console → Link
2. This adds an **Organic Search** report showing which Google queries bring traffic to each page
3. Especially valuable for the language pages (`/python`, `/typescript`, etc.) — shows which keywords rank and drive clicks
