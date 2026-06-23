import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import NavbarV2 from "@/components/landing-v2/NavbarV2";
import FooterV2 from "@/components/landing-v2/FooterV2";
import LanguagePageEvents from "@/components/landing-v2/LanguagePageEvents";

/* ── language data ────────────────────────────────────────────────────── */
const LANGUAGES = {
  python: {
    name: "Python", styles: ["Google", "NumPy", "Sphinx", "Epytext"],
    install: "pip install wright", installLabel: "pip install wright",
    title: "Python Docstring Generator — Wright AI",
    description: "Auto-generate Google, NumPy, and Sphinx docstrings for Python functions with AI. Detect documentation drift in CI. Free VS Code extension and CLI.",
    headline: "Auto-generate Python docstrings with AI",
    subheadline: "One command writes Google, NumPy, or Sphinx docstrings for every undocumented function in your Python project — with drift detection to catch stale docs before they merge.",
    keywords: ["python docstring generator","auto generate python docstrings","python documentation generator","google style docstring generator","numpy docstring generator","sphinx docstring generator","ai python documentation","python doc generator vscode"],
    color: "#3B82F6",
    example: {
      before: `def calculate_discount(price, user_tier, coupon_code=None):
    if user_tier == "premium":
        discount = 0.20
    elif coupon_code and coupon_code in VALID_COUPONS:
        discount = VALID_COUPONS[coupon_code]
    else:
        discount = 0.0
    return price * (1 - discount)`,
      after: `def calculate_discount(price, user_tier, coupon_code=None):
    """Calculate the final price after applying tier and coupon discounts.

    Args:
        price (float): The original item price before discounts.
        user_tier (str): User membership tier. "premium" receives
            an automatic 20% discount.
        coupon_code (str, optional): Promotional code. Defaults to None.

    Returns:
        float: The discounted price.

    Example:
        >>> calculate_discount(100.0, "premium")
        80.0
    """`,
      style: "Google",
    },
    comparisons: [
      { tool: "Writing manually", gap: "Takes 5–10 min per function. Gets skipped under deadline pressure. Goes stale silently." },
      { tool: "GitHub Copilot", gap: "Suggests one function at a time on demand. No batch generation, no coverage tracking, no drift detection." },
      { tool: "Sphinx autodoc", gap: "Generates docs from existing docstrings — it doesn't write them. You still need to author every string." },
    ],
  },
  typescript: {
    name: "TypeScript", styles: ["JSDoc"],
    install: "pip install wright", installLabel: "pip install wright",
    title: "TypeScript JSDoc Generator — Wright AI",
    description: "Auto-generate JSDoc comments for TypeScript functions and classes with AI. Detect documentation drift in CI. Free VS Code extension.",
    headline: "Auto-generate TypeScript JSDoc with AI",
    subheadline: "Wright AI reads your TypeScript call graph and writes complete JSDoc comments for every undocumented function — then watches for drift when your types change.",
    keywords: ["typescript jsdoc generator","auto generate typescript documentation","typescript documentation generator","jsdoc generator vscode","ai typescript docs","typescript doc generator","generate jsdoc from typescript","typescript documentation tool"],
    color: "#3178C6",
    example: {
      before: `export async function refreshAuthToken(
  token: string,
  options?: { force?: boolean; audience?: string }
): Promise<AuthToken> {
  const decoded = verifyToken(token);
  if (!options?.force && !isNearExpiry(decoded)) return { token, refreshed: false };
  const newToken = await issueToken(decoded.userId, options?.audience);
  await invalidateToken(token);
  return { token: newToken, refreshed: true };
}`,
      after: `/**
 * Refreshes a JWT token if near expiry or forced.
 *
 * @param token - The existing JWT to evaluate for refresh.
 * @param options - Optional refresh configuration.
 * @param options.force - If true, refresh unconditionally.
 * @param options.audience - OAuth audience for the new token.
 * @returns Resolves to an AuthToken with a refreshed flag.
 */
export async function refreshAuthToken(
  token: string,
  options?: { force?: boolean; audience?: string }
): Promise<AuthToken> {`,
      style: "JSDoc",
    },
    comparisons: [
      { tool: "Writing manually", gap: "JSDoc for a complex generic function takes 10+ min. Types drift as signatures evolve." },
      { tool: "TypeDoc", gap: "Generates an HTML site from existing JSDoc — it doesn't write the comments for you." },
      { tool: "Copilot inline", gap: "One suggestion at a time. No project-wide coverage, no CI enforcement, no drift alerts." },
    ],
  },
  javascript: {
    name: "JavaScript", styles: ["JSDoc"],
    install: "pip install wright", installLabel: "pip install wright",
    title: "JavaScript JSDoc Generator — Wright AI",
    description: "Auto-generate JSDoc comments for JavaScript functions with AI. Detect stale documentation in CI. Free VS Code extension and CLI tool.",
    headline: "Auto-generate JavaScript JSDoc with AI",
    subheadline: "Wright AI writes JSDoc for every undocumented JavaScript function in your project — reading callers and callees for accurate context, not just the function body.",
    keywords: ["javascript jsdoc generator","javascript documentation generator","auto generate jsdoc","javascript doc generator","ai javascript documentation","jsdoc comment generator","javascript documentation tool"],
    color: "#F7DF1E",
    example: {
      before: `async function processWebhook(payload, signature, config) {
  if (!verifySignature(payload, signature, config.secret)) {
    throw new WebhookError("Invalid signature", 401);
  }
  const event = JSON.parse(payload);
  await queue.push({ event, retries: 0, receivedAt: Date.now() });
  return { accepted: true, eventId: event.id };
}`,
      after: `/**
 * Validates and enqueues an incoming webhook payload.
 *
 * @param {string} payload - Raw request body as UTF-8.
 * @param {string} signature - HMAC-SHA256 from the request header.
 * @param {{ secret: string }} config - Webhook configuration.
 * @returns {Promise<{ accepted: boolean, eventId: string }>}
 * @throws {WebhookError} If the signature does not match (HTTP 401).
 */
async function processWebhook(payload, signature, config) {`,
      style: "JSDoc",
    },
    comparisons: [
      { tool: "Writing JSDoc manually", gap: "Repetitive and time-consuming. Skipped under pressure and never caught up later." },
      { tool: "ESDoc / JSDoc CLI", gap: "Generates documentation sites from existing comments — does not write comments for you." },
      { tool: "ChatGPT / Claude (ad-hoc)", gap: "No call graph context. No batch mode. No coverage report. No CI enforcement." },
    ],
  },
  go: {
    name: "Go", styles: ["godoc"],
    install: "pip install wright", installLabel: "pip install wright",
    title: "Go Documentation Generator — Wright AI",
    description: "Auto-generate godoc comments for Go functions and packages with AI. Detect documentation drift in CI. Free CLI tool and VS Code extension.",
    headline: "Auto-generate Go godoc comments with AI",
    subheadline: "Wright AI writes godoc-style comments for every undocumented Go function — following the convention that the first sentence is the summary — then enforces coverage in CI.",
    keywords: ["go documentation generator","golang doc generator","go godoc generator","auto generate go comments","golang documentation tool","go doc ai generator","godoc comment generator"],
    color: "#00ACD7",
    example: {
      before: `func (c *Client) ExecuteWithRetry(ctx context.Context, req *Request, maxAttempts int) (*Response, error) {
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		resp, err := c.execute(ctx, req)
		if err == nil { return resp, nil }
		if !isRetryable(err) { return nil, err }
		lastErr = err
	}
	return nil, fmt.Errorf("all %d attempts failed: %w", maxAttempts, lastErr)
}`,
      after: `// ExecuteWithRetry sends req and retries on retryable errors with
// exponential backoff, up to maxAttempts total attempts.
//
// Returns the first successful Response, or an error wrapping
// the last failure if all attempts are exhausted.
func (c *Client) ExecuteWithRetry(ctx context.Context, req *Request, maxAttempts int) (*Response, error) {`,
      style: "godoc",
    },
    comparisons: [
      { tool: "go doc (stdlib)", gap: "Reads and formats existing godoc — does not generate comments for undocumented functions." },
      { tool: "godocdown / swaggo", gap: "Exports existing docs to Markdown/Swagger. Still requires you to author every comment." },
      { tool: "Copilot", gap: "Suggests one comment at a time. No project-wide coverage report or CI gate." },
    ],
  },
  rust: {
    name: "Rust", styles: ["rustdoc"],
    install: "pip install wright", installLabel: "pip install wright",
    title: "Rust Documentation Generator — Wright AI",
    description: "Auto-generate rustdoc comments for Rust functions and structs with AI. Detect documentation drift in CI. Free CLI tool and VS Code extension.",
    headline: "Auto-generate Rust rustdoc comments with AI",
    subheadline: "Wright AI writes rustdoc-style /// comments for undocumented Rust functions and structs — including Panics, Errors, and Examples sections — then catches drift when signatures change.",
    keywords: ["rust documentation generator","rustdoc generator","auto generate rust docs","rust doc generator","rust documentation tool","ai rust documentation","cargo doc generator"],
    color: "#CE422B",
    example: {
      before: `pub fn parse_connection_string(s: &str) -> Result<ConnectionConfig, ConfigError> {
    let parts: Vec<&str> = s.splitn(2, "://").collect();
    if parts.len() != 2 { return Err(ConfigError::MissingScheme); }
    let scheme = Scheme::try_from(parts[0])?;
    ConnectionConfig::from_parts(scheme, parts[1])
}`,
      after: `/// Parses a connection string into a validated \`ConnectionConfig\`.
///
/// # Errors
///
/// Returns \`ConfigError::MissingScheme\` if the input lacks \`://\`.
/// Returns \`ConfigError::UnknownScheme\` if the scheme is not recognised.
///
/// # Examples
///
/// \`\`\`
/// let cfg = parse_connection_string("postgres://localhost:5432/mydb")?;
/// \`\`\`
pub fn parse_connection_string(s: &str) -> Result<ConnectionConfig, ConfigError> {`,
      style: "rustdoc",
    },
    comparisons: [
      { tool: "cargo doc", gap: "Renders existing rustdoc into HTML — does not write them for you." },
      { tool: "rust-analyzer hints", gap: "Shows inlay hints for types inline. Does not generate doc comments." },
      { tool: "ChatGPT / Claude (manual)", gap: "Generates one docstring at a time. No batch mode, no coverage tracking, no CI gate." },
    ],
  },
};

