import * as vscode from "vscode";
import * as cp from "child_process";
import { ChatPanel } from "./chat";
import { WrightCodeLensProvider } from "./codelens";
import { CoverageTreeProvider } from "./coverage";
import { initDriftDecoration, setupDriftOnSave, runDriftCheck } from "./drift";
import { generateAndInject } from "./injector";
import { checkHealth, generateDocstring } from "./client";
import { WrightHoverProvider } from "./hover";
import { initGutterDecorations, updateGutterDecorations } from "./gutter";
import { DRIFTED_FUNCTIONS } from "./codelens";

let apiProcess: cp.ChildProcess | undefined;
let statusBarItem: vscode.StatusBarItem;

async function startApiServer(context: vscode.ExtensionContext): Promise<"local" | "remote" | "none"> {
  // Try remote first (default apiUrl)
  if (await checkHealth()) return "remote";

  // Try to spawn local server
  apiProcess = cp.spawn("python", ["-m", "api.main"], {
    cwd: context.extensionPath,
    env: { ...process.env },
    detached: false,
  });

  apiProcess.stderr?.on("data", (data: Buffer) => {
    console.error("[Wright API]", data.toString());
  });

  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await checkHealth()) return "local";
  }

  return "none";
}

async function checkApiKeyOnboarding(): Promise<void> {
  const key = vscode.workspace.getConfiguration("wright").get<string>("apiKey", "");
  if (key) return;

  const choice = await vscode.window.showInformationMessage(
    "Wright AI: Set your API key to start generating documentation.",
    "Set API Key",
    "Get API Key",
    "Dismiss"
  );

  if (choice === "Set API Key") {
    await vscode.commands.executeCommand("workbench.action.openSettings", "wright.apiKey");
  } else if (choice === "Get API Key") {
    await vscode.env.openExternal(vscode.Uri.parse("https://wrightai-web.fly.dev/dashboard/keys"));
  }
}

