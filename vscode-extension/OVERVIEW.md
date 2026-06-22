# WrightAI — AI Code Documentation for VS Code

WrightAI brings AI-powered documentation directly into your editor. Generate docstrings, track coverage, detect drift, and chat with your codebase — all without leaving VS Code.

No local server or Python installation required — the backend is fully hosted.

---

## Getting Started

1. Install this extension from the VS Code Marketplace
2. Sign in at the [WrightAI dashboard](https://wrightai-web-jroejkhf4q-as.a.run.app) with GitHub or Google
3. Copy your personal API key (starts with `wai_`)
4. Open VS Code Settings (`Cmd+,` / `Ctrl+,`), search for `WrightAI`, and paste the key into **Wright: Api Key**
5. Open any supported file — a **Generate Docs** button will appear above each function

---

## Features

### Generate Docstrings
Click the **Generate Docs** CodeLens button above any function, or press `Cmd+Shift+D` / `Ctrl+Shift+D` with your cursor inside a function.

A **side-by-side diff preview** shows the generated docstring before anything is written — accept or discard with one click. Accepting applies the change directly to your file and auto-refreshes the coverage panel.

You can also right-click and choose **Wright: Generate docs for this function** from the context menu, or hover over any function name to see a **Regenerate** link inline.

### Generate Docs for Entire File
Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
```
Wright: Generate docs for entire file
```
WrightAI documents every undocumented function in the file with a live progress bar.

### Gutter Icons
Every function line shows a status icon in the editor gutter:
- **✓** (green) — documented and up to date
- **○** (grey) — no documentation yet
- **⚠** (amber) — documentation has drifted (signature changed since docs were written)

### Coverage Panel
The **Wright Coverage** panel in the Explorer sidebar shows live documentation metrics — coverage %, documented count, undocumented count, and drifted count. Refreshes automatically on every file save or docstring injection.

### Drift Detection
Wright flags drift when parameter names change or return type changes between concrete types (e.g. `str → dict`). Stale functions are highlighted with an **⚠ Docs outdated** CodeLens. Drift is also checked automatically on every save.

### Chat with Your Codebase
Run **Wright: Chat with codebase** from the Command Palette to open an interactive chat panel. Answers stream in real time with clickable file:line citations.

---

## Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Cmd+Shift+D` / `Ctrl+Shift+D` | Generate docs for the current function |

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `wright.apiUrl` | `https://wrightai-api-jroejkhf4q-as.a.run.app` | WrightAI backend URL |
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

## Support

- Bug reports and feature requests: [GitHub Issues](https://github.com/surajs1999/WrightAI/issues)
- Questions and feedback: [GitHub Discussions](https://github.com/surajs1999/WrightAI/discussions)

---

## License

This extension is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-or-later). See the bundled [LICENSE](LICENSE) file for the full text.

For commercial/enterprise use without AGPL obligations, contact hello@wrightai.live.