type LangKey = keyof typeof LANGUAGES;

export async function generateStaticParams() {
  return Object.keys(LANGUAGES).map((language) => ({ language }));
}

export async function generateMetadata({ params }: { params: Promise<{ language: string }> }): Promise<Metadata> {
  const { language } = await params;
  const lang = LANGUAGES[language as LangKey];
  if (!lang) return {};
  return {
    title: lang.title,
    description: lang.description,
    keywords: lang.keywords,
    alternates: { canonical: `https://wrightai.live/${language}` },
    openGraph: { title: lang.title, description: lang.description, url: `https://wrightai.live/${language}` },
  };
}

/* ── icons ────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    color: "#7F77DD",
    title: "Call-graph context",
    desc: "Wright builds a dependency graph before generating. It reads what calls your function and what it calls — so docs describe purpose, not just mechanics.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    color: "#1D9E75",
    title: "Coverage tracking",
    desc: "Know the exact % of documented functions across every file. Set a minimum threshold and enforce it in CI so coverage never regresses.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    color: "#EF9F27",
    title: "Drift detection",
    desc: "When a function signature changes, Wright flags the stale docstring — as a VS Code gutter warning and a CI failure. No more silent documentation lies.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    ),
    color: "#00D4FF",
    title: "MCP for AI tools",
    desc: "Exposes your indexed docs to Claude Code, Cursor, and Copilot via MCP so every AI response is grounded in live, verified codebase knowledge.",
  },
];

/* ── page ─────────────────────────────────────────────────────────────── */
export default async function LanguagePage({ params }: { params: Promise<{ language: string }> }) {
  const { language } = await params;
  const lang = LANGUAGES[language as LangKey];
  if (!lang) notFound();

  const BASE = "https://wrightai.live";
  const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: lang.title, item: `${BASE}/${language}` },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `How do I auto-generate ${lang.name} documentation with AI?`, acceptedAnswer: { "@type": "Answer", text: `Install Wright AI with pip install wright or the VS Code extension. Run wright generate . in your ${lang.name} project — Wright AI reads every function and generates ${lang.styles.join(", ")} style documentation automatically.` } },
      { "@type": "Question", name: `What documentation styles does Wright AI support for ${lang.name}?`, acceptedAnswer: { "@type": "Answer", text: `Wright AI supports ${lang.styles.join(", ")} style documentation for ${lang.name}.` } },
      { "@type": "Question", name: `How does Wright AI detect documentation drift in ${lang.name}?`, acceptedAnswer: { "@type": "Answer", text: `Wright AI compares function signatures against existing docstrings on every file save (VS Code) or via wright drift . (CLI). Renamed params, changed return types — all flagged automatically.` } },
      { "@type": "Question", name: `Is Wright AI free for ${lang.name} projects?`, acceptedAnswer: { "@type": "Answer", text: `Yes. The VS Code extension, CLI, and MCP server are completely free. Sign in at wrightai.live with GitHub or Google.` } },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <LanguagePageEvents language={language} />
      <NavbarV2 />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 96, paddingLeft: 80, paddingRight: 80, position: "relative", overflow: "hidden" }}>
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(175,169,236,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 600, height: 600, background: "rgba(83,74,183,0.2)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "20%", right: "-8%", width: 500, height: 500, background: "rgba(0,212,255,0.1)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link>
            <span style={{ color: "rgba(175,169,236,0.3)" }}>/</span>
            <span style={{ color: "var(--text-muted)" }}>{lang.name}</span>
          </div>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, marginBottom: 28, background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.3)" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--purple-light)", boxShadow: "0 0 8px var(--purple-light)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--purple-light)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {lang.name} · {lang.styles.join(" · ")}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(38px, 5vw, 68px)", lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: 24, maxWidth: 800 }}>
            {lang.headline.replace("Auto-generate", "").trim().split(" ")[0]}{" "}
            <span style={{ background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 55%, #1D9E75 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {lang.headline.replace("Auto-generate", "").trim().split(" ").slice(1).join(" ")}
            </span>
            <br />
            <span style={{ color: "var(--text)" }}>Auto-generated.</span>
          </h1>

          <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 620, marginBottom: 40 }}>
            {lang.subheadline}
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 56 }}>
            <Link href="/dashboard" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 10, background: "linear-gradient(135deg, #00B8E0 0%, #00D4FF 100%)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, color: "#050310", boxShadow: "0 0 28px rgba(0,212,255,0.3)" }}>
              Start Free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 22px", borderRadius: 10, border: "1px solid rgba(175,169,236,0.25)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-code)", background: "rgba(13,11,31,0.8)" }}>
              {lang.installLabel}
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
            {[
              { val: lang.styles.length === 1 ? lang.styles[0] : `${lang.styles.length} styles`, label: "Doc styles supported" },
              { val: "0", label: "Config required" },
              { val: "Free", label: "No credit card" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {i > 0 && <div style={{ width: 1, height: 28, background: "rgba(175,169,236,0.12)" }} />}
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ──────────────────────────────────────────────── */}
      <section style={{ padding: "96px 80px", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(127,119,221,0.5) 30%, rgba(127,119,221,0.5) 70%, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52'%3E%3Cpolygon points='30,2 58,17 58,35 30,50 2,35 2,17' fill='none' stroke='rgba(127,119,221,0.06)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 52px", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>See it in action</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(28px, 3vw, 44px)", letterSpacing: "-0.03em", marginBottom: 10 }}>
            Before and after —{" "}
            <span style={{ color: "var(--purple-light)" }}>{lang.styles[0]} style</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", marginBottom: 40, maxWidth: 540 }}>
            Wright AI reads the function body, its callers, and its callees — generating documentation that reflects real intent, not just syntax.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Before */}
            <div style={{ background: "#07051a", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 48px rgba(0,0,0,0.4)" }}>
              <div style={{ padding: "11px 16px", background: "rgba(226,75,74,0.06)", borderBottom: "1px solid rgba(226,75,74,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.8 }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.8 }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(175,169,236,0.2)", display: "block" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(226,75,74,0.7)", marginLeft: 8, letterSpacing: "0.06em" }}>BEFORE · undocumented</span>
              </div>
              <pre style={{ margin: 0, padding: "20px 22px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(175,169,236,0.5)", lineHeight: 1.8, overflowX: "auto" }}>
                {lang.example.before}
              </pre>
            </div>

            {/* After */}
            <div style={{ background: "#07051a", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 48px rgba(0,0,0,0.4), 0 0 40px rgba(29,158,117,0.07)" }}>
              <div style={{ padding: "11px 16px", background: "rgba(29,158,117,0.06)", borderBottom: "1px solid rgba(29,158,117,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E24B4A", display: "block", opacity: 0.8 }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF9F27", display: "block", opacity: 0.8 }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75", display: "block" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(29,158,117,0.9)", marginLeft: 8, letterSpacing: "0.06em" }}>AFTER · wright generate</span>
              </div>
              <pre style={{ margin: 0, padding: "20px 22px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-code)", lineHeight: 1.8, overflowX: "auto" }}>
                {lang.example.after}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 80px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(29,158,117,0.5) 30%, rgba(29,158,117,0.5) 70%, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "-5%", width: 500, height: 500, background: "rgba(29,158,117,0.07)", borderRadius: "50%", filter: "blur(110px)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>How it works</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(28px, 3vw, 44px)", letterSpacing: "-0.03em", marginBottom: 14 }}>
            More than a docstring generator.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", marginBottom: 48, maxWidth: 520, lineHeight: 1.75 }}>
            WrightAI generates, verifies and maintains documentation — so docs stay accurate as your {lang.name} codebase evolves.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ padding: "28px 24px", borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14, transition: "border-color 0.25s, box-shadow 0.25s" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 80px", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(239,159,39,0.5) 30%, rgba(239,159,39,0.5) 70%, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='50'%3E%3Cpath d='M0 25 Q25 8 50 25 Q75 42 100 25 Q125 8 150 25 Q175 42 200 25' fill='none' stroke='rgba(239,159,39,0.05)' stroke-width='1.5'/%3E%3C/svg%3E\")", backgroundSize: "200px 50px", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--amber)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Comparison</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(28px, 3vw, 44px)", letterSpacing: "-0.03em", marginBottom: 14 }}>
            How Wright differs from alternatives.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", marginBottom: 48, maxWidth: 520, lineHeight: 1.75 }}>
            Most tools for {lang.name} documentation either render what exists or suggest one comment at a time. Wright does neither.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {lang.comparisons.map((c, i) => (
              <div key={i} style={{ background: "rgba(13,11,31,0.7)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px 24px", display: "flex", gap: 24, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 180 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>{c.tool}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 9px", borderRadius: 99, background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.2)" }}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(226,75,74,0.8)", letterSpacing: "0.04em" }}>gap</span>
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, flex: 1 }}>{c.gap}</p>
              </div>
            ))}

            {/* Wright row */}
            <div style={{ background: "rgba(83,74,183,0.08)", border: "1px solid rgba(127,119,221,0.25)", borderRadius: 14, padding: "22px 24px", display: "flex", gap: 24, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, width: 180 }}>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>Wright AI</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 9px", borderRadius: 99, background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)" }}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#1D9E75", letterSpacing: "0.04em" }}>solves this</span>
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(240,238,248,0.85)", lineHeight: 1.7, flex: 1 }}>
                Batch-generates {lang.styles.join("/")} documentation across your entire {lang.name} codebase. Tracks coverage. Detects drift on every commit. Feeds live docs to AI tools via MCP. Free to start.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 80px 120px", background: "var(--bg)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(127,119,221,0.5) 20%, rgba(0,212,255,0.55) 45%, rgba(29,158,117,0.5) 75%, transparent 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(83,74,183,0.18) 0%, rgba(0,212,255,0.05) 50%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(175,169,236,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(175,169,236,0.025) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />

        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, marginBottom: 32, background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.3)" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", boxShadow: "0 0 8px #1D9E75", animation: "pulse-soft 0.8s ease-in-out infinite" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Documentation Intelligence Platform</span>
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(30px, 4.5vw, 58px)", letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20 }}>
            Start documenting your{" "}
            <span style={{ background: "linear-gradient(135deg, #7F77DD 0%, #00D4FF 55%, #1D9E75 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {lang.name} codebase.
            </span>
          </h2>

          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", marginBottom: 44, lineHeight: 1.7 }}>
            Free VS Code extension · CLI · GitHub Action · MCP server.<br />No credit card required.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 38px", borderRadius: 10, background: "linear-gradient(135deg, #00B8E0 0%, #00D4FF 100%)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16, color: "#050310", boxShadow: "0 0 36px rgba(0,212,255,0.35)" }}>
              Start Free
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/docs" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 10, border: "1px solid rgba(175,169,236,0.25)", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-muted)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      <FooterV2 />
    </div>
  );
}
