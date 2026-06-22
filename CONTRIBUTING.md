# Contributing to WrightAI

Thank you for your interest in contributing to WrightAI. All contributions are welcome — bug fixes, new language support, documentation improvements, and feature additions.

## Before You Start

For anything beyond a small bug fix, open an issue first so we can discuss the approach before you invest time writing code.

## How to Contribute

1. Fork the repository
2. Create a branch: `git checkout -b fix/my-fix` or `feat/my-feature`
3. Make your changes with tests
4. Run the test suite: `pytest tests/ -v`
5. Lint: `ruff check . --fix && ruff format .`
6. Open a pull request against `main`

## Development Setup

```bash
git clone https://github.com/surajs1999/WrightAI
cd WrightAI
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # add your ANTHROPIC_API_KEY
pytest tests/ -v
```

## Code Standards

- Full type annotations on all public functions
- No `TODO` or stub implementations in merged code
- Tests for every new function or behaviour
- Comments only where the *why* is non-obvious

## Contributor License Agreement (CLA)

WrightAI is dual-licensed: community use under AGPL-3.0, and a separate commercial license for enterprise customers (see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)).

**By submitting a pull request, you agree to the following:**

> I grant the WrightAI project maintainers a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, sublicense, and distribute my contribution as part of WrightAI under any license, including the AGPL-3.0 and any commercial license offered by the project maintainers. I confirm that I have the right to grant this license and that my contribution does not violate any third-party rights.

This CLA is necessary to allow the project to be dual-licensed. If you cannot agree to these terms, please open an issue to discuss alternatives before contributing.

## Reporting Security Issues

Do **not** open a public GitHub issue for security vulnerabilities. Email **hello@wrightai.live** directly with details. We will respond within 48 hours.

## Questions

Open a [GitHub Discussion](https://github.com/surajs1999/WrightAI/discussions) for general questions.
