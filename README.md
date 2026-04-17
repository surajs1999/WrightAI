# Wright — AI-Powered Code Documentation

> "Your codebase, written."

Wright automatically generates, maintains, and serves code documentation using Claude AI. It supports Python, JavaScript, TypeScript, Java, Go, and Rust.

---

## Install

```bash
pip install wright
```

Or install from source:

```bash
git clone https://github.com/your-org/wright
cd wright
pip install -e ".[dev]"
```

---

## Quick Start (5 steps)

```bash
# 1. Copy the environment template and add your API keys
cp .env.example .env

# 2. Initialize Wright in your project
wright init .

# 3. Generate documentation for all undocumented functions
wright generate src/

# 4. Check documentation coverage
wright coverage .

# 5. Chat with your codebase
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

1. Install the `wright` extension from the VS Code marketplace (or build from source).
2. Open a Python/JS/TS/Java/Go/Rust file.
3. Click **"Generate Docs"** above any function via CodeLens.
4. Use **Wright: Chat with codebase** (`Ctrl+Shift+P`) for interactive chat.

**Settings** (`settings.json`):
```json
{
  "wright.apiUrl": "http://localhost:8765",
  "wright.apiKey": "",
  "wright.style": "google"
}
```

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
      - uses: your-org/wright@v1
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
  "model": "claude-sonnet-4-5"
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
| `model` | string | `claude-sonnet-4-5` | Claude model to use |

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
├── api/                     # FastAPI REST backend (port 8765)
│   ├── routes/              # /generate, /coverage, /drift-check, /chat
│   └── tasks/               # Celery async jobs
│
├── cli/                     # Typer CLI (wright command)
├── mcp_server/              # MCP server (stdio transport)
├── vscode-extension/        # VS Code extension (TypeScript)
│   └── src/                 # CodeLens, injector, drift, chat, coverage
└── github-action/           # GitHub Action (coverage/generate/drift)
```

**Data flow:**
1. Files → Tree-sitter AST parser → `ParsedFunction` objects
2. Functions → AST chunker → `CodeChunk` objects
3. Chunks → Voyage embeddings → ChromaDB vector store
4. Query/function → Hybrid retriever (vector + PageRank) → `RetrievedContext`
5. Context + function → LLM gateway (Claude) → `DocstringSchema`
6. Schema → Injector (byte-offset) → Modified source file

---

## Environment Variables

```
ANTHROPIC_API_KEY   — Anthropic API key (required)
VOYAGE_API_KEY      — Voyage AI key (recommended for code embeddings)
OPENAI_API_KEY      — OpenAI key (fallback embeddings)
GITHUB_TOKEN        — For auto-PR in drift mode
REDIS_URL           — Redis URL for Celery (default: redis://localhost:6379/0)
CHROMA_PATH         — ChromaDB storage path (default: .wright/chroma)
SQLITE_CACHE_PATH   — AST cache DB path (default: .wright/ast_cache.db)
WRIGHT_API_PORT     — API server port (default: 8765)
WRIGHT_API_KEY      — Optional API key to protect the REST API
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

## License

GNU Affero General Public License v3.0 (AGPL-3.0)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the [LICENSE](LICENSE) file for the full license text.