function updateStatusBar(statusBar: vscode.StatusBarItem, pct?: number | null, documented?: number, total?: number): void {
  if (pct !== null && pct !== undefined) {
    statusBar.text = `$(book) Wright: ${pct.toFixed(1)}%`;
    statusBar.tooltip = `Documentation coverage: ${documented}/${total} functions documented`;
  } else {
    statusBar.text = "$(book) Wright";
    statusBar.tooltip = "Wright AI — AI Code Documentation";
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Start/connect to API server and report status
  const serverStatus = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: "Wright: Connecting…" },
    () => startApiServer(context)
  );

  if (serverStatus === "local") {
    vscode.window.setStatusBarMessage("$(check) Wright: Ready", 4000);
  } else if (serverStatus === "remote") {
    vscode.window.setStatusBarMessage("$(cloud) Wright: Connected", 4000);
  } else {
    vscode.window.showWarningMessage(
      "Wright: Could not connect. Check your internet connection or API key in Settings.",
      "Open Settings"
    ).then(choice => {
      if (choice === "Open Settings") {
        vscode.commands.executeCommand("workbench.action.openSettings", "wright.apiKey");
      }
    });
  }

  // 2. Onboarding — prompt for API key if missing
  await checkApiKeyOnboarding();

  // 3. Register CodeLens provider
  const codeLensProvider = new WrightCodeLensProvider();
  const supportedLangs = ["python", "javascript", "typescript", "java", "go", "rust"];
  for (const lang of supportedLangs) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ language: lang }, codeLensProvider)
    );
  }

  // 3b. Hover provider
  const hoverProvider = new WrightHoverProvider();
  for (const lang of supportedLangs) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider({ language: lang }, hoverProvider)
    );
  }

  // 3c. Gutter icons
  initGutterDecorations();
  const refreshGutter = (editor: vscode.TextEditor) => {
    const drifted = DRIFTED_FUNCTIONS.get(editor.document.uri.toString()) ?? new Set<string>();
    updateGutterDecorations(editor, drifted);
  };
  if (vscode.window.activeTextEditor) refreshGutter(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(e => { if (e) refreshGutter(e); }),
    vscode.workspace.onDidSaveTextDocument(doc => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === doc);
      if (editor) refreshGutter(editor);
    }),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.visibleTextEditors.find(ed => ed.document === e.document);
      if (editor) refreshGutter(editor);
    })
  );

  // 4. Register drift decorations
  initDriftDecoration(context);
  setupDriftOnSave(context, codeLensProvider);

  // 5. Coverage tree view — local scan, no backend needed
  const coverageProvider = new CoverageTreeProvider();
  vscode.window.registerTreeDataProvider("wrightCoverage", coverageProvider);
  const refreshCoverage = () =>
    coverageProvider.loadCoverage().then(() =>
      updateStatusBar(statusBarItem, coverageProvider.overallPct, coverageProvider.documented, coverageProvider.total)
    ).catch(console.error);
  refreshCoverage();

  // 6. Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  updateStatusBar(statusBarItem);

  // 7. Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "wright.generateCurrent",
      async (_uri?: vscode.Uri, functionName?: string) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("Wright: No active editor.");
          return;
        }
        const name = functionName ?? await vscode.window.showInputBox({ prompt: "Function name to document" });
        if (!name) return;
        await generateAndInject(editor.document, name, context);
        refreshGutter(editor);
      }
    ),

    vscode.commands.registerCommand("wright.generateFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) return;

      const filePath = editor.document.uri.fsPath;
      const languageId = editor.document.languageId;

      // Collect function names from the file via CodeLens provider
      const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
        "vscode.executeCodeLensProvider", editor.document.uri
      ) ?? [];
      const functionNames = lenses
        .map(l => (l.command?.arguments?.[1] as string | undefined))
        .filter((n): n is string => !!n);

      if (functionNames.length === 0) {
        vscode.window.showInformationMessage("Wright: No functions found in this file.");
        return;
      }

      let documented = 0;
      let failed = 0;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Wright: Documenting ${functionNames.length} function(s)…`,
          cancellable: true,
        },
        async (progress, token) => {
          for (let i = 0; i < functionNames.length; i++) {
            if (token.isCancellationRequested) break;
            const name = functionNames[i];
            progress.report({
              message: `${name} (${i + 1}/${functionNames.length})`,
              increment: (1 / functionNames.length) * 100,
            });
            try {
              const result = await generateDocstring(filePath, name, repoRoot, false, languageId, editor.document.getText());
              if (result.success) documented++;
              else failed++;
            } catch {
              failed++;
            }
          }
        }
      );

      const msg = failed === 0
        ? `Wright: Done — ${documented} function${documented !== 1 ? "s" : ""} documented.`
        : `Wright: Done — ${documented} documented, ${failed} could not be processed.`;
      vscode.window.showInformationMessage(msg);
    }),

    vscode.commands.registerCommand("wright.showCoverage", async () => {
      await coverageProvider.loadCoverage();
      vscode.window.showInformationMessage("Wright: Coverage refreshed.");
    }),

    vscode.commands.registerCommand("wright.chat", () => {
      ChatPanel.createOrShow(context.extensionUri);
    }),

    vscode.commands.registerCommand("wright.checkDrift", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await runDriftCheck(editor.document.uri, codeLensProvider);
      refreshGutter(editor);
      vscode.window.showInformationMessage("Wright: Drift check complete.");
    }),

    // Separate command for hover links — receives fsPath string instead of Uri
    vscode.commands.registerCommand("wright.generateCurrentFromHover", async (fsPath: string, functionName: string) => {
      const uri = vscode.Uri.file(fsPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      await generateAndInject(editor.document, functionName, context);
      refreshGutter(editor);
    })
  );

  // 8. File watcher — refresh coverage after any source file is saved
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.{py,js,ts,java,go,rs}");
  watcher.onDidChange(() => refreshCoverage());
  watcher.onDidCreate(() => refreshCoverage());
  watcher.onDidDelete(() => refreshCoverage());
  context.subscriptions.push(watcher);
}

export function deactivate(): void {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = undefined;
  }
  statusBarItem?.dispose();
}
