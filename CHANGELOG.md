# Changelog

All notable changes to Wright will be documented here.

## [0.1.0] — 2026-04-17

### Added
- **AI doc generation** — Generate Google, NumPy, JSDoc, Epytext, or Rust-style docstrings for any function using Claude AI
- **6-language support** — Python, JavaScript, TypeScript, Java, Go, Rust via Tree-sitter AST parsing
- **Drift detection** — Flags functions whose documentation is stale after signature changes
- **Coverage report** — Per-file documentation coverage as a percentage, with CI threshold enforcement
- **Codebase chat** — Ask plain-English questions about your code, get answers with file:line citations
- **CodeLens** — "Generate Docs" button appears inline above every undocumented function
- **Byte-offset injection** — Docstrings written directly into source files without reformatting surrounding code
- **llms.txt generation** — Produces a machine-readable index of all documented functions
- **FastAPI backend** — REST API at port 8765 for editor and CI integrations
- **MCP server** — Works as an MCP tool server for Claude Code and Cursor
- **GitHub Action** — Drop-in CI step for coverage checks, doc generation, and drift detection
- **CLI** — `wright init`, `wright generate`, `wright coverage`, `wright drift`, `wright chat`, `wright llms-txt`
