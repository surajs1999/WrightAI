# WrightAI Architecture

This document describes how WrightAI is built internally: the shared engine, the five user-facing surfaces, the hosted backend, data stores, infrastructure, and the main request flows. For installation and usage, see [README.md](README.md).

---

## 1. Overview

WrightAI is a single Python engine (`core/`) exposed through five surfaces:

| Surface | Path | Talks to |
|---|---|---|
| CLI | `cli/` | `core/` directly, local files + local SQLite/ChromaDB |
| VS Code Extension | `vscode-extension/` | hosted API (default) or local `wright` CLI subprocess |
| Web Dashboard | `web/` | hosted API, via an internal Next.js proxy |
| GitHub Action | `github-action/` | wraps the `wright` CLI in CI |
| MCP Server | `mcp_server/` | `core/` directly (stdio MCP, no network) |

The hosted API (`api/`, FastAPI) is the integration point for the VS Code extension, web dashboard, and GitHub Action when run against the hosted service. It runs on Google Cloud Run and is backed by ChromaDB, SQLite, Google Cloud Storage, and Supabase, plus Anthropic, Gemini, Voyage AI, WorkOS, Paddle, Brevo, and GitHub as external services.

```
┌──────────────────────────────────────────────────────────────────────┐
│                     core/  (shared Python engine)                     │
│  parser → ast_chunker → embeddings/ChromaDB → dep_graph (PageRank)    │
│        → hybrid_retriever → llm/gateway (Claude, Gemini fallback)     │
│        → output (injector / markdown / llms.txt)  +  drift detector   │
└──────────────────────────────────────────────────────────────────────┘
        ▲                         ▲                            ▲
        │ import                  │ import                     │ import
   ┌─────────┐             ┌──────────────┐             ┌───────────────┐
   │ cli/    │◄──subprocess─┤ vscode-ext   │             │ mcp_server/    │
   │ `wright`│   (local)    │ (TypeScript) │             │ stdio MCP      │
   └─────────┘             └──────────────┘             └───────────────┘
        ▲                         │  HTTPS                       ▲
        │ subprocess               ▼  X-Wright-API-Key            │
 ┌──────────────┐         ┌──────────────────┐            Claude Code /
 │ github-action│────────▶│ api/ (FastAPI,    │◄──/api/proxy──┐ Cursor
 │ (CI)         │  HTTPS  │ Cloud Run)        │                │
 └──────────────┘         └──────────────────┘         ┌──────────────┐
                                ▲           ▲            │ web/ (Next.js)│
                    ChromaDB/GCS ┘           └── Supabase│ wrightai.live │
                                                          └──────────────┘
```

---

## 2. Core Engine (`core/`)

### 2.1 Parser — `core/parser/tree_sitter_parser.py`
Tree-sitter parsers for **6 languages**: Python, JavaScript, TypeScript, Java, Go, Rust. Produces `ParsedFile` → `ParsedFunction` / `ParsedClass` (name, byte/line ranges, source, parameters + type annotations, return type, decorators, async flag, existing docstring).

Docstring extraction is language-specific:
- **Python** — triple-quoted string as the function body's first statement
- **JS/TS** — `/** ... */` JSDoc block immediately preceding the function (walks up to 4 sibling levels)
- **Java** — `/** ... */` block via `prev_named_sibling`
- **Go** — preceding `//` line comment(s)
- **Rust** — preceding `///` doc comments

### 2.2 AST Chunker — `core/parser/ast_chunker.py`
Converts functions/classes/files into `CodeChunk` objects for embedding.
- `chunk_id = sha256("{file_path}:{start_line}:{source}")` — unique even when identical code is duplicated across files or lines
- Chunk types: `function`, `class`, `module`
- `MAX_CHUNK_TOKENS = 1500`, `MIN_CHUNK_TOKENS = 100` — oversized functions are truncated; small adjacent chunks (e.g. tiny helper functions) are merged into one chunk

### 2.3 Dependency Graph — `core/parser/dep_graph.py`
A `networkx.DiGraph` of function/method call relationships, built via regex-based call-site detection. `nx.pagerank(alpha=0.85)` (with a uniform fallback if it fails to converge) ranks functions by importance. Used to:
- Weight 40% of the hybrid retrieval score
- Pick the "top functions" featured in `llms.txt`

