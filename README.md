# WrightAI — AI-Powered Code Documentation

> "Your codebase, written."

[![PyPI version](https://img.shields.io/pypi/v/wright.svg?color=7F77DD)](https://pypi.org/project/wright/)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/WrightAI.wrightai?label=VS%20Code&color=00D4FF)](https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai)
[![VS Code Installs](https://img.shields.io/visual-studio-marketplace/i/WrightAI.wrightai?label=installs)](https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![CI](https://github.com/surajs1999/WrightAI/actions/workflows/ci.yml/badge.svg)](https://github.com/surajs1999/WrightAI/actions)

WrightAI automatically generates, maintains, and serves code documentation using Claude AI. It supports Python, JavaScript, TypeScript, Java, Go, and Rust across four surfaces: a CLI tool, a VS Code extension, a GitHub Action, and an MCP server.

---

## Install

```bash
pip install wright
```

Or install from source:

```bash
git clone https://github.com/surajs1999/WrightAI
cd WrightAI
pip install -e ".[dev]"
```

---

## Quick Start

### VS Code (no setup required)
1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai)
2. Sign in at [www.wrightai.live](https://www.wrightai.live) with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings → search **WrightAI** → paste the key into **Wright: Api Key**
5. Click **Generate Docs** above any function — done

### CLI / Self-hosted
```bash
# 1. Install
pip install wright

# 2. Copy env template and add your Anthropic API key
cp .env.example .env

# 3. Initialize WrightAI in your project
wright init .

# 4. Generate documentation for all undocumented functions
wright generate .

# 5. Check documentation coverage
wright coverage .

# 6. Chat with your codebase
wright chat .
```

---

## CLI Reference

### `wright init [REPO]`
Scan the repository, detect language, display a sample docstring, and create `.wright.json`.

```bash
wright init .
wright init /path/to/project
```

### `wright generate [PATH]`
Generate docstrings for all undocumented functions. Processes files concurrently (3 at a time) and re-parses before each injection so byte offsets are always fresh.

```bash
wright generate .                          # Entire repo
wright generate src/api/routes.py          # Single file
wright generate . --style numpy            # Override style for Python
wright generate . --dry-run                # Preview without writing
```

Options:
- `--style` — `google` | `numpy` | `jsdoc` | `epytext` | `rust` | `go`
  (JS/TS/Java always use JSDoc; Go always uses `//` line comments; Rust always uses `///` — style only affects Python)
- `--verbosity` — `concise` | `standard` | `detailed` (default: `standard`)
- `--dry-run` — preview the generated docstring without modifying files
- `--watch` — watch for file changes and regenerate on save
- `--quality` — `standard` | `high` (default: `standard`); `high` runs an additional critic/rewriter loop (up to 2 retries) for better results at the cost of more tokens

### `wright coverage [PATH]`
Show a documentation coverage table. Exits with code 1 if below threshold.

```bash
wright coverage .
wright coverage . --output coverage.json   # Write JSON report
```

### `wright drift [PATH]`
Detect functions whose documentation is out of sync with the current code. Two categories of drift are detected:
- **Structural drift** — parameter names added, removed, or renamed; return type changes between concrete types (e.g. `str → dict`, `list → list[str]`)
- **Semantic drift** — function body changes that make the docstring factually wrong even when the signature is unchanged, detected by a fast LLM pass (claude-haiku)

LLM results are cached in SQLite (keyed by source + docstring hash), so unchanged functions are never re-checked. On a warm cache, `wright drift` runs in milliseconds.

```bash
wright drift .
wright drift . --fix                       # Re-generate stale docstrings (drifted only)
wright drift . --output report.json        # Write JSON report
wright drift . --auto-pr                   # Open a GitHub PR with fixes
```

Output summary:
```
Checked: 222  Drifted: 3  Undocumented: 1  Up to date: 218
```

> **Note:** `--fix` only regenerates functions whose signatures drifted. Use `wright generate` to add docs to undocumented functions.

### `wright chat [PATH]`
Interactive codebase Q&A. Each answer includes `file:line` citations.

```bash
wright chat .
```

Type `exit` to quit.

### `wright llms-txt [PATH]`
Generate or update `llms.txt` at the repository root for LLM-friendly codebase summaries.

```bash
wright llms-txt .
```

---

## VS Code Extension

1. Install `WrightAI` from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai)
2. Sign in at [www.wrightai.live](https://www.wrightai.live) with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings (`Cmd+,`) → search `WrightAI` → paste into **Wright: Api Key**
5. Open any supported file — a **Generate Docs** CodeLens button appears above each function

**Features:**
- **CodeLens** — "Generate Docs" / "⚠ Docs outdated — regenerate" above every function
- **Gutter icons** — ✓ (documented), ○ (undocumented), ⚠ (drifted) on every function line
- **Diff preview** — side-by-side preview before any change is written
- **Hover** — shows the existing docstring and a regenerate link on hover
- **Coverage panel** — live doc coverage %, undocumented count, and drifted count in the Explorer sidebar; auto-refreshes after every injection; uses local CLI + SQLite cache for zero token cost on unchanged functions
- **Drift detection** — checked automatically on every file save (and on `wright drift` from the Coverage panel); detects structural changes (param renames, return type changes) and LLM-based semantic drift; SQLite-cached so re-saves are instant
- **Dashboard sync** — drift results are pushed to Supabase (`drift_results` table) so `wrightai.live` shows your real, history-based drift count instead of falling back to a fresh-clone live scan. LLM-verified verdicts (with their source/docstring hashes) are also mirrored into the shared `drift_llm_cache` table, so cold-start containers and other devices skip a redundant LLM call for code they've already checked. The repo is identified by its `origin` git remote slug (matching the server's `repo_slug`), not the local folder name, so this still works if you've renamed the folder
- **Codebase chat** — ask questions, get answers with clickable file citations

**Settings** (`settings.json`):
```json
{
  "wright.apiUrl": "https://api.wrightai.live",
  "wright.apiKey": "wai_your_key_here",
  "wright.style": "google",
  "wright.style.python": "google",
  "wright.style.javascript": "jsdoc",
  "wright.style.typescript": "jsdoc",
  "wright.style.rust": "rust"
}
```

No local Python installation or server needed — the backend is fully hosted.

---

## Web Dashboard

The hosted dashboard at [wrightai.live](https://www.wrightai.live) is the sign-in portal, billing/account hub, and control panel for the hosted service. Built with Next.js (App Router) and deployed to Cloud Run — see [web/README.md](web/README.md) for local dev setup.

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | GitHub / Google OAuth sign-in via WorkOS |
| `/dashboard` | Overview — coverage %, drift count, recent activity |
| `/dashboard/generate` | Trigger doc generation for a connected repo |
| `/dashboard/coverage` | Documentation coverage report |
| `/dashboard/drift` | Drift detection results |
| `/dashboard/chat` | Codebase chat (streaming; Claude with automatic Gemini fallback) |
| `/dashboard/keys` | Manage personal `wai_` API keys |
| `/dashboard/usage` | API usage stats |
| `/dashboard/settings` | Account settings |
| `/dashboard/llms-txt` | View / regenerate `llms.txt` |
| `/dashboard/mcp` | MCP server setup instructions |
| `/pricing` | Plans and Paddle checkout |
| `/billing/checkout` | Paddle checkout fallback/retry page |
| `/terms-of-service`, `/privacy-policy`, `/refund-policy` | Legal pages, linked from the footer |

### Billing (Paddle)

1. The user picks a plan on `/pricing`; `Paddle.Checkout.open()` runs in an overlay (sandbox vs. production is chosen automatically from the `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` prefix).
2. On `checkout.completed`, the dashboard shows a success notice and redirects to `/dashboard?upgraded=true`. The plan upgrade is applied via two paths, whichever lands first:
   - **Webhook** — Paddle calls `POST /billing/webhook` (`transaction.completed` / `subscription.updated` / `subscription.canceled`) and the backend writes the new plan to Supabase.
   - **Client fallback** — the dashboard immediately calls `POST /billing/sync-transaction` with the transaction ID; the backend fetches the transaction from Paddle and applies the same update, covering the gap before the webhook arrives.
3. On `checkout.closed` (user dismissed without paying), an info notice is shown and auto-dismisses after 6 seconds.
4. `/billing/checkout` is a fallback page for re-opening checkout (e.g. from a `_ptxn` redirect). It pre-fetches the user's email/API key *before* calling `Paddle.Checkout.open()` so the call stays inside the original click's user-gesture context (required for the overlay to open), and a "completed" guard stops it from re-triggering checkout after a successful purchase.
5. `POST /billing/portal` opens the Paddle customer portal for self-service plan management and cancellation.

---

## GitHub Action

Add to `.github/workflows/docs.yml`:

```yaml
name: Documentation

on: [push, pull_request]

jobs:
  # Keep Wright in its own job — separate from pytest-cov to avoid mixed output
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: surajs1999/WrightAI@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          mode: coverage
          coverage-threshold: "0.8"
```

**Inputs:**
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic-api-key` | ✅ | — | Anthropic API key |
| `voyage-api-key` | No | `""` | Voyage AI key for embeddings |
| `mode` | No | `coverage` | `coverage` · `generate` · `drift` |
| `coverage-threshold` | No | `0.7` | Fail below this fraction (0.0–1.0) |
| `auto-pr` | No | `false` | Open PR with fixes (drift mode only) |
| `path` | No | `.` | Path to scan |

**Outputs:** `coverage-pct`, `drifted-functions`, `pr-url`

See [github-action/README.md](github-action/README.md) for the full reference with all three modes.

---

## MCP Server (Claude Code / Cursor)

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "wright": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "/path/to/your/project",
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "CHROMA_PATH": ".wright/chroma"
      }
    }
  }
}
```

**Available tools:**
- `search_docs` — semantic search across all functions
- `get_function_doc` — detailed documentation for a specific function
- `list_undocumented` — list all undocumented functions

---

## Configuration (`.wright.json`)

```json
{
  "style": "google",
  "verbosity": "standard",
  "languages": ["python", "typescript"],
  "exclude": ["node_modules", "dist", "*.test.ts"],
  "output_dir": "docs",
  "coverage_threshold": 0.8,
  "include_examples": true,
  "model": "claude-sonnet-4-6"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `style` | string | `"google"` | Python docstring style: `google`, `numpy`, `jsdoc`, `epytext` (JS/TS/Go/Rust use their language-native format regardless) |
| `verbosity` | string | `"standard"` | `concise`, `standard`, or `detailed` |
| `languages` | list | all | Languages to document |
| `exclude` | list | common dirs | Directories/glob patterns to skip |
| `output_dir` | string | `"docs"` | Where to write Markdown docs |
| `coverage_threshold` | float | `0.7` | Fail CI below this fraction |
| `include_examples` | bool | `true` | Include usage examples in docstrings |
| `model` | string | `claude-sonnet-4-6` | Claude model to use |

---

## Architecture

> For a deep dive into every module, API endpoint, data store, and request flow, see [ARCHITECTURE.md](ARCHITECTURE.md).

```
wright/
│
├── core/                    # Shared engine
│   ├── parser/              # Tree-sitter AST parsing (6 languages)
│   │   ├── tree_sitter_parser.py   # Language parsers + docstring extraction
│   │   ├── ast_chunker.py          # AST boundary chunking
│   │   ├── dep_graph.py            # NetworkX PageRank dependency graph
│   │   └── cache.py                # SQLite mtime-tracked AST + LLM result cache
│   ├── embeddings/          # Vector store
│   │   ├── voyage_embeddings.py    # voyage-code-3 embeddings
│   │   ├── chroma_store.py         # ChromaDB wrapper
│   │   └── pgvector_store.py       # Supabase pgvector mirror (hosted backend durability)
│   ├── retrieval/           # Hybrid retrieval
│   │   └── hybrid_retriever.py     # Graph (40%) + vector (60%)
│   ├── llm/                 # LLM interface
│   │   ├── gateway.py              # Anthropic SDK wrapper with retry/backoff
│   │   ├── graph.py                # LangGraph critic/rewriter loop (--quality high)
│   │   ├── prompts.py              # Prompt templates + DocStyle enum
│   │   └── schema.py               # Pydantic output schema
│   ├── output/              # Doc writers
│   │   ├── injector.py             # Byte-offset docstring injection (all 6 languages)
│   │   ├── markdown_writer.py      # Markdown output
│   │   └── llms_txt.py             # llms.txt generation
│   ├── drift/               # Drift detection
│   │   └── drift_detector.py       # Structural + LLM semantic drift detection
│   └── config.py            # .wright.json config loader
│
├── api/                     # FastAPI REST backend
│   ├── routes/              # /auth, /generate, /coverage, /drift, /chat, /llms-txt
│   ├── tasks/               # Transactional email tasks (Brevo)
│   ├── repo_store.py        # Supabase repo_meta CRUD (connected-repo metadata)
│   ├── token_store.py       # Supabase tokens CRUD (GitHub OAuth + per-repo deploy tokens)
│   └── user_store.py        # Supabase user + API key management
│
├── cli/                     # Typer CLI (wright command)
├── mcp_server/              # MCP server (stdio transport)
├── vscode-extension/        # VS Code extension (TypeScript)
│   └── src/                 # CodeLens, gutter, hover, drift, chat, coverage
├── web/                     # Next.js dashboard (wrightai.live, Cloud Run)
├── github-action/           # GitHub Action (coverage/generate/drift)
│
├── Dockerfile               # Image for the api Cloud Run service
├── start.sh                 # Container entrypoint (uvicorn api.main:app)
└── cloudrun-{api,web}.yaml  # Cloud Run service definitions
```

**Hosted infrastructure (Google Cloud, `asia-southeast1`):**

Both services are built from the same Docker image (or the `web/` image for the dashboard) and deployed via GitHub Actions (`.github/workflows/deploy-api.yml`, `deploy-web.yml`) to Artifact Registry, then to Cloud Run pinned to an immutable `:<commit-sha>` tag — Cloud Run can skip re-pulling a `:latest` tag if the service spec string is otherwise unchanged, so the SHA tag guarantees every deploy actually picks up the new image.

- **`wrightai-api`** (Cloud Run, 512Mi/1vCPU, scales 0→10) — FastAPI backend at `api.wrightai.live`. `start.sh` warms ChromaDB by copying `/data/chroma` (GCS) → `/tmp/chroma` (local SSD) once at container boot, so reads/writes happen on fast local disk. A daily Cloud Scheduler job calls `POST /internal/cron/onboarding-drip` (shared-secret auth via `CRON_SECRET`) to send onboarding nudge emails — there is no separate worker service.
- **`wrightai-web`** (Cloud Run, 1Gi/1vCPU, scales 0→10) — Next.js dashboard at `wrightai.live` / `www.wrightai.live`.
- **Google Cloud Storage** (bucket `wrightai-data`, mounted via `gcsfuse` at `/data`) — durable backing store:
  - `/data/repos` — backup of cloned repos (the API works against fast local `/tmp/repos`; the GCS copy happens asynchronously, fire-and-forget)
  - `/data/chroma` — ChromaDB vector store; the API copies it into `/tmp/chroma` at startup and writes changes back after indexing
  - `/data/ast_cache.db` — persistent AST/LLM SQLite cache (the API also uses an ephemeral `/tmp/ast_cache.db` per container)
- **Supabase** — Postgres for users, `wai_` API keys, usage tracking, and billing `plans`/subscription state, plus:
  - `repo_meta` — connected-repo metadata (`git_url`, `branch`, `local_path`) keyed by `(user_id, repo_slug)`, managed by `api/repo_store.py` — this is what `list_repos` reads instead of scanning the filesystem
  - `tokens` — GitHub OAuth and per-repo deploy tokens keyed by `(user_id, key)`, managed by `api/token_store.py` (`key` is `_github_oauth` for the user's GitHub OAuth token, or a repo slug for a per-repo deploy token)
  - `drift_results` — per-repo drift "function index" synced from the VS Code extension, keyed by `(user_id, repo_name, file_path, func_name)` → `{status, reason, checked_at}`
  - `drift_llm_cache` — shared LLM drift-verdict cache (L2), keyed by `(src_hash, doc_hash)` → `{status, reason, updated_at}`, with a read-time `WRIGHT_CACHE_TTL_DAYS` (default 30 days) freshness check — mirrors `core/parser/cache.py`'s local SQLite cache (L1) so cold-start containers and other devices skip a redundant LLM call for unchanged code
  - `code_embeddings` — pgvector mirror of each repo's Chroma collection, keyed by `(user_id, repo_slug, chunk_id)`, managed by `core/embeddings/pgvector_store.py`'s `PgVectorStore` — the durable backup used to rebuild Chroma on a cold container start, and the preferred read path for `/generate`, `/chat`, and `/fix-pr` via `DualVectorStore`
- **WorkOS** — OAuth login (GitHub / Google)
- **Paddle** — subscription billing: checkout, customer portal, and webhooks (see [Web Dashboard → Billing](#billing-paddle))
- **Brevo** — transactional email (welcome, quota alerts, onboarding drip), sent synchronously from `api/tasks/email_tasks.py`
- **Gemini** (`gemini-2.5-pro` for chat/docs, `gemini-2.5-flash` for drift) — automatic fallback model used whenever an Anthropic call fails (e.g. rate limit/overload)

**Data flow (doc generation):**
1. Files → Tree-sitter AST parser → `ParsedFunction` objects
2. Functions → AST chunker → `CodeChunk` objects (chunk ID = `sha256("{file_path}:{start_line}:{source}")`, so identical code duplicated across files/lines gets distinct ChromaDB IDs)
3. Chunks → Voyage AI embeddings → ChromaDB vector store
4. Query/function → Hybrid retriever (vector + PageRank) → `RetrievedContext`
5. Context + function → LLM gateway (Claude, falling back to Gemini on failure) → `DocstringSchema`
6. Schema → Injector (byte-offset, language-aware) → Modified source file

**Repo connect flow** (`POST /repos/connect`, `api/routes/repos.py`):
0. `check_quota(api_key, "repo_connect", raise_on_blocked=True)` — 403 if the plan disables repo connections, 429 if the plan's repo limit is already reached
1. Shallow `git clone --depth=1` (or fast-forward pull of an existing clone) into `/tmp/repos/{user_id}/{repo_slug}` on local SSD — `repo_slug` is derived from the git remote URL (last path segment, minus `.git`)
2. Repo metadata (`git_url`, `branch`, `local_path`) is saved to Supabase (`repo_meta`, keyed by `user_id` + `repo_slug`, via `api/repo_store.py`)
3. The response returns immediately while three things continue in the background:
   - Async copy of the clone to `/data/repos/{user_id}/{repo_slug}` (GCS) for durability
   - Async ChromaDB indexing (parse → embed → upsert), if `VOYAGE_API_KEY` is set — the same chunks/embeddings are also mirrored to Supabase pgvector (`code_embeddings`) as a durable backup for rebuilding Chroma on a cold start
   - Async GitHub webhook registration (push events → `/webhooks/github`), so future pushes re-sync automatically

**Repo disconnect flow** (`DELETE /repos/{repo_name}`, `api/routes/repos.py`): deletes the repo's Chroma collection and its `code_embeddings` pgvector backup, removes the local clone directory, deletes the GCS tarball/legacy directory backups, removes the `repo_meta` row (`api/repo_store.py`), and deletes any stored GitHub token for that repo (`api/token_store.py`). Returns 404 if none of the local directory or its GCS backups exist.

**Drift sync flow (VS Code extension → dashboard):**
1. On file save (or `wright drift` from the Coverage panel), the extension runs a local drift scan against its SQLite-cached AST baseline
2. It resolves the repo's identity the same way the server does — from the `origin` (or first available) git remote URL, not the local folder name — and POSTs results to `POST /drift-check/sync`
3. The API upserts each `{file_path}:{func_name}` result into `drift_results` (keyed by `user_id`/`repo_name`/`file_path`/`func_name`). Results backed by an LLM verdict also carry `src_hash`/`doc_hash`, which the API mirrors into `drift_llm_cache` (L2) — so cold-start containers and other devices skip a redundant LLM call for the same source + docstring
4. The dashboard's `GET /drift-check/results/{repo_name}` reads `drift_results` for the home page's "Drifted" count; if it's empty (e.g. a freshly connected repo with no local extension activity yet), the dashboard falls back to a live, structural-only scan via `POST /drift-check`

**Auth flow:**
1. User signs in via WorkOS (GitHub/Google) at `www.wrightai.live`
2. Backend generates a unique `wai_` API key → stored in Supabase
3. Key sent on every request via `X-Wright-API-Key` header

---

## Environment Variables

For CLI / self-hosted usage only. VS Code users do not need these.

```
ANTHROPIC_API_KEY    — Anthropic API key (required for doc generation)
GEMINI_API_KEY       — Gemini API key; automatic fallback (gemini-2.5-pro/-flash) when an Anthropic call fails (optional)
VOYAGE_API_KEY       — Voyage AI key for code embeddings (required for chat/search)
GITHUB_TOKEN         — For auto-PR in drift mode (optional)
WRIGHT_CACHE_TTL_DAYS — TTL in days for the shared LLM result cache (Supabase `drift_llm_cache`, default: 30)
CHROMA_PATH          — ChromaDB storage path (default: .wright/chroma)
SQLITE_CACHE_PATH    — AST cache DB path (default: .wright/ast_cache.db)
WRIGHT_API_PORT      — API server port (default: 8765)
REPOS_TMP_PATH       — Local working directory for cloned repos (hosted backend only, default: /tmp/repos)
REPOS_PATH           — Durable backup location for cloned repos, e.g. a GCS Fuse mount (hosted backend only, default: /data/repos)
CORS_ORIGINS         — Comma-separated allowed origins for the API (hosted backend only)
WORKOS_API_KEY       — WorkOS API key (hosted backend only)
WORKOS_CLIENT_ID     — WorkOS client ID (hosted backend only)
SUPABASE_URL         — Supabase project URL (hosted backend only)
SUPABASE_SERVICE_KEY — Supabase service role key (hosted backend only)
FRONTEND_URL         — Dashboard URL used for OAuth/billing redirects (hosted backend only, default: https://www.wrightai.live)
PADDLE_API_KEY       — Paddle API key for checkout/portal/webhook calls (hosted backend only)
PADDLE_WEBHOOK_SECRET — Verifies incoming Paddle webhook signatures (hosted backend only)
PADDLE_API_URL       — Paddle API base URL (default: https://api.paddle.com)
BREVO_API_KEY        — Brevo transactional email API key (hosted backend only)
BREVO_FROM_EMAIL     — From-address for transactional email (default: hello@wrightai.live)
CRON_SECRET          — Shared secret required in the X-Cron-Secret header for POST /internal/cron/* (hosted backend only)
```

---

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Install the pre-commit hook (runs ruff check --fix + ruff format on every commit)
pre-commit install

# Run tests
pytest tests/ -v

# Lint
ruff check . --fix && ruff format .

# Start API server
wright-api

# Start MCP server
wright-mcp

# Build VS Code extension
cd vscode-extension && npm install && npm run build

# Start web dashboard (dev)
cd web && npm install && npm run dev
```

---

## Support

Found a bug or have a suggestion? [Open a GitHub issue](https://github.com/surajs1999/WrightAI/issues)

For general questions or feedback, start a [GitHub Discussion](https://github.com/surajs1999/WrightAI/discussions).

---

## Security

- API key auth on every request — personal `wai_` keys generated on sign-in, stored in Supabase
- Source code is sent to Anthropic (doc generation/chat) and Voyage AI (embeddings) only on explicit user commands
- Dependencies scanned for CVEs on every CI run via `pip-audit`

See [SECURITY.md](SECURITY.md) for full details and vulnerability reporting.

---

## License

GNU Affero General Public License v3.0 (AGPL-3.0-or-later)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the [LICENSE](LICENSE) file for the full license text.

For commercial/enterprise use without AGPL obligations, see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) or contact surajsahoo19991012@gmail.com.
