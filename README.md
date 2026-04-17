# WrightAI — AI-Powered Code Documentation

> "Your codebase, written."

WrightAI automatically generates, maintains, and serves code documentation using Claude AI. It supports Python, JavaScript, TypeScript, Java, Go, and Rust.

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
2. Sign in at `https://wrightai-api.fly.dev/auth/login` → get your `wai_` API key
3. Add key to VS Code settings under **Wright: Api Key**
4. Click **Generate Docs** above any function — done

### CLI / Self-hosted
```bash
# 1. Install
pip install wright

# 2. Copy env template and add your API keys
cp .env.example .env

# 3. Initialize WrightAI in your project
wright init .

# 4. Generate documentation
wright generate src/

# 5. Check coverage
wright coverage .

# 6. Chat with your codebase
wright chat .
```

---

## CLI Reference

### `wright init [REPO]`
Scan the repository, detect language, show sample docstrings, and create `.wright.json`.

```bash
wright init .
wright init /path/to/project
```

### `wright generate [PATH]`
Generate docstrings for all undocumented functions.

```bash
wright generate .                          # Entire repo
wright generate src/api/routes.py          # Single file
wright generate . --style numpy            # Override style
wright generate . --dry-run                # Preview only
```

Options:
- `--style` — `google` | `numpy` | `jsdoc` | `epytext` | `rust`
- `--dry-run` — preview without writing to disk
- `--watch` — watch for file changes (coming soon)

### `wright coverage [PATH]`
Show documentation coverage as a table. Exits with code 1 if below threshold.

```bash
wright coverage .
wright coverage . --output coverage.json   # Write JSON report
```

### `wright drift [PATH]`
Check for documentation drift since a git ref.

```bash
wright drift .
wright drift . --since HEAD~5
wright drift . --auto-pr                   # Open GitHub PR with fixes
```

### `wright chat [PATH]`
Interactive codebase chat. Each answer includes file:line citations.

```bash
wright chat .
```

Type `exit` to quit.

### `wright llms-txt [PATH]`
Generate or update `llms.txt` at the repository root.

```bash
wright llms-txt .
```

---

## VS Code Extension

1. Install the `WrightAI` extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WrightAI.wrightai)
2. Sign in at `https://wrightai-api.fly.dev/auth/login` with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings → search `WrightAI` → paste your key into **Wright: Api Key**
5. Open any supported file and click **"Generate Docs"** via CodeLens

**Settings** (`settings.json`):
```json
{
  "wright.apiUrl": "https://wrightai-api.fly.dev",
  "wright.apiKey": "wai_your_key_here",
  "wright.style": "google"
}
```

No Python installation or local server needed — the backend is hosted.

---

## GitHub Action

Add to `.github/workflows/docs.yml`:

```yaml
name: Documentation Check

on: [push, pull_request]

jobs:
  check-docs:
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
| Input | Description | Default |
|-------|-------------|---------|
| `anthropic-api-key` | Anthropic API key | required |
| `voyage-api-key` | Voyage AI key for embeddings | optional |
| `mode` | `coverage` \| `generate` \| `drift` | `coverage` |
| `coverage-threshold` | Fail below this (0.0–1.0) | `0.7` |
| `auto-pr` | Open PR with fixes (drift mode) | `false` |
| `path` | Path to check | `.` |

**Outputs:** `coverage-pct`, `drifted-functions`, `pr-url`

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
| `style` | string | `"google"` | Docstring style: `google`, `numpy`, `jsdoc`, `epytext`, `rust` |
| `verbosity` | string | `"standard"` | `concise`, `standard`, or `detailed` |
| `languages` | list | all | Languages to document |
| `exclude` | list | common dirs | Directories/patterns to skip |
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
│   │   ├── tree_sitter_parser.py   # Language parsers
│   │   ├── ast_chunker.py          # cAST boundary chunking
│   │   ├── dep_graph.py            # NetworkX PageRank dependency graph
│   │   └── cache.py                # SQLite mtime-tracked AST cache
│   ├── embeddings/          # Vector store
│   │   ├── voyage_embeddings.py    # voyage-code-3 embeddings
│   │   └── chroma_store.py         # ChromaDB wrapper
│   ├── retrieval/           # Hybrid retrieval
│   │   └── hybrid_retriever.py     # Graph (40%) + vector (60%)
│   ├── llm/                 # LLM interface
│   │   ├── gateway.py              # Anthropic SDK wrapper
│   │   ├── prompts.py              # Prompt templates
│   │   └── schema.py               # Pydantic output schema
│   ├── output/              # Doc writers
│   │   ├── injector.py             # Byte-offset docstring injection
│   │   ├── markdown_writer.py      # Markdown output
│   │   └── llms_txt.py             # llms.txt generation
│   ├── drift/               # Drift detection
│   │   └── drift_detector.py       # AST diff staleness detection
│   └── config.py            # .wright.json config loader
│
├── api/                     # FastAPI REST backend
│   ├── routes/              # /auth, /generate, /coverage, /drift-check, /chat
│   ├── tasks/               # Celery async jobs
│   └── user_store.py        # Supabase user + API key management
│
├── cli/                     # Typer CLI (wright command)
├── mcp_server/              # MCP server (stdio transport)
├── vscode-extension/        # VS Code extension (TypeScript)
│   └── src/                 # CodeLens, injector, drift, chat, coverage
└── github-action/           # GitHub Action (coverage/generate/drift)
```