### 2.4 Cache — `core/parser/cache.py` (`ASTCache`)
SQLite table `ast_cache(file_path PK, mtime, parsed_json, updated_at, last_checked_json)`. Two roles:
1. **AST cache** — skip re-parsing files whose mtime hasn't changed since the last run
2. **LLM result cache** — per-function drift-check verdicts keyed by `src_hash:doc_hash` (L1, local). Verdicts are also mirrored to the shared Supabase `drift_llm_cache` table (L2), with a `WRIGHT_CACHE_TTL_DAYS` (default 30 days) read-time freshness check. This is what makes a warm `wright drift` run near-instant and token-free, and lets cold-start containers and other devices skip a redundant LLM call for code they've never checked locally.

### 2.5 Embeddings & Vector Store — `core/embeddings/`
- `voyage_embeddings.py` — `voyage-code-3`, batch size 128; falls back to OpenAI `text-embedding-3-small` if no Voyage key is configured
- `chroma_store.py` — one Chroma collection per repo, named `wright_{md5(repo_root)[:8]}`; `upsert()` keyed by `chunk_id`; metadata = `file_path, language, chunk_type, name, start_line, end_line, token_count`
- `pgvector_store.py` — `PgVectorStore`, a Supabase pgvector mirror of a repo's Chroma collection (table `code_embeddings`, keyed by `user_id`+`repo_slug`+`chunk_id`); every method is best-effort and never raises. `DualVectorStore` wraps a `PgVectorStore` + a Chroma store behind the same `.search()` interface, querying pgvector first and falling back to Chroma if pgvector is unavailable or empty. Used only by the hosted API (`api/routes/repos.py`'s `get_vector_store()`) for managed repos — local CLI/extension usage talks to Chroma directly

### 2.6 Hybrid Retriever — `core/retrieval/hybrid_retriever.py`
For a target function: embeds the function source, its parameter names, and its top callees; runs vector search for each; always includes the function itself plus its top-2 callers and top-2 callees from the dependency graph.

```
combined_score = 0.6 * vector_score + 0.4 * (graph_pagerank / max_pagerank)
```

Results are sorted by `combined_score` and trimmed to an 8000-token context budget, returned as `RetrievedContext` objects (function, chunk, callers, callees, scores, token count).

### 2.7 LLM Gateway — `core/llm/gateway.py`
| Use | Model |
|---|---|
| Docstrings, chat, README/module docs | `claude-sonnet-4-6` |
| Drift checks | `claude-haiku-4-5-20251001` (cheap true/false + reason JSON) |
| Fallback (any Anthropic exception — rate limit, overload) | `gemini-2.5-pro` (chat/docs), `gemini-2.5-flash` (drift) |

Uses Anthropic prompt caching (`cache_control: {"type": "ephemeral"}`) on system prompts and the latest chat-history turn to cut repeat-context cost. Public methods: `generate_docstring`, `generate_readme`, `generate_module_doc`, `chat` / `chat_stream`, `check_drift`. `chat_stream` yields `("token", ...)`, `("citations", ...)`, `("followups", ...)`, `("model", ...)`, `("usage", ...)` so the API can stream tokens while still recording analytics on the final model used.

`generate_docstring(..., quality="high")` delegates to `core/llm/graph.py`'s LangGraph state machine (`run_doc_gen_graph` / `DocGenState`): a `generate` node produces a `DocstringSchema`, a `critic` node asks the drift-check prompt whether that draft is accurate, and a conditional edge routes back to `generate` (with the critique appended to the prompt) for up to 2 rewrite attempts before ending. Token usage, cache-read tokens, fallback flag, retry count, and duration are accumulated across every node's LLM call and returned alongside the final schema — this is what backs `wright generate --quality high`.

