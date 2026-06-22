# Security Policy

## Reporting a Vulnerability

Do **not** open a public GitHub issue for security vulnerabilities.

Email **hello@wrightai.live** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge within 48 hours and aim to release a fix within 14 days.

## Security Design

- **No telemetry** — WrightAI collects no usage data of its own.
- **API key auth** — the REST API requires a key on every request. A unique key is auto-generated on first run and stored at `~/.wright/api.key` (mode 0600).
- **Restricted permissions** — the `.wright/` data directory is created with mode 0700 (owner read/write only).
- **Dependency scanning** — all dependencies are scanned for known CVEs on every CI run via `pip-audit`.
- **Third-party APIs** — WrightAI uses Anthropic (Claude) for doc generation and chat, and Voyage AI for code embeddings. Source code is sent to these services only on explicit user commands. Review [Anthropic's privacy policy](https://www.anthropic.com/privacy) and [Voyage AI's privacy policy](https://www.voyageai.com/privacy) for data handling details.

## What Leaves Your Machine

| Data | Destination | When |
|---|---|---|
| Function source code (for doc generation) | Anthropic API | Only when you run `wright generate` |
| Query text (for chat) | Anthropic API | Only when you run `wright chat` |
| Source code embeddings | Voyage AI API (if configured) | Only during `wright generate` indexing |

Nothing is sent automatically or in the background.

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |
