# WrightAI — AI Code Documentation for VS Code

WrightAI brings AI-powered documentation directly into your editor. Generate docstrings, track coverage, detect drift, and chat with your codebase — all without leaving VS Code.

No local server or Python installation required — the backend is fully hosted.

---

## Getting Started

1. Install this extension from the VS Code Marketplace
2. Sign in at the [WrightAI dashboard](https://wrightai-web-jroejkhf4q-as.a.run.app) with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings (`Cmd+,` / `Ctrl+,`), search for `WrightAI`, and paste the key into **Wright: Api Key**
5. Open any supported file — a **Generate Docs** CodeLens button appears above each function

---

## Features

### Generate Docstrings
Click the **Generate Docs** CodeLens button above any function, or press `Cmd+Shift+D` / `Ctrl+Shift+D` with your cursor inside a function.

A **side-by-side diff preview** shows the generated docstring before anything is written — accept or discard with one click. Accepting applies the docstring directly to your file and saves it, automatically refreshing the coverage panel.

You can also:
- Right-click anywhere in a file → **Wright: Generate docs for this function**
- Hover over any function name to see the existing docstring and a **Regenerate** link inline

### Generate Docs for an Entire File
Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
```
Wright: Generate docs for entire file
```
Wright documents every undocumented function in the file with a live progress bar showing per-function status.

### Gutter Icons
Every function line shows a real-time status icon in the editor gutter:
- **✓** (green) — documented and up to date
- **○** (grey) — no documentation yet
- **⚠** (amber) — documentation has drifted (signature changed since docs were written)

Hover over a gutter icon to see the function name and a quick-action link.

### Coverage Panel
The **Wright Coverage** panel in the Explorer sidebar shows live documentation metrics:
- Overall coverage percentage
- Documented / total function counts
- **Undocumented** count
- **Drifted** count — functions whose docs are out of sync with the current code

The panel runs `wright coverage` and `wright drift` via the local CLI, so results use the SQLite cache and incur no extra token cost for functions already checked.

The panel refreshes automatically every time you save a file or accept a docstring injection.

Run **Wright: Show coverage** from the Command Palette to refresh it manually.

### Drift Detection
Wright detects two kinds of drift:
- **Structural drift** — parameter names added, removed, or renamed; return type changes between concrete types (e.g. `str → dict`)
- **Semantic drift** — the function body changes in a way that makes the docstring factually wrong, even if the signature hasn't changed (detected by an LLM)

Results are cached locally in SQLite so repeated saves for unchanged functions cost zero tokens.

Run **Wright: Check for doc drift** to scan the current file. Stale functions are highlighted with an **⚠ Docs outdated — regenerate** CodeLens.

Drift is also checked automatically every time you save a file.

### Chat with Your Codebase
Run **Wright: Chat with codebase** from the Command Palette to open an interactive chat panel. Ask anything:
- "How does authentication work?"
- "Where is the payment logic?"
- "What does the `process_batch` function do?"

Answers stream in real time, include **clickable file:line citations** that jump straight to the source, and suggest follow-up questions. Full conversation history is maintained across turns.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+D` / `Ctrl+Shift+D` | Generate docs for the current function |

---

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `wright.apiUrl` | `https://wrightai-api-jroejkhf4q-as.a.run.app` | WrightAI backend URL |
| `wright.apiKey` | _(empty)_ | Your personal `wai_` API key |
| `wright.style` | `google` | Default docstring style |
| `wright.style.python` | `google` | Python style: `google`, `numpy`, `epytext` |
| `wright.style.javascript` | `jsdoc` | JavaScript style: `jsdoc` |
| `wright.style.typescript` | `jsdoc` | TypeScript style: `jsdoc` |
| `wright.style.rust` | `rust` | Rust style: `rust` |

> **Note:** JavaScript, TypeScript, and Java always use JSDoc. Go always uses `//` line comments. Rust always uses `///` doc comments. The style setting only applies to Python.

---

## Supported Languages

Python · JavaScript · TypeScript · Java · Go · Rust

---

## Support

- Bug reports and feature requests: [GitHub Issues](https://github.com/surajs1999/WrightAI/issues)
- Questions and feedback: [GitHub Discussions](https://github.com/surajs1999/WrightAI/discussions)

---

## License

This extension is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-or-later). See the bundled [LICENSE](LICENSE) file for the full text.

For commercial/enterprise use without AGPL obligations, contact surajsahoo19991012@gmail.com.