### 2.8 Prompts & Schema — `core/llm/prompts.py`, `core/llm/schema.py`
- `DocStyle` enum: `JSDOC, GOOGLE, NUMPY, EPYTEXT, RUST, GO`
- Prompt builders: docstring generation, README, module docs, OpenAPI spec, `llms.txt`, chat, and drift checks (7 drift categories — signature, return type, behavioral, exception, example, side-effect, async)
- `DocstringSchema` (Pydantic): `summary`, `description`, `parameters`, `returns`, `raises`, `example`, `complexity`, `side_effects`, `notes`

### 2.9 Output Writers — `core/output/`
- `injector.py` — byte-offset based injection. Reconciles LLM-proposed parameter names against the real signature, computes indentation from the function body, and replaces or inserts the docstring. Format is dictated by language regardless of `--style`: JS/TS/Java → JSDoc, Go → `//` comments, Rust → `///`; only Python honors the configured style (Google/NumPy/Epytext). Python output is syntax-validated before the file is written.
- `markdown_writer.py` — per-file API reference, top-level README, language-grouped module index, optional Docusaurus `sidebar.json`
- `llms_txt.py` — builds the dependency graph, selects the top-10 functions by PageRank, and prompts the LLM for an `llms.txt` summary

### 2.10 Drift Detector — `core/drift/drift_detector.py`
- **Structural drift** (no LLM call) — flags a function as drifted if: a parameter was added/removed/renamed, a type annotation changed, the return type changed between two concrete types, sync↔async changed, or a "meaningful" decorator changed (`@staticmethod`, `@property`, `@classmethod`, `@abstractmethod`, `@cached_property`, `@override`, `@final`)
- **Semantic drift** (LLM call, Haiku) — only runs if the structure is unchanged and there's no cached verdict for the current `src_hash:doc_hash`; asks the LLM whether the docstring is still factually accurate
- The cached baseline only advances when a scan finds **zero** drifted functions — a drifted function keeps reporting as drifted until it's actually fixed or regenerated

---

## 3. Surfaces

### 3.1 CLI (`cli/main.py`)
Typer commands, each calling `core/` directly:

| Command | Purpose |
|---|---|
| `wright init [REPO]` | Detect languages, show a sample docstring, write `.wright.json` |
| `wright generate [PATH]` | Generate + inject docstrings (concurrent; `--style`, `--dry-run`, `--watch`, `--quality high` for a critic/rewriter pass) |
| `wright coverage [PATH]` | Per-folder documentation coverage %; exits 1 below threshold |
| `wright drift [PATH]` | Structural + semantic drift report; `--fix`, `--auto-pr`, `--output` |
| `wright chat [PATH]` | Interactive Q&A REPL with `file:line` citations |
| `wright llms-txt [PATH]` | Generate/update `llms.txt` |

Helpers: `_resolve_workspace` (walks up the tree for `.wright.json`), `_build_gateway` (Claude + optional Gemini key), `_build_embedder` (Voyage), `_get_cache` (SQLite at `SQLITE_CACHE_PATH`, default `.wright/ast_cache.db`).

### 3.2 VS Code Extension (`vscode-extension/src/`)