**Hosted infrastructure:**
- **Fly.io** — FastAPI backend at `https://wrightai-api.fly.dev`
- **WorkOS** — OAuth login (GitHub / Google)
- **Supabase** — Per-user API key storage and usage tracking

**Data flow:**
1. Files → Tree-sitter AST parser → `ParsedFunction` objects
2. Functions → AST chunker → `CodeChunk` objects
3. Chunks → Voyage AI embeddings → ChromaDB vector store
4. Query/function → Hybrid retriever (vector + PageRank) → `RetrievedContext`
5. Context + function → LLM gateway (Claude) → `DocstringSchema`
6. Schema → Injector (byte-offset) → Modified source file

**Auth flow:**
1. User signs in via WorkOS (GitHub/Google)
2. Backend generates a unique `wai_` API key → stored in Supabase
3. Key used on every request via `X-Wright-API-Key` header

---

## Environment Variables

For CLI / self-hosted usage only. VS Code users do not need to set these.

```
ANTHROPIC_API_KEY   — Anthropic API key (required)
VOYAGE_API_KEY      — Voyage AI key for code embeddings (required)
GITHUB_TOKEN        — For auto-PR in drift mode (optional)
REDIS_URL           — Redis URL for Celery (default: redis://localhost:6379/0)
CHROMA_PATH         — ChromaDB storage path (default: .wright/chroma)
SQLITE_CACHE_PATH   — AST cache DB path (default: .wright/ast_cache.db)
WRIGHT_API_PORT     — API server port (default: 8765)
WRIGHT_API_KEY      — Override the auto-generated REST API key (optional)
WORKOS_API_KEY      — WorkOS API key (hosted backend only)
WORKOS_CLIENT_ID    — WorkOS client ID (hosted backend only)
SUPABASE_URL        — Supabase project URL (hosted backend only)
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
```

---

## Support

Found a bug or have a suggestion? [Open a GitHub issue](https://github.com/surajs1999/WrightAI/issues)

For general questions or feedback, start a [GitHub Discussion](https://github.com/surajs1999/WrightAI/discussions).

---

## Security

- API key auth on every request — auto-generated on first run, stored at `~/.wright/api.key` (mode 0600)
- `.wright/` data directory restricted to owner only (mode 0700)
- Dependencies scanned for CVEs on every CI run via `pip-audit`
- Source code sent to Anthropic (doc generation/chat) and Voyage AI (embeddings) only on explicit user commands

See [SECURITY.md](SECURITY.md) for full details and vulnerability reporting.

---

## License

GNU Affero General Public License v3.0 (AGPL-3.0-or-later)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the [LICENSE](LICENSE) file for the full license text.

For commercial/enterprise use without AGPL obligations, see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) or contact surajsahoo19991012@gmail.com.
