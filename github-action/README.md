# Wright AI — GitHub Action

Automatically check documentation coverage, detect drift, and generate docstrings in CI.

---

## Quick Start

Add Wright as a **separate job** from your test suite. This keeps Wright's output clean and isolated — it won't mix with pytest-cov or other coverage tools.

```yaml
jobs:
  # Your existing test job — unchanged
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/ --cov

  # Wright in its own job — separate output, separate summary
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: surajs1999/WrightAI@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          mode: coverage
          threshold: "0.7"
```

> **Why a separate job?**
> Running Wright in the same job as pytest-cov causes both outputs to appear together in the log. Users can mistake pytest-cov's line coverage table for Wright's documentation coverage. Separate jobs give clean, unambiguous output and independent pass/fail status.

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `anthropic-api-key` | ✅ | — | Anthropic API key for doc generation |
| `voyage-api-key` | No | `""` | Voyage AI key for embeddings (used in `generate` mode) |
| `mode` | No | `coverage` | `coverage` · `generate` · `drift` |
| `threshold` | No | `0.7` | Fail if documentation coverage drops below this (0.0–1.0) |
| `auto-pr` | No | `false` | Open a PR with generated docs (drift mode only) |
| `path` | No | `.` | Path to scan (defaults to repo root) |

---

## Outputs

| Output | Description |
|---|---|
| `coverage-pct` | Documentation coverage percentage |
| `drifted-functions` | Number of functions with stale docs |
| `pr-url` | URL of the auto-opened PR (drift + auto-pr mode) |

---

## Modes

### `coverage` — Enforce documentation coverage

Scans your codebase and fails CI if documentation coverage drops below the threshold.

```yaml
- uses: surajs1999/WrightAI@v1
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    mode: coverage
    threshold: "0.8"   # fail below 80%
```

### `generate` — Auto-generate missing docstrings

Generates docstrings for all undocumented functions and commits them to the branch.

```yaml
- uses: surajs1999/WrightAI@v1
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    mode: generate
```

### `drift` — Detect stale documentation

Checks if any function signatures have changed since their docstring was written.

```yaml
- uses: surajs1999/WrightAI@v1
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    mode: drift
    auto-pr: "true"   # open a PR to fix drift automatically
```

---

## Full Example

```yaml
name: Documentation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  docs-coverage:
    name: Documentation Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: surajs1999/WrightAI@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          mode: coverage
          threshold: "0.7"

  docs-drift:
    name: Documentation Drift
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: surajs1999/WrightAI@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          mode: drift
```

---

## GitHub Step Summary

Wright writes a clean summary to GitHub's job summary panel. View it under **Actions → your workflow run → Summary**.

---

## Secrets

Add your Anthropic API key to your repository:  
`Settings → Secrets and variables → Actions → New repository secret`

Name: `ANTHROPIC_API_KEY`
