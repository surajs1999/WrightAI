import * as vscode from "vscode";
import * as path from "path";
import { streamChat } from "./client";

interface HistoryMessage { role: "user" | "assistant"; content: string; }

export class ChatPanel {
  static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _repoRoot: string;
  private _history: HistoryMessage[] = [];

  static createOrShow(extensionUri: vscode.Uri): void {
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? ".";
    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "wrightChat",
      "Wright: Codebase Chat",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, repoRoot);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, repoRoot: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._repoRoot = repoRoot;
    this._panel.webview.html = this._getHtml();

    this._panel.webview.onDidReceiveMessage(async (msg: { type: string; question?: string; file?: string; followup?: string }) => {
      if (msg.type === "question" && msg.question) {
        await this._sendMessage(msg.question);
      } else if (msg.type === "openFile" && msg.file) {
        await this._openFile(msg.file);
      } else if (msg.type === "followup" && msg.followup) {
        await this._sendMessage(msg.followup);
      }
    });

    this._panel.onDidDispose(() => { ChatPanel.currentPanel = undefined; });
  }

  private async _openFile(filePath: string): Promise<void> {
    // filePath may be "src/foo.py:42" — split off line number
    const [fp, lineStr] = filePath.split(":");
    const line = lineStr ? Math.max(0, parseInt(lineStr, 10) - 1) : 0;

    const candidates = [
      vscode.Uri.file(fp),
      vscode.Uri.file(path.join(this._repoRoot, fp)),
    ];

    for (const uri of candidates) {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        const pos = new vscode.Position(Math.min(line, doc.lineCount - 1), 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        return;
      } catch { /* try next */ }
    }
    vscode.window.showWarningMessage(`Wright: Could not open file: ${fp}`);
  }

  private async _sendMessage(question: string): Promise<void> {
    // Capture history BEFORE pushing current question — backend appends it as the final user turn
    const historyToSend = this._history.slice(-20);
    this._history.push({ role: "user", content: question });
    this._panel.webview.postMessage({ type: "userMessage", content: question });

    let fullAnswer = "";
    try {
      for await (const chunk of streamChat(question, this._repoRoot, historyToSend)) {
        if (chunk.type === "token" && chunk.content) {
          fullAnswer += chunk.content;
          this._panel.webview.postMessage({ type: "token", content: chunk.content });
        } else if (chunk.type === "citations") {
          this._panel.webview.postMessage({ type: "citations", files: chunk.files ?? [] });
        } else if (chunk.type === "followups") {
          this._panel.webview.postMessage({ type: "followups", questions: chunk.questions ?? [] });
        }
      }
      this._history.push({ role: "assistant", content: fullAnswer });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._panel.webview.postMessage({ type: "token", content: `\n[Error: ${msg}]` });
    }
    this._panel.webview.postMessage({ type: "done" });
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wright Chat</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; font-size: 13px; }
    #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .msg-row { display: flex; }
    .msg-row.user { justify-content: flex-end; }
    .msg-row.assistant { justify-content: flex-start; }
    .bubble { border-radius: 10px; padding: 10px 14px; max-width: 85%; line-height: 1.55; }
    .bubble.user { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 10px 10px 2px 10px; }
    .bubble.assistant { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 10px 10px 10px 2px; }
    .citations { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
    .citation { font-size: 11px; padding: 2px 7px; border-radius: 4px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); cursor: pointer; font-family: var(--vscode-editor-font-family); text-decoration: none; border: none; }
    .citation:hover { opacity: 0.8; }
    .followups { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .followup-btn { font-size: 12px; padding: 4px 10px; border-radius: 14px; background: transparent; border: 1px solid var(--vscode-button-secondaryBackground, #555); color: var(--vscode-descriptionForeground); cursor: pointer; font-family: var(--vscode-font-family); }
    .followup-btn:hover { border-color: var(--vscode-button-background); color: var(--vscode-editor-foreground); }
    pre { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; overflow-x: auto; margin: 6px 0; font-size: 12px; }
    code { font-family: var(--vscode-editor-font-family); font-size: 12px; }
    .inline-code { background: var(--vscode-textBlockQuote-background); padding: 1px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family); }
    .cursor { display: inline-block; width: 7px; height: 13px; background: var(--vscode-editor-foreground); opacity: 0.7; margin-left: 2px; vertical-align: middle; animation: blink 1s step-end infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    #input-area { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--vscode-panel-border); }
    #input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #555); border-radius: 4px; padding: 7px 10px; font-size: 13px; font-family: var(--vscode-font-family); resize: none; }
    #send { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 7px 14px; cursor: pointer; font-size: 13px; }
    #send:disabled { opacity: 0.5; cursor: default; }
    #send:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <div id="messages">
    <div class="msg-row assistant"><div class="bubble assistant">Hi! Ask me anything about your codebase.</div></div>
  </div>
  <div id="input-area">
    <textarea id="input" rows="2" placeholder="Ask about your code…" autocomplete="off"></textarea>
    <button id="send">Send</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const messages = document.getElementById('messages');
    let streaming = false;
    let currentBubble = null;
    let cursorEl = null;

    function scrollBottom() { messages.scrollTop = messages.scrollHeight; }

    function renderContent(text) {
      // Convert code blocks and inline code to HTML
      const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return escaped
        .replace(/\`\`\`(\\w*)?\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) =>
          \`<pre><code>\${code.trimEnd()}</code></pre>\`)
        .replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>')
        .replace(/\\n/g, '<br>');
    }

    function addUserMessage(text) {
      const row = document.createElement('div');
      row.className = 'msg-row user';
      const bubble = document.createElement('div');
      bubble.className = 'bubble user';
      bubble.textContent = text;
      row.appendChild(bubble);
      messages.appendChild(row);
      scrollBottom();
    }

    function startAssistantMessage() {
      const row = document.createElement('div');
      row.className = 'msg-row assistant';
      row.id = 'streaming-row';
      currentBubble = document.createElement('div');
      currentBubble.className = 'bubble assistant';
      currentBubble._raw = '';
      cursorEl = document.createElement('span');
      cursorEl.className = 'cursor';
      currentBubble.appendChild(cursorEl);
      row.appendChild(currentBubble);
      messages.appendChild(row);
      scrollBottom();
    }

    function appendToken(text) {
      if (!currentBubble) startAssistantMessage();
      currentBubble._raw += text;
      currentBubble.innerHTML = renderContent(currentBubble._raw) + '<span class="cursor"></span>';
      scrollBottom();
    }

    function finishStreaming() {
      if (currentBubble) {
        currentBubble.innerHTML = renderContent(currentBubble._raw);
      }
      currentBubble = null;
      cursorEl = null;
    }

    function addCitations(files) {
      if (!files || files.length === 0) return;
      const row = document.getElementById('streaming-row') || messages.lastElementChild;
      const bubble = row?.querySelector('.bubble.assistant');
      if (!bubble) return;
      const div = document.createElement('div');
      div.className = 'citations';
      files.forEach(f => {
        const btn = document.createElement('button');
        btn.className = 'citation';
        btn.textContent = f.split('/').slice(-2).join('/');
        btn.title = f;
        btn.onclick = () => vscode.postMessage({ type: 'openFile', file: f });
        div.appendChild(btn);
      });
      bubble.appendChild(div);
      scrollBottom();
    }

    function addFollowups(questions) {
      if (!questions || questions.length === 0) return;
      const row = document.getElementById('streaming-row') || messages.lastElementChild;
      if (row) row.removeAttribute('id');
      const bubble = row?.querySelector('.bubble.assistant');
      if (!bubble) return;
      const div = document.createElement('div');
      div.className = 'followups';
      questions.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'followup-btn';
        btn.textContent = q;
        btn.onclick = () => {
          if (streaming) return;
          streaming = true;
          sendBtn.disabled = true;
          addUserMessage(q);
          startAssistantMessage();
          vscode.postMessage({ type: 'followup', followup: q });
        };
        div.appendChild(btn);
      });
      bubble.appendChild(div);
      scrollBottom();
    }

    sendBtn.addEventListener('click', () => {
      const q = input.value.trim();
      if (!q || streaming) return;
      input.value = '';
      streaming = true;
      sendBtn.disabled = true;
      addUserMessage(q);
      startAssistantMessage();
      vscode.postMessage({ type: 'question', question: q });
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'userMessage') {
        // userMessage from TypeScript side is only needed if not already added (e.g. direct API call — no-op here since followup path now adds it optimistically
      } else if (msg.type === 'token') {
        appendToken(msg.content);
      } else if (msg.type === 'citations') {
        addCitations(msg.files);
      } else if (msg.type === 'followups') {
        addFollowups(msg.questions);
      } else if (msg.type === 'done') {
        finishStreaming();
        streaming = false;
        sendBtn.disabled = false;
        input.focus();
      }
    });
  </script>
</body>
</html>`;
  }
}
