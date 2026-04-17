import * as vscode from "vscode";
import { streamChat } from "./client";

export class ChatPanel {
  static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _repoRoot: string;

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
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, repoRoot);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    repoRoot: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._repoRoot = repoRoot;
    this._panel.webview.html = this.getWebviewContent();

    this._panel.webview.onDidReceiveMessage(async (msg: { type: string; question: string }) => {
      if (msg.type === "question") {
        await this.sendMessage(msg.question);
      }
    });

    this._panel.onDidDispose(() => {
      ChatPanel.currentPanel = undefined;
    });
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wright Chat</title>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; }
    #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .message { border-radius: 8px; padding: 10px 14px; max-width: 85%; }
    .user { background: var(--vscode-button-background); color: var(--vscode-button-foreground); align-self: flex-end; }
    .assistant { background: var(--vscode-editor-inactiveSelectionBackground); align-self: flex-start; }
    .citations { font-size: 0.8em; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    #input-area { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--vscode-panel-border); }
    #input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 8px 12px; font-size: 14px; }
    #send { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 14px; }
    #send:hover { background: var(--vscode-button-hoverBackground); }
    pre { background: var(--vscode-textBlockQuote-background); padding: 8px; border-radius: 4px; overflow-x: auto; }
    code { font-family: var(--vscode-editor-font-family); }
  </style>
</head>
<body>
  <div id="messages">
    <div class="message assistant">Hi! Ask me anything about your codebase.</div>
  </div>
  <div id="input-area">
    <input id="input" type="text" placeholder="Ask about your code..." autocomplete="off" />
    <button id="send">Send</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    const send = document.getElementById('send');
    const messages = document.getElementById('messages');

    function addMessage(role, content) {
      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.textContent = content;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }

    send.addEventListener('click', () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      addMessage('user', q);
      vscode.postMessage({ type: 'question', question: q });
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { send.click(); e.preventDefault(); }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'token') {
        let last = messages.lastElementChild;
        if (!last || !last.classList.contains('assistant')) {
          last = addMessage('assistant', '');
        }
        last.textContent += msg.content;
        messages.scrollTop = messages.scrollHeight;
      } else if (msg.type === 'citations') {
        const div = document.createElement('div');
        div.className = 'citations';
        div.textContent = 'Sources: ' + msg.files.join(', ');
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
      }
    });
  </script>
</body>
</html>`;
  }

  async sendMessage(question: string): Promise<void> {
    try {
      for await (const chunk of streamChat(question, this._repoRoot)) {
        this._panel.webview.postMessage(chunk);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._panel.webview.postMessage({ type: "token", content: `\n[Error: ${msg}]` });
    }
  }
}
