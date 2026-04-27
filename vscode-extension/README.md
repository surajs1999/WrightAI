# WrightAI — AI Code Documentation for VS Code

WrightAI brings AI-powered documentation directly into your editor. Generate docstrings, track coverage, detect drift, and chat with your codebase — all without leaving VS Code.

Powered by Claude (Anthropic). No local server or Python installation required — the backend is fully hosted.

---

## Getting Started

1. Install this extension from the VS Code Marketplace
2. Sign in at **[wrightai-web.fly.dev](https://wrightai-web.fly.dev)** with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings (`Cmd+,` / `Ctrl+,`), search for `WrightAI`, and paste the key into **Wright: Api Key**
5. Open any supported file — a **Generate Docs** CodeLens button will appear above each function

---

## Features

### Generate Docstrings
Click the **Generate Docs** CodeLens button above any function, or press `Cmd+Shift+D` / `Ctrl+Shift+D` with your cursor inside a function.

A **side-by-side diff preview** shows the generated docstring before anything is written — accept or discard with one click. After your first injection, Wright reminds you that saving the file will automatically check for documentation drift.

You can also:
- Right-click anywhere in a file → **Wright: Generate docs for this function**
- Hover over any function name to see the existing docstring and a **Generate docs** link inline

### Generate Docs for Entire File
Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
```
Wright: Generate docs for entire file
```
WrightAI documents every undocumented function in the file with a live progress bar showing per-function status.

### Gutter Icons
Every function line shows a real-time status icon in the editor gutter:
- **✓** (green) — documented and up to date
- **○** (grey) — no documentation yet
- **⚠** (amber) — documentation is out of date (drifted)

### Chat with Your Codebase
Run **Wright: Chat with codebase** from the Command Palette to open an interactive chat panel. Ask anything:
- "How does authentication work?"
- "Where is the payment logic?"
- "Explain the retry mechanism"
- "What does the `process_batch` function do?"

Answers stream in real time, include **clickable file citations** that jump straight to the source, and suggest **follow-up questions** to keep the conversation going. Full conversation history is maintained across turns.

### Coverage Dashboard
The **Wright Coverage** panel in the Explorer sidebar shows live documentation coverage. Run **Wright: Show coverage** to refresh it, or watch the status bar percentage update as you document your code.

### Drift Detection
Run **Wright: Check for doc drift** to find functions whose code has changed since their docstring was written. Stale functions are highlighted with an **⚠ docs outdated** inline marker and a regenerate CodeLens button.

Drift is also checked automatically every time you save a file.

---

## Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Cmd+Shift+D` / `Ctrl+Shift+D` | Generate docs for the current function |

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `wright.apiUrl` | `https://wrightai-api.fly.dev` | WrightAI backend URL |
| `wright.apiKey` | _(empty)_ | Your personal `wai_` API key |
| `wright.style` | `google` | Default docstring style |
| `wright.style.python` | `google` | Python style: `google`, `numpy`, `epytext` |
| `wright.style.javascript` | `jsdoc` | JavaScript style: `jsdoc` |
| `wright.style.typescript` | `jsdoc` | TypeScript style: `jsdoc` |
| `wright.style.rust` | `rust` | Rust style: `rust` |

---

## Supported Languages

Python · JavaScript · TypeScript · Java · Go · Rust

---

## Coming Soon

- **Batch generation** — document an entire folder or workspace in one click
- **Doc quality score** — per-function completeness and accuracy rating
- **Multi-model support** — choose Claude model from VS Code settings

---

## Support

- Bug reports and feature requests: [GitHub Issues](https://wrightai-web.fly.dev/)
- Questions and feedback: [GitHub Discussions](https://github.com/surajs1999/WrightAI/discussions)
