# Changelog

All notable changes to Wright will be documented here.

## [Unreleased] — 2026-06-21

### Changed — Platform repositioning
- **WrightAI is now the Documentation Intelligence Platform** — repositioned from "AI code documentation tool" to a platform that generates, verifies, and maintains documentation continuously
- New homepage headline: *"Documentation that never lies."*
- Three-pillar messaging: **Generate** · **Verify** · **Understand**
- Drift detection established as the flagship differentiator — no other tool does this

### Added — Homepage (complete redesign)
- Hero section with drift-detection terminal demo
- Trust strip — scrolling capability marquee
- Problem section — git-diff style "says vs does" documentation lies
- Three Pillars section — tabbed interactive terminals per pillar
- Drift Detection flagship section — Structural vs Semantic drift explained
- Get Started section — VS Code, CLI, GitHub Actions, MCP Server cards
- Command Center section — documentation health dashboard mockup
- AI Context section — MCP before/after showing reliable AI knowledge
- Compare section — Wright vs Copilot, Cursor, Claude Code, Mintlify
- Why Now section — AI acceleration + documentation debt urgency
- Feedback section — feature request form + enterprise contact
- Final CTA section — "WrightAI is not another documentation generator"
- Scroll Ruler — fixed left sidebar with section progress indicator

### Added — Language landing pages (complete redesign)
- `/python`, `/typescript`, `/javascript`, `/go`, `/rust` — fully redesigned with NavbarV2, FooterV2, homepage-grade hero, before/after terminal blocks, SVG feature cards, comparison cards

### Added — Visual system
- Section-specific SVG/CSS background patterns (diagonal lines, hex mesh, waveform, scan lines, bar columns, neural net, table grid, arrows, zigzag)
- Coloured top-accent lines per section (red, purple, amber, green, cyan, rainbow)
- Consistent ambient glow orbs per section
- Left scroll ruler with section progress, dot indicators, and labels on scroll

### Changed — Site-wide consistency
- NavbarV2 + FooterV2 deployed across all pages (pricing, docs, legal, language pages)
- Logo updated to 36×36 + "Doc Intelligence" subtitle on all pages
- Navbar hash links fixed to `/#pillars`, `/#drift`, `/#compare` (work from any page)
- Contact email updated to `hello@wrightai.live` site-wide

### Documented (previously undocumented in ARCHITECTURE.md)
- **HTTP Rate Limiting** (`api/rate_limit.py`) — slowapi middleware; per-API-key bucketing for `wai_` keys, per-IP for anonymous; separate from the quota system
- **Observability** (`api/observability.py`) — structured JSON logging via `pythonjsonlogger` (Cloud Logging-compatible) + Sentry error tracking (enabled via `SENTRY_DSN`, FastAPI + Logging integrations, error-only, Cloud Run revision as release tag)
- **GA4** (`web/app/layout.tsx`) — `G-934CQXQ86Z` injected globally via `gtag.js`; hardcoded constant, not an env var; all public and dashboard pages tracked

### Changed — SEO / metadata
- Page title: "Wright AI — Documentation Intelligence Platform | Documentation that Never Lies"
- Keywords expanded: documentation intelligence platform, drift detection, documentation reliability, documentation accuracy
- FAQ schema: added "What is a Documentation Intelligence Platform?" and comparison vs Copilot/Cursor/Mintlify questions
- `llms.txt` rewritten with full three-pillar structure, integrations breakdown, exclusive capabilities list

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
