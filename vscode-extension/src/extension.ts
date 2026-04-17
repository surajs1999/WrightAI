import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import { ChatPanel } from "./chat";
import { WrightCodeLensProvider } from "./codelens";
import { CoverageTreeProvider } from "./coverage";
import { initDriftDecoration, setupDriftOnSave, runDriftCheck } from "./drift";
import { generateAndInject } from "./injector";
import { checkHealth } from "./client";

let apiProcess: cp.ChildProcess | undefined;
let statusBarItem: vscode.StatusBarItem;

async function startApiServer(context: vscode.ExtensionContext): Promise<void> {
  const isRunning = await checkHealth();
  if (isRunning) return;

  apiProcess = cp.spawn("python", ["-m", "api.main"], {
    cwd: context.extensionPath,
    env: { ...process.env },
    detached: false,
  });

  apiProcess.stderr?.on("data", (data: Buffer) => {
    console.error("[Wright API]", data.toString());
  });

  // Poll until API is ready (max 30 seconds)
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await checkHealth()) break;
  }
}

async function updateStatusBar(statusBar: vscode.StatusBarItem): Promise<void> {
  const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!repoRoot) return;

  try {
    const { getCoverage } = await import("./client");
    const data = await getCoverage(repoRoot);
    statusBar.text = `$(book) Wright: ${data.overall_pct.toFixed(1)}%`;
    statusBar.tooltip = `Documentation coverage: ${data.documented}/${data.total} functions`;
  } catch {
    statusBar.text = "$(book) Wright";
    statusBar.tooltip = "Wright: API not running";
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Start the Wright API server
  await startApiServer(context);

  // 2. Register CodeLens provider
  const codeLensProvider = new WrightCodeLensProvider();
  const codeLensSupportedLangs = ["python", "javascript", "typescript", "java", "go", "rust"];
  for (const lang of codeLensSupportedLangs) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ language: lang }, codeLensProvider)
    );
  }

  // 3. Register drift decorations
  initDriftDecoration(context);
  setupDriftOnSave(context, codeLensProvider);

  // 4. Register coverage tree view
  const coverageProvider = new CoverageTreeProvider();
  vscode.window.registerTreeDataProvider("wrightCoverage", coverageProvider);
  coverageProvider.loadCoverage().catch(console.error);

  // 5. Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "wright.showCoverage";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  updateStatusBar(statusBarItem).catch(console.error);

  // 6. Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "wright.generateCurrent",
      async (uri?: vscode.Uri, functionName?: string) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("Wright: No active editor.");
          return;
        }
        const doc = editor.document;
        const name = functionName ?? await vscode.window.showInputBox({ prompt: "Function name to document" });
        if (!name) return;
        await generateAndInject(doc, name);
      }
    ),

    vscode.commands.registerCommand("wright.generateFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) return;
      const { generateDocstring } = await import("./client");
      const result = await generateDocstring(editor.document.uri.fsPath, "", repoRoot, false, true);
      if (result.job_id) {
        vscode.window.showInformationMessage(`Wright: Batch job started: ${result.job_id}`);
      }
    }),

    vscode.commands.registerCommand("wright.showCoverage", async () => {
      await coverageProvider.loadCoverage();
      vscode.window.showInformationMessage("Wright: Coverage data refreshed.");
      updateStatusBar(statusBarItem).catch(console.error);
    }),

    vscode.commands.registerCommand("wright.chat", () => {
      ChatPanel.createOrShow(context.extensionUri);
    }),

    vscode.commands.registerCommand("wright.checkDrift", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await runDriftCheck(editor.document.uri, codeLensProvider);
      vscode.window.showInformationMessage("Wright: Drift check complete.");
    })
  );

  // 7. File watcher for drift checking
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.{py,js,ts,java,go,rs}");
  watcher.onDidChange(async (uri) => {
    await runDriftCheck(uri, codeLensProvider);
    updateStatusBar(statusBarItem).catch(console.error);
  });
  context.subscriptions.push(watcher);
}

export function deactivate(): void {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = undefined;
  }
  statusBarItem?.dispose();
}

// Extend the generateDocstring import to support batch mode
declare module "./client" {
  function generateDocstring(
    filePath: string,
    functionName: string,
    repoRoot: string,
    dryRun?: boolean,
    batch?: boolean
  ): Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null; job_id?: string }>;
}
