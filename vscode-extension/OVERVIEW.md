# WrightAI — AI Code Documentation for VS Code

WrightAI brings AI-powered documentation directly into your editor. Generate docstrings, track coverage, detect drift, and chat with your codebase — all without leaving VS Code.

---

## Requirements

WrightAI works as a frontend to a locally running backend server.

**Before using the extension:**

1. Install the Python package:
   ```bash
   pip install wrightai
   ```

2. Add your API keys to `.env` in your project:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   VOYAGE_API_KEY=pa-...
   ```

3. Start the backend server:
   ```bash
   wright-api
   ```

4. Copy your auto-generated API key:
   ```bash
   cat ~/.wright/api.key
   ```

5. Paste it into VS Code settings:
   - Open Settings (`Cmd+,` / `Ctrl+,`)
   - Search for `WrightAI`
   - Set **Wright: Api Key** to the copied value

---

## Features

### Generate Docstrings
Click the **Generate Docs** CodeLens button that appears above any undocumented function. WrightAI will generate a docstring and inject it directly into your file.

You can also right-click anywhere in a file and select **Wright: Generate docs for this function** from the context menu.

### Generate Docs for Entire File
Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
```
Wright: Generate docs for entire file
```
WrightAI will scan and document all undocumented functions in the open file.

### Chat with Your Codebase
Run **Wright: Chat with codebase** from the Command Palette to open an interactive chat panel. Ask questions like:
- "How does authentication work?"
- "Where is the payment logic?"
- "Explain the retry mechanism"

Each answer includes file and line citations so you can jump straight to the code.

### Coverage Dashboard
Run **Wright: Show coverage** to see what percentage of your codebase is documented. The **Wright Coverage** panel in the Explorer sidebar shows a live breakdown by file.

### Drift Detection
Run **Wright: Check for doc drift** to find functions whose code has changed since their docstring was last written. WrightAI highlights stale documentation so you can keep docs in sync with code changes.

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `wright.apiUrl` | `http://localhost:8765` | URL of the local WrightAI backend |
| `wright.apiKey` | _(empty)_ | API key from `~/.wright/api.key` |
| `wright.style` | `google` | Docstring style: `google`, `numpy`, `jsdoc`, `epytext`, `rust` |

---

## Supported Languages

Python, JavaScript, TypeScript, Java, Go, Rust

---

## Coming Soon

- **Inline diff preview** — see the generated docstring before it's written to disk, with accept/reject controls
- **Batch generation** — document an entire folder or workspace in one click
- **Doc quality score** — per-function rating based on completeness and accuracy
- **Auto-fix on save** — optionally generate missing docs when a file is saved
- **Multi-model support** — choose between Claude models directly from VS Code settings
- **Local LLM mode** — run fully offline using Ollama with no API keys required

---

## Support

- Bug reports and feature requests: [GitHub Issues](https://github.com/surajs1999/WrightAI/issues)
- Questions and feedback: [GitHub Discussions](https://github.com/surajs1999/WrightAI/discussions)
