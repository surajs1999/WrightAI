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
2. Sign in at [wrightai-web.fly.dev](https://wrightai-web.fly.dev) with GitHub or Google
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
- `--dry-run` — preview the generated docstring without modifying files
- `--watch` — watch for file changes and regenerate on save

### `wright coverage [PATH]`
Show a documentation coverage table. Exits with code 1 if below threshold.

```bash
wright coverage .
wright coverage . --output coverage.json   # Write JSON report
```

### `wright drift [PATH]`
Detect functions whose code has changed since their docstring was written.

```bash
wright drift .
wright drift . --since HEAD~5
wright drift . --auto-pr                   # Open a GitHub PR with fixes
```

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
2. Sign in at [wrightai-web.fly.dev](https://wrightai-web.fly.dev) with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings (`Cmd+,`) → search `WrightAI` → paste into **Wright: Api Key**
5. Open any supported file — a **Generate Docs** CodeLens button appears above each function

**Features:**
- **CodeLens** — "Generate Docs" / "⚠ Docs outdated — regenerate" above every function
- **Gutter icons** — ✓ (documented), ○ (undocumented), ⚠ (drifted) on every function line
- **Diff preview** — side-by-side preview before any change is written
- **Hover** — shows the existing docstring and a regenerate link on hover
- **Coverage panel** — live doc coverage % in the Explorer sidebar
- **Drift detection** — checked automatically on every file save
- **Codebase chat** — ask questions, get answers with clickable file citations

**Settings** (`settings.json`):
```json
{
  "wright.apiUrl": "https://wrightai-api.fly.dev",
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

```
wright/
│
├── core/                    # Shared engine
│   ├── parser/              # Tree-sitter AST parsing (6 languages)
│   │   ├── tree_sitter_parser.py   # Language parsers + docstring extraction
│   │   ├── ast_chunker.py          # AST boundary chunking
│   │   ├── dep_graph.py            # NetworkX PageRank dependency graph
│   │   └── cache.py                # SQLite mtime-tracked AST cache
│   ├── embeddings/          # Vector store
│   │   ├── voyage_embeddings.py    # voyage-code-3 embeddings
│   │   └── chroma_store.py         # ChromaDB wrapper
│   ├── retrieval/           # Hybrid retrieval
│   │   └── hybrid_retriever.py     # Graph (40%) + vector (60%)
│   ├── llm/                 # LLM interface
│   │   ├── gateway.py              # Anthropic SDK wrapper with retry/backoff
│   │   ├── prompts.py              # Prompt templates + DocStyle enum
│   │   └── schema.py               # Pydantic output schema
│   ├── output/              # Doc writers
│   │   ├── injector.py             # Byte-offset docstring injection (all 6 languages)
│   │   ├── markdown_writer.py      # Markdown output
│   │   └── llms_txt.py             # llms.txt generation
│   ├── drift/               # Drift detection
│   │   └── drift_detector.py       # AST diff staleness detection
│   └── config.py            # .wright.json config loader
│
├── api/                     # FastAPI REST backend
│   ├── routes/              # /auth, /generate, /coverage, /drift, /chat, /llms-txt
│   ├── tasks/               # Async generation tasks
│   └── user_store.py        # Supabase user + API key management
│
├── cli/                     # Typer CLI (wright command)
├── mcp_server/              # MCP server (stdio transport)
├── vscode-extension/        # VS Code extension (TypeScript)
│   └── src/                 # CodeLens, gutter, hover, drift, chat, coverage
├── web/                     # Next.js dashboard (wrightai-web.fly.dev)
└── github-action/           # GitHub Action (coverage/generate/drift)
```

**Hosted infrastructure:**
- **Fly.io** — FastAPI backend at `https://wrightai-api.fly.dev`; Next.js dashboard at `https://wrightai-web.fly.dev`
- **WorkOS** — OAuth login (GitHub / Google)
- **Supabase** — Per-user API key storage and usage tracking

**Data flow:**
1. Files → Tree-sitter AST parser → `ParsedFunction` objects
2. Functions → AST chunker → `CodeChunk` objects
3. Chunks → Voyage AI embeddings → ChromaDB vector store
4. Query/function → Hybrid retriever (vector + PageRank) → `RetrievedContext`
5. Context + function → LLM gateway (Claude) → `DocstringSchema`
6. Schema → Injector (byte-offset, language-aware) → Modified source file

**Auth flow:**
1. User signs in via WorkOS (GitHub/Google) at `wrightai-web.fly.dev`
2. Backend generates a unique `wai_` API key → stored in Supabase
3. Key sent on every request via `X-Wright-API-Key` header

---

## Environment Variables

For CLI / self-hosted usage only. VS Code users do not need these.

```
ANTHROPIC_API_KEY    — Anthropic API key (required for doc generation)
VOYAGE_API_KEY       — Voyage AI key for code embeddings (required for chat/search)
GITHUB_TOKEN         — For auto-PR in drift mode (optional)
REDIS_URL            — Redis URL for Celery (default: redis://localhost:6379/0)
CHROMA_PATH          — ChromaDB storage path (default: .wright/chroma)
SQLITE_CACHE_PATH    — AST cache DB path (default: .wright/ast_cache.db)
WRIGHT_API_PORT      — API server port (default: 8765)
WORKOS_API_KEY       — WorkOS API key (hosted backend only)
WORKOS_CLIENT_ID     — WorkOS client ID (hosted backend only)
SUPABASE_URL         — Supabase project URL (hosted backend only)
SUPABASE_SERVICE_KEY — Supabase service role key (hosted backend only)
```

---

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Lint
ruff check . --fix && ruff format .

# Start API server
wright-api

# Start Celery worker (requires Redis)
celery -A api.tasks.celery_app worker --loglevel=info

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
