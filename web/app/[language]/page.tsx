import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const LANGUAGES = {
  python: {
    name: "Python",
    styles: ["Google", "NumPy", "Sphinx", "Epytext"],
    install: "pip install wright",
    installLabel: "pip install wright",
    title: "Python Docstring Generator — Wright AI",
    description:
      "Auto-generate Google, NumPy, and Sphinx docstrings for Python functions with AI. Detect documentation drift in CI. Free VS Code extension and CLI.",
    headline: "Auto-generate Python docstrings with AI",
    subheadline:
      "One command writes Google, NumPy, or Sphinx docstrings for every undocumented function in your Python project — with drift detection to catch stale docs before they merge.",
    keywords: [
      "python docstring generator",
      "auto generate python docstrings",
      "python documentation generator",
      "google style docstring generator",
      "numpy docstring generator",
      "sphinx docstring generator",
      "ai python documentation",
      "python doc generator vscode",
    ],
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

    Applies a 20% discount for premium users. For standard users,
    applies a coupon discount if a valid coupon code is provided.
    Falls back to no discount if neither condition is met.

    Args:
        price (float): The original item price before discounts.
        user_tier (str): User membership tier. "premium" receives
            an automatic 20% discount.
        coupon_code (str, optional): Promotional code to look up in
            VALID_COUPONS. Defaults to None.

    Returns:
        float: The discounted price. Equal to price if no discount applies.

    Example:
        >>> calculate_discount(100.0, "premium")
        80.0
        >>> calculate_discount(100.0, "standard", coupon_code="SAVE10")
        90.0
    """`,
      style: "Google",
    },
    comparisons: [
      {
        tool: "Writing manually",
        gap: "Takes 5–10 min per function. Gets skipped under deadline pressure. Goes stale silently.",
      },
      {
        tool: "GitHub Copilot",
        gap: "Suggests one function at a time on demand. No batch generation, no coverage tracking, no drift detection.",
      },
      {
        tool: "Sphinx autodoc",
        gap: "Generates docs from existing docstrings — it doesn't write them. You still need to author every string.",
      },
    ],
  },

  typescript: {
    name: "TypeScript",
    styles: ["JSDoc"],
    install: "pip install wright",
    installLabel: "pip install wright",
    title: "TypeScript JSDoc Generator — Wright AI",
    description:
      "Auto-generate JSDoc comments for TypeScript functions and classes with AI. Detect documentation drift in CI. Free VS Code extension.",
    headline: "Auto-generate TypeScript JSDoc with AI",
    subheadline:
      "Wright AI reads your TypeScript call graph and writes complete JSDoc comments for every undocumented function — then watches for drift when your types change.",
    keywords: [
      "typescript jsdoc generator",
      "auto generate typescript documentation",
      "typescript documentation generator",
      "jsdoc generator vscode",
      "ai typescript docs",
      "typescript doc generator",
      "generate jsdoc from typescript",
      "typescript documentation tool",
    ],
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
 * Refreshes a JWT authentication token if it is near expiry or forced.
 *
 * Verifies the existing token, then checks whether it is within the
 * refresh window (see {@link isNearExpiry}). If not near expiry and
 * \`force\` is false, returns the original token unchanged. Otherwise,
 * issues a new token scoped to the optional audience, invalidates the
 * old one, and returns the replacement.
 *
 * @param token - The existing JWT to evaluate for refresh.
 * @param options - Optional refresh configuration.
 * @param options.force - If true, refresh unconditionally. Defaults to false.
 * @param options.audience - OAuth audience for the new token. Inherits
 *   from the existing token if omitted.
 * @returns Resolves to an \`AuthToken\` containing the (possibly new)
 *   token string and a \`refreshed\` flag indicating whether a new
 *   token was issued.
 */
export async function refreshAuthToken(`,
      style: "JSDoc",
    },
    comparisons: [
      {
        tool: "Writing manually",
        gap: "JSDoc for a complex generic function takes 10+ min. Types drift as signatures evolve.",
      },
      {
        tool: "TypeDoc",
        gap: "Generates an HTML site from existing JSDoc — it doesn't write the comments for you.",
      },
      {
        tool: "Copilot inline",
        gap: "One suggestion at a time. No project-wide coverage, no CI enforcement, no drift alerts.",
      },
    ],
  },

  javascript: {
    name: "JavaScript",
    styles: ["JSDoc"],
    install: "pip install wright",
    installLabel: "pip install wright",
    title: "JavaScript JSDoc Generator — Wright AI",
    description:
      "Auto-generate JSDoc comments for JavaScript functions with AI. Detect stale documentation in CI. Free VS Code extension and CLI tool.",
    headline: "Auto-generate JavaScript JSDoc with AI",
    subheadline:
      "Wright AI writes JSDoc for every undocumented JavaScript function in your project — reading callers and callees for accurate context, not just the function body.",
    keywords: [
      "javascript jsdoc generator",
      "javascript documentation generator",
      "auto generate jsdoc",
      "javascript doc generator",
      "ai javascript documentation",
      "jsdoc comment generator",
      "javascript documentation tool",
    ],
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
 * Validates and enqueues an incoming webhook payload for async processing.
 *
 * Verifies the HMAC signature before parsing to prevent processing
 * forged payloads. On success, pushes the parsed event onto the retry
 * queue with an initial retry count of zero.
 *
 * @param {string} payload - Raw request body as a UTF-8 string.
 * @param {string} signature - HMAC-SHA256 signature from the request header.
 * @param {{ secret: string }} config - Webhook configuration containing
 *   the shared secret for signature verification.
 * @returns {Promise<{ accepted: boolean, eventId: string }>} Resolves
 *   with acceptance confirmation and the parsed event ID.
 * @throws {WebhookError} If the signature does not match (HTTP 401).
 */
async function processWebhook(payload, signature, config) {`,
      style: "JSDoc",
    },
    comparisons: [
      {
        tool: "Writing JSDoc manually",
        gap: "Repetitive and time-consuming. Skipped under pressure and never caught up later.",
      },
      {
        tool: "ESDoc / JSDoc CLI",
        gap: "Generates documentation sites from existing comments — does not write comments for you.",
      },
      {
        tool: "ChatGPT / Claude (ad-hoc)",
        gap: "No call graph context. No batch mode. No coverage report. No CI enforcement.",
      },
    ],
  },

  go: {
    name: "Go",
    styles: ["godoc"],
    install: "pip install wright",
    installLabel: "pip install wright",
    title: "Go Documentation Generator — Wright AI",
    description:
      "Auto-generate godoc comments for Go functions and packages with AI. Detect documentation drift in CI. Free CLI tool and VS Code extension.",
    headline: "Auto-generate Go godoc comments with AI",
    subheadline:
      "Wright AI writes godoc-style comments for every undocumented Go function — following the convention that the first sentence is the summary — then enforces coverage in CI.",
    keywords: [
      "go documentation generator",
      "golang doc generator",
      "go godoc generator",
      "auto generate go comments",
      "golang documentation tool",
      "go doc ai generator",
      "godoc comment generator",
    ],
    example: {
      before: `func (c *Client) ExecuteWithRetry(ctx context.Context, req *Request, maxAttempts int) (*Response, error) {
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff(attempt)):
			}
		}
		resp, err := c.execute(ctx, req)
		if err == nil {
			return resp, nil
		}
		if !isRetryable(err) {
			return nil, err
		}
		lastErr = err
	}
	return nil, fmt.Errorf("all %d attempts failed: %w", maxAttempts, lastErr)
}`,
      after: `// ExecuteWithRetry sends req and retries on retryable errors with
// exponential backoff, up to maxAttempts total attempts.
//
// Each retry waits for the duration returned by backoff(attempt) or
// until ctx is cancelled. Non-retryable errors (see isRetryable) are
// returned immediately without further attempts.
//
// Returns the first successful Response, or an error wrapping the last
// failure if all attempts are exhausted. Returns ctx.Err() if the
// context is cancelled between retries.
func (c *Client) ExecuteWithRetry(ctx context.Context, req *Request, maxAttempts int) (*Response, error) {`,
      style: "godoc",
    },
    comparisons: [
      {
        tool: "go doc (stdlib)",
        gap: "Reads and formats existing godoc — does not generate comments for undocumented functions.",
      },
      {
        tool: "godocdown / swaggo",
        gap: "Exports existing docs to Markdown/Swagger. Still requires you to author every comment.",
      },
      {
        tool: "Copilot",
        gap: "Suggests one comment at a time. No project-wide coverage report or CI gate.",
      },
    ],
  },

  rust: {
    name: "Rust",
    styles: ["rustdoc"],
    install: "pip install wright",
    installLabel: "pip install wright",
    title: "Rust Documentation Generator — Wright AI",
    description:
      "Auto-generate rustdoc comments for Rust functions and structs with AI. Detect documentation drift in CI. Free CLI tool and VS Code extension.",
    headline: "Auto-generate Rust rustdoc comments with AI",
    subheadline:
      "Wright AI writes rustdoc-style `///` comments for undocumented Rust functions and structs — including Panics, Errors, and Examples sections — then catches drift when signatures change.",
    keywords: [
      "rust documentation generator",
      "rustdoc generator",
      "auto generate rust docs",
      "rust doc generator",
      "rust documentation tool",
      "ai rust documentation",
      "cargo doc generator",
    ],
    example: {
      before: `pub fn parse_connection_string(s: &str) -> Result<ConnectionConfig, ConfigError> {
    let parts: Vec<&str> = s.splitn(2, "://").collect();
    if parts.len() != 2 {
        return Err(ConfigError::MissingScheme);
    }
    let scheme = Scheme::try_from(parts[0])?;
    let rest = parts[1];
    ConnectionConfig::from_parts(scheme, rest)
}`,
      after: `/// Parses a connection string into a validated \`ConnectionConfig\`.
///
/// Expects the format \`scheme://host[:port][/path][?query]\`. The scheme
/// must be one of the variants supported by \`Scheme\` (see
/// [\`Scheme::try_from\`]).
///
/// # Errors
///
/// Returns \`ConfigError::MissingScheme\` if the input does not contain
/// \`://\`. Returns \`ConfigError::UnknownScheme\` if the scheme prefix is
/// not recognised. Propagates any error from \`ConnectionConfig::from_parts\`.
///
/// # Examples
///
/// \`\`\`
/// let cfg = parse_connection_string("postgres://localhost:5432/mydb")?;
/// assert_eq!(cfg.port(), Some(5432));
/// \`\`\`
pub fn parse_connection_string(s: &str) -> Result<ConnectionConfig, ConfigError> {`,
      style: "rustdoc",
    },
    comparisons: [
      {
        tool: "cargo doc",
        gap: "Renders existing rustdoc comments into HTML — does not write them for you.",
      },
      {
        tool: "rust-analyzer hints",
        gap: "Shows inlay hints for types and parameters inline. Does not generate doc comments.",
      },
      {
        tool: "ChatGPT / Claude (manual)",
        gap: "Generates one docstring at a time when asked. No batch mode, no coverage tracking, no CI gate.",
      },
    ],
  },
};

type LangKey = keyof typeof LANGUAGES;

export async function generateStaticParams() {
  return Object.keys(LANGUAGES).map((language) => ({ language }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ language: string }>;
}): Promise<Metadata> {
  const { language } = await params;
  const lang = LANGUAGES[language as LangKey];
  if (!lang) return {};
  return {
    title: lang.title,
    description: lang.description,
    keywords: lang.keywords,
    alternates: { canonical: `https://www.wrightai.live/${language}` },
    openGraph: {
      title: lang.title,
      description: lang.description,
      url: `https://www.wrightai.live/${language}`,
    },
  };
}

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ language: string }>;
}) {
  const { language } = await params;
  const lang = LANGUAGES[language as LangKey];
  if (!lang) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      {/* Nav */}
      <header style={{
        borderBottom: "1px solid rgba(175,169,236,0.08)",
        padding: "0 40px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "rgba(7,5,26,0.92)",
        backdropFilter: "blur(20px)",
        zIndex: 50,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Wright AI
        </Link>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/docs" style={{ textDecoration: "none", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(175,169,236,0.12)" }}>
            Docs
          </Link>
          <Link href="/dashboard" style={{ textDecoration: "none", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#050310", padding: "7px 18px", borderRadius: 7, background: "#00D4FF" }}>
            Start free
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "72px 40px 120px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 999, marginBottom: 24,
            background: "rgba(175,169,236,0.07)", border: "1px solid rgba(175,169,236,0.18)",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#AFA9EC" }}>
              {lang.name} · {lang.styles.join(" · ")}
            </span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-heading)", fontWeight: 800,
            fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.05,
            letterSpacing: "-0.04em", marginBottom: 20,
          }}>
            {lang.headline}
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 640, marginBottom: 36 }}>
            {lang.subheadline}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/dashboard" style={{
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 26px", borderRadius: 9, background: "#00D4FF",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "#050310",
            }}>
              Start for free →
            </Link>
            <a href="https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai"
              target="_blank" rel="noopener noreferrer"
              style={{
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 22px", borderRadius: 9,
                background: "rgba(175,169,236,0.07)", border: "1px solid rgba(175,169,236,0.18)",
                fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-code)",
              }}>
              {lang.installLabel}
            </a>
          </div>
        </div>

        {/* Before / After example */}
        <section style={{ marginBottom: 72 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            See it in action
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.03em", marginBottom: 28 }}>
            Before and after — {lang.styles[0]} style
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Before */}
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(226,75,74,0.2)" }}>
              <div style={{ padding: "10px 16px", background: "rgba(226,75,74,0.06)", borderBottom: "1px solid rgba(226,75,74,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", display: "inline-block" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(226,75,74,0.8)", letterSpacing: "0.06em" }}>BEFORE</span>
              </div>
              <pre style={{ margin: 0, padding: "18px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(175,169,236,0.55)", lineHeight: 1.75, overflowX: "auto", background: "#07051A" }}>
                {lang.example.before}
              </pre>
            </div>
            {/* After */}
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(29,158,117,0.25)" }}>
              <div style={{ padding: "10px 16px", background: "rgba(29,158,117,0.06)", borderBottom: "1px solid rgba(29,158,117,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(29,158,117,0.9)", letterSpacing: "0.06em" }}>AFTER — wright generate</span>
              </div>
              <pre style={{ margin: 0, padding: "18px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", lineHeight: 1.75, overflowX: "auto", background: "#07051A" }}>
                {lang.example.after}
              </pre>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ marginBottom: 72 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            How it works
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.03em", marginBottom: 28 }}>
            More than a docstring generator
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { icon: "⚡", title: "Call graph context", desc: `Wright builds a dependency graph before generating. It reads what calls your ${lang.name} function and what it calls — so docs describe purpose, not just mechanics.` },
              { icon: "📊", title: "Coverage tracking", desc: "Know the exact percentage of documented functions across every file. Set a minimum threshold and enforce it in CI." },
              { icon: "🔍", title: "Drift detection", desc: "When a function signature changes, Wright flags the stale docstring automatically — as a VS Code warning and a CI failure." },
              { icon: "🔌", title: "MCP for AI tools", desc: "Exposes your indexed docs to Claude Code, Cursor, and Copilot via MCP so they always have live context about your codebase." },
            ].map((f) => (
              <div key={f.title} style={{ padding: "22px 20px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section style={{ marginBottom: 72 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            Comparison
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.03em", marginBottom: 24 }}>
            How Wright differs from alternatives
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {lang.comparisons.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 20, padding: "18px 0", borderBottom: "1px solid rgba(175,169,236,0.07)" }}>
                <div style={{ minWidth: 160, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{c.tool}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>{c.gap}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "40px 36px", borderRadius: 16, background: "rgba(83,74,183,0.08)", border: "1px solid rgba(127,119,221,0.18)", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em", marginBottom: 10 }}>
            Start documenting your {lang.name} codebase
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.7 }}>
            Free VS Code extension · CLI · GitHub Action · MCP server. No credit card required.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={{ textDecoration: "none", padding: "12px 26px", borderRadius: 9, background: "#534AB7", color: "#fff", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15 }}>
              Get started free →
            </Link>
            <Link href="/docs" style={{ textDecoration: "none", padding: "12px 26px", borderRadius: 9, border: "1px solid rgba(175,169,236,0.18)", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 15 }}>
              Read the docs
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}