# WrightAI — AI Code Documentation for VS Code

WrightAI brings AI-powered documentation directly into your editor. Generate docstrings, track coverage, detect drift, and chat with your codebase — all without leaving VS Code.

No local server or Python installation required. The backend is fully hosted.

---

## Getting Started

1. Install this extension from the VS Code Marketplace
2. Sign in at [wrightai-web.fly.dev](https://wrightai-web.fly.dev) with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings (`Cmd+,` / `Ctrl+,`), search for `WrightAI`, and paste the key into **Wright: Api Key**
5. Open any supported file — a **Generate Docs** button will appear above each function

---

## Features

### Generate Docstrings
Click the **Generate Docs** CodeLens button above any function, or press `Cmd+Shift+D` / `Ctrl+Shift+D` with your cursor inside a function.

A **side-by-side diff preview** shows the generated docstring before anything is written — accept or discard with one click.

You can also right-click and choose **Wright: Generate docs for this function** from the context menu, or hover over any function name to see a **Generate docs** link inline.

### Generate Docs for Entire File
Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
```
Wright: Generate docs for entire file
```
WrightAI documents every undocumented function in the file with a live progress bar.

### Gutter Icons
Every function line shows a status icon in the editor gutter:
- **✓** (green) — documented
- **○** (grey) — no documentation yet
- **⚠** (amber) — documentation is out of date

### Chat with Your Codebase
Run **Wright: Chat with codebase** from the Command Palette to open an interactive chat panel. Ask anything about your code:
- "How does authentication work?"
- "Where is the payment logic?"
- "Explain the retry mechanism"

Answers stream in real time, include file citations you can click to jump directly to the source, and suggest follow-up questions. Full conversation history is maintained across turns.

### Coverage Dashboard
The **Wright Coverage** panel in the Explorer sidebar shows live documentation coverage. Run **Wright: Show coverage** to refresh it, or watch the status bar percentage update as you document your code.

### Drift Detection
Run **Wright: Check for doc drift** to find functions whose code has changed since their docstring was written. Stale functions are highlighted with an **⚠ docs outdated** inline marker and a CodeLens button to regenerate in one click.

Drift is also checked automatically on save.

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

- Bug reports and feature requests: [GitHub Issues](https://github.com/surajs1999/WrightAI/issues)
- Questions and feedback: [GitHub Discussions](https://github.com/surajs1999/WrightAI/discussions)