| File | Responsibility |
|---|---|
| `extension.ts` | Activation: connects to the API, onboards the API key, registers CodeLens/Hover providers for all 6 languages, gutter decorations, the coverage tree view, status bar, 6 commands, file watchers, and the on-save drift checker |
| `client.ts` | Hosted API client — docstring generation, coverage, drift check, streaming chat, drift-result sync; attaches `X-Wright-API-Key`; handles 429 (quota) / 403 (auth) |
| `codelens.ts` | "Generate Docs" / "⚠ Docs outdated — regenerate" CodeLens above each function; tracks a `DRIFTED_FUNCTIONS` map |
| `coverage.ts` | Coverage panel (`CoverageTreeProvider`); `findWrightCli()` locates the CLI (project venv → `python -m cli.main` → global `wright`); `runCli()` spawns it; `runDriftScan()` also pushes results to the dashboard via `syncDriftResults` |
| `drift.ts` | On-save drift check (debounced 500ms), gutter decorations, syncs per-function results — plus `src_hash`/`doc_hash` for LLM-verified verdicts — to `drift_results`/`drift_llm_cache` |
| `chat.ts` | Webview chat panel — streaming responses, file-link citations, follow-up suggestions, up to 20 turns of history |
| `injector.ts` | Diff preview, applies + saves generated docstrings with language-aware indentation |
| `hover.ts` | Shows the existing docstring + a "Generate docs" link on hover |
| `gutter.ts` | ✓ / ○ / ⚠ gutter icons (SVGs written to `/tmp`, since VS Code gutter icons can't be `data:` URIs) |
| `errors.ts` | Converts raw API/fetch errors into friendly messages (auth, rate limit, network, injection-point failures) |

Repo identity for dashboard sync is resolved from the `origin` (or first available) git remote URL — matching the server's `repo_slug` derivation — not the local folder name (`getRepoName()` in `coverage.ts`), so renamed checkouts still sync correctly.

### 3.3 Web App (`web/`)
Next.js (App Router), deployed to Cloud Run as `wrightai-web`. Serves both the Documentation Intelligence Platform marketing site and the authenticated user dashboard.

**Public routes**
- `/` — Documentation Intelligence Platform homepage ("Documentation that never lies.") — replaces the v1 landing page
- `/[language]` — Language-specific landing pages: `/python`, `/typescript`, `/javascript`, `/go`, `/rust`
- `/pricing` — Plans and Paddle checkout
- `/docs` — Product documentation
- `/login` — GitHub / Google OAuth sign-in via WorkOS
- `/terms-of-service`, `/privacy-policy`, `/refund-policy` — Legal pages
- `/new` — Redirects to `/` (legacy route kept for inbound links)

**Dashboard** (`/dashboard/*`, gated by `proxy.ts` middleware on the `wright_token` cookie)
`dashboard` (home — connect repos, coverage/drift summary), `generate`, `coverage`, `drift`, `chat`, `keys`, `usage`, `settings`, `llms-txt`, `mcp`, `help`

**Component architecture**
- `components/landing-v2/` — Current homepage and shared components: `NavbarV2`, `HeroV2`, `TrustStrip`, `ProblemV2`, `ThreePillars`, `DriftSection`, `GetStarted`, `CommandCenter`, `AIContextSection`, `CompareV2`, `WhyNow`, `FeedbackV2`, `FinalCTAV2`, `FooterV2`, `ScrollRuler`
- `components/landing-v1/` — Archived v1 landing components (not served; kept for reference)
- `components/dashboard/` — Authenticated dashboard UI: `Sidebar`, `Topbar`, `DashboardShell`, `MetricCard`, `CoverageBar`, `Spinner`, `SkeletonBlock`

**Other**
- **Billing**: `/billing/checkout` (Paddle checkout fallback/retry page)
- **Auth routes** (`app/api/auth/*`): `login`, `github`, `key`, `logout`, `callback` — exchange WorkOS/GitHub OAuth codes for a `wright_token` cookie
- **API proxy** (`app/api/proxy/[...path]/route.ts`): forwards every dashboard request to the FastAPI backend, converting the `wright_token` cookie into an `X-Wright-API-Key` header; passes through `text/event-stream` responses for chat
- `lib/supabase.ts` (support tickets), `lib/user.ts` (cookie-based session helpers), `lib/api.ts` (`API_URL`/`APP_URL` constants)
- `types/paddle.d.ts` — typings for the `Paddle` global (`Checkout.open`, `Environment.set`, event payloads)

**Analytics**
- GA4 (`G-934CQXQ86Z`) injected globally via `app/layout.tsx` using the standard `gtag.js` script tag + `gtag('config', ...)` initialisation. Measurement ID is a compile-time constant (not an env var). All public pages and the dashboard are tracked.

**Security headers + performance (`next.config.ts`)**
- `output: "standalone"` — minimal Docker image (no `node_modules` bundled)
- `compress: true` — gzip/Brotli compression at the Next.js layer
- `images.formats: ["image/avif", "image/webp"]` — automatic modern image format negotiation
- `images.minimumCacheTTL: 31536000` — 1-year immutable cache for optimised images
- HTTP security headers applied to all routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- 1-year immutable `Cache-Control` for all static assets (`svg|png|jpg|jpeg|webp|avif|woff2`)

### 3.4 GitHub Action (`github-action/`)
Wraps the CLI for CI in `coverage` / `generate` / `drift` modes, with a configurable coverage threshold and optional auto-PR for drift fixes. See [github-action/README.md](github-action/README.md).

### 3.5 MCP Server (`mcp_server/server.py`)
Exposes 3 tools over stdio MCP for Claude Code / Cursor, built directly on `core/` (no network calls):
- `search_docs(query, repo_root, n=5)` — hybrid-retriever semantic search
- `get_function_doc(function_name, file_path, repo_root)` — full doc + callers/callees
- `list_undocumented(repo_root, folder?)` — functions missing docstrings

---

## 4. Backend API (`api/`)

FastAPI app (`api/main.py`), CORS restricted to `CORS_ORIGINS`. Every router except `/auth`, `/billing/webhook`, and `/webhooks/github` requires `verify_api_key`.

### 4.1 Authentication (`api/auth.py`)
Three accepted credentials:
1. A user's `wai_...` API key, looked up in Supabase
2. A static `WRIGHT_API_KEY` (server-level, for CI/MCP) — auto-generated to `~/.wright/api.key` (mode `0600`) if unset
3. A WorkOS bearer token, verified against the WorkOS JWKS endpoint

### 4.2 Endpoint Reference

| Prefix | Method & Path | File | Purpose |
|---|---|---|---|
| `/auth` | `GET /login` | auth.py | Start WorkOS OAuth |
| `/auth` | `POST`/`GET /callback` | auth.py | OAuth callback → issue/return `wai_` key |
| `/auth` | `GET /github`, `/github/callback`, `/github/repos`, `/github/status` | auth.py | GitHub App connection + repo listing |
| `/billing` | `POST /checkout` | billing.py | Create a Paddle checkout (price ID looked up from Supabase `plans`) |
| `/billing` | `POST /sync-transaction` | billing.py | Client-side fallback to apply a plan upgrade after `checkout.completed` |
| `/billing` | `POST /portal` | billing.py | Paddle customer portal URL |
| `/billing` | `POST /webhook` | billing.py | Paddle webhook (`transaction.completed`, `subscription.updated`/`canceled`) |
| `/generate` | `POST /` | generate.py | Generate (and optionally inject) a docstring for one function, synchronously |
| `/coverage` | `GET /` | coverage.py | Coverage % for a repo |
| `/drift-check` | `POST /file` | drift.py | Drift check for a single file |
| `/drift-check` | `POST /` | drift.py | Drift check for a directory |
| `/drift-check` | `POST /sync` | drift.py | VS Code extension → upsert results into `drift_results`; results carrying `src_hash`/`doc_hash` are also mirrored into `drift_llm_cache` (L2) |
| `/drift-check` | `GET /results/{repo_name}` | drift.py | Dashboard reads the function index |
| `/chat` | `POST /` | chat.py | Codebase chat (SSE streaming) |
| `/repos` | `POST /connect` | repos.py | Clone + register a repo (subject to the plan's `repo_connect` quota) |
| `/repos` | `GET /` | repos.py | List connected repos (from Supabase `repo_meta`) |
| `/repos` | `DELETE /{repo_name}` | repos.py | Disconnect a repo — deletes local files, Chroma + pgvector (`code_embeddings`) index, GCS backups, `repo_meta` row, and stored GitHub token |
| `/repos` | `GET /{repo_name}/index-status` | repos.py | ChromaDB indexing progress |
| `/repos` | `POST /{repo_name}/sync` | repos.py | Re-pull + re-index |
| `/repos` | `POST /{repo_name}/index` | repos.py | (Re)index only |
| `/fix-pr` | `POST /` | fix_pr.py | Open a GitHub PR fixing drifted docstrings |
| `/llms-txt` | `POST /` | llms_txt.py | Generate `llms.txt` via API |
| `/usage` | `GET /` | usage.py | Monthly usage stats |
| `/webhooks` | `POST /github` | webhooks.py | GitHub push webhook (HMAC-SHA256 verified via `X-Hub-Signature-256`) → triggers repo re-sync |
| `/internal` | `POST /cron/onboarding-drip` | internal.py | Cloud Scheduler daily trigger for onboarding nudge emails (auth via `X-Cron-Secret`) |
| `/internal` | `POST /cron/ops-alert` | internal.py | Hourly Cloud Scheduler trigger: checks LLM anomalies in the last 24 h (fallback rate, retry rate, latency, zero-traffic) and emails `hello@wrightai.live` if thresholds are breached (auth via `X-Cron-Secret`) |
| — | `GET /health` | main.py | Liveness check |

### 4.3 Quota & Plans (`api/quota.py`)
Tracks `docs_generated`, `chat_message`, `drift_checks_run`, and `repo_connect` against per-plan `PlanLimits` (monthly doc/chat/drift quotas, repo/API-key limits, and feature flags for semantic drift, auto-PR, GitHub Action comments, and `llms.txt`). Multi-tier caching keeps enforcement near-real-time without hammering Supabase: plan ID (5 min), plan limits (1 hr), user ID (24 hr), usage counts (30 sec). Pro-plan overage is billed rather than blocked. A quota alert email (80% / 100%) is sent inline, deduplicated per calendar month.

### 4.4 Supporting modules
- `user_store.py` — Supabase-backed `User` (id, `workos_user_id`, email, `wai_` api_key); `get_or_create_user`, `rotate_api_key`; also exposes the lazy `_db()` Supabase client accessor used by `repo_store.py`, `token_store.py`, and `core/embeddings/pgvector_store.py`
- `repo_store.py` — `save_repo` / `list_repos` / `delete_repo` against the `repo_meta` table, keyed by `(user_id, repo_slug)`
- `token_store.py` — `save_token` / `load_token` / `delete_token` against the `tokens` table, keyed by `(user_id, key)`; `key` is `_github_oauth` for the user's GitHub OAuth token or a repo slug for a per-repo deploy token. `user_id_from_api_key()` derives the same `user_id` (last 12 chars of the API key) used by `repo_meta` and managed-repo paths
- `usage_store.py` — fire-and-forget `usage_events` inserts (tokens, model, language, fallback/cache flags, latency); monthly aggregation for `/usage`
- `embedder.py` — process-level singletons for `VoyageEmbedder` and `LLMGateway` (reused across requests)
- `chroma_cache.py` — manages the local ChromaDB cache directory

### 4.5 HTTP Rate Limiting (`api/rate_limit.py`)
Per-request throttling via `slowapi` (SlowAPI middleware registered in `api/main.py`).

Bucketing strategy (`_rate_limit_key`):
- Requests with a `wai_` API key → **keyed by API key** (each user gets an independent limit regardless of shared IPs, office NATs, or VPNs)
- Anonymous / CLI requests without a `wai_` key → **keyed by remote IP**

Rate limits are applied per-endpoint via `@limiter.limit("N/period")` decorators. Exceeding a limit returns `429 Too Many Requests` via `_rate_limit_exceeded_handler`.

Note: this is separate from the quota system (`api/quota.py`). Quota tracks monthly usage against plan limits; rate limiting throttles per-second/per-minute request bursts regardless of plan.

### 4.6 Observability (`api/observability.py`)
`setup_observability(app)` is called once after `FastAPI()` is created in `api/main.py`. Two components:

**Structured JSON logging** (`configure_logging`)
- Replaces the default plaintext formatter with `pythonjsonlogger.JsonFormatter`
- Fields: `timestamp`, `severity` (renamed from `levelname`), `name`, `message`
- Format is parsed natively by Google Cloud Logging, enabling log-based metrics and alerts
- Falls back to `basicConfig` if `pythonjsonlogger` is not installed

**Sentry error tracking** (`_setup_sentry`)
- Enabled only when `SENTRY_DSN` env var is set; silently no-ops otherwise
- Integrations: `FastApiIntegration` (captures unhandled exceptions per-request) + `LoggingIntegration` (captures `ERROR`-level log events as Sentry issues)
- `traces_sample_rate=0.0` — error tracking only, no performance tracing
- `environment` set from `ENVIRONMENT` env var (default `"production"`)
- `release` set from `K_REVISION` (Cloud Run injects the revision name automatically)

### 4.7 Email tasks (`api/tasks/`)

**`email_tasks.py`** — transactional email via Brevo, 1-retry inline backoff; fail-open so a Brevo outage never breaks the triggering request:
- `send_email` — base send function
- `send_welcome` — sent on first sign-up from `user_store.get_or_create_user`
- `send_quota_alert` — 80%/100% usage warning emails, deduplicated per calendar month, called from `quota.check_quota`
- `run_onboarding_drip` — day-7/day-14 nudge emails for active free users; triggered daily by Cloud Scheduler via `POST /internal/cron/onboarding-drip`

**`ops_alerts.py`** — LLM health monitoring, triggered hourly by Cloud Scheduler via `POST /internal/cron/ops-alert`:
- Queries the last 24 h of `usage_events` for anomalies
- Fires an alert email to `hello@wrightai.live` if any threshold is breached; fail-open
- Configurable thresholds (all via env vars):
  - `OPS_FALLBACK_RATE_THRESHOLD` — max fraction of LLM calls falling back to Gemini (default 20%)
  - `OPS_HIGH_RETRY_THRESHOLD` — max fraction needing >2 retries (default 10%)
  - `OPS_LATENCY_MS_THRESHOLD` — max average LLM latency in ms (default 30 000)
  - `OPS_MIN_CALLS_THRESHOLD` — min expected LLM calls per 24 h; fewer fires a zero-traffic alert (default 10; set to 0 to disable)

---

## 5. Data Stores

| Store | Contents | Location |
|---|---|---|
| **SQLite** (`SQLITE_CACHE_PATH`) | `ast_cache` table — per-file AST JSON (mtime-checked) + per-function LLM drift verdicts | local CLI/extension: `.wright/ast_cache.db`; API: `/tmp/ast_cache.db` (ephemeral, not persisted) |
| **ChromaDB** (`CHROMA_PATH`) | One collection per repo (`wright_{md5(repo_root)[:8]}`) — chunk embeddings + metadata | local: `.wright/chroma`; API: `/tmp/chroma` (warm copy made at boot, fast reads/writes), backed up to `/data/chroma` on GCS after indexing |
| **Supabase (Postgres)** | users, `wai_` API keys, `plans`/subscription state, `usage_events`, support tickets; `repo_meta` (connected-repo metadata, keyed by `user_id`+`repo_slug`); `tokens` (GitHub OAuth + per-repo deploy tokens, keyed by `user_id`+`key`); `drift_results` (per-function drift index, keyed by `user_id`/`repo_name`/`file_path`/`func_name`); `drift_llm_cache` (LLM drift-verdict cache, L2, keyed by `src_hash`+`doc_hash`, `WRIGHT_CACHE_TTL_DAYS` read-time TTL); `code_embeddings` (pgvector mirror of each repo's Chroma collection, keyed by `user_id`+`repo_slug`+`chunk_id`) | hosted backend |
| **Google Cloud Storage** (bucket `wrightai-data`, `gcsfuse` at `/data`) | `/data/repos` (durable repo backups), `/data/chroma` (vector store) | hosted backend |

---

## 6. Infrastructure & Deployment

Google Cloud, region `asia-southeast1`. The root `Dockerfile` builds the image for `wrightai-api` (`start.sh` → `uvicorn api.main:app`); `web/Dockerfile` builds the separate image for `wrightai-web`.

| Service | Config | Scaling | Notes |
|---|---|---|---|
| `wrightai-api` | `cloudrun-api.yaml` | 0→10, 512Mi/1vCPU | `api.wrightai.live`; `start.sh` warms ChromaDB from GCS into `/tmp` on boot |
| `wrightai-web` | `cloudrun-web.yaml` | 0→10, 1Gi/1vCPU | `wrightai.live` / `www.wrightai.live` |

CI/CD: `.github/workflows/deploy-api.yml` and `deploy-web.yml` build on push to `main` (path-filtered) or manual dispatch, push images to Artifact Registry tagged both `:<commit-sha>` and `:latest`, then `gcloud run services replace` with the `:latest` reference rewritten to `:<commit-sha>` — this guarantees Cloud Run picks up the new image even when the rest of the service spec is otherwise unchanged. `.github/workflows/ci.yml` runs lint, tests, and `pip-audit` on PRs.

---

## 7. Key End-to-End Flows

### 7.1 Doc generation (CLI / VS Code)
parser → AST chunker → embeddings → ChromaDB upsert → hybrid retriever → LLM gateway (Claude, Gemini fallback) → `DocstringSchema` → injector writes the file (byte-offset, language-aware format, Python syntax-validated).

### 7.2 Drift check + dashboard sync
1. A local scan (CLI or on-save in the extension) compares the current AST to the SQLite baseline.
2. A structural change → instant "drifted"; otherwise a cached or fresh LLM (Haiku) semantic check runs, populating `src_hash`/`doc_hash` on the result.
3. The extension resolves `repo_slug` from the `origin` remote and calls `POST /drift-check/sync`.
4. The API upserts `{file_path}:{func_name} → {status, reason, checked_at}` into `drift_results`; results carrying `src_hash`/`doc_hash` are also mirrored into `drift_llm_cache` (L2).
5. The dashboard's `GET /drift-check/results/{repo_name}` reads `drift_results` for the home page; if it's empty, it falls back to a live, structural-only `POST /drift-check` scan.

### 7.3 Repo connect (dashboard)
`POST /repos/connect` → `check_quota(api_key, "repo_connect", raise_on_blocked=True)` (403 if the plan disables repo connections, 429 if the plan's repo limit is reached) → shallow `git clone --depth=1` to `/tmp/repos/{user_id}/{repo_slug}` → save metadata to Supabase (`repo_meta`) → respond immediately, then in the background: async GCS backup, async ChromaDB indexing (if `VOYAGE_API_KEY` is set, also mirroring the new chunk embeddings to Supabase pgvector via `PgVectorStore.upsert_chunks` as a durable backup for cold-start rebuilds), and async GitHub webhook registration for future auto-sync.

### 7.3b Repo disconnect (dashboard)
`DELETE /repos/{repo_name}` → delete the repo's Chroma collection (`_delete_repo_chroma`, which also deletes its `code_embeddings` rows via `PgVectorStore.delete_collection` and re-syncs the Chroma GCS backup) → remove the local clone directory → delete the GCS tarball/legacy directory backups → delete the `repo_meta` row (`api/repo_store.py`) → delete any stored GitHub token for that repo (`api/token_store.py`). Returns 404 if none of the local directory or its GCS backups exist.

### 7.4 Chat
Question → hybrid retriever → Claude (`claude-sonnet-4-6`, prompt-cached system message), streamed via SSE → on failure, Gemini fallback → citations + follow-up suggestions generated and streamed back; the model actually used is recorded for usage analytics.

### 7.5 Auth
WorkOS OAuth (GitHub/Google) → backend issues a `wai_` API key, stored in Supabase → web sets a `wright_token` cookie → every subsequent dashboard request goes through `/api/proxy/*`, which swaps the cookie for an `X-Wright-API-Key` header.

### 7.6 Billing (Paddle)
`/pricing` → `Paddle.Checkout.open()` → on `checkout.completed`, the plan upgrade is applied via **either** `POST /billing/webhook` (`transaction.completed`/`subscription.updated`) **or** the client-side `POST /billing/sync-transaction` fallback, whichever lands first → Supabase `plans`/`users` updated → `POST /billing/portal` opens the Paddle customer portal for self-service management.

---

## 8. Security Notes
- All hosted endpoints except `/auth/*`, `/billing/webhook`, and `/webhooks/github` require `X-Wright-API-Key`.
- GitHub webhooks are verified via HMAC-SHA256 (`X-Hub-Signature-256`).
- Paddle webhooks are verified via `PADDLE_WEBHOOK_SECRET`.
- Source code is sent to Anthropic/Gemini (doc generation, chat, drift) and Voyage AI (embeddings) only on explicit user actions (CLI invocation, CodeLens click, repo connect).
- See [SECURITY.md](SECURITY.md) for vulnerability reporting and CVE policy.
