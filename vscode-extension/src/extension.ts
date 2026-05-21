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

/**
 * Starts the Wright API server by first checking for a remote instance, then attempting to spawn a local Python process if no remote is available.
 *
 * Called during extension activation, this function first performs a health check against the default remote API URL. If the remote server is reachable, it immediately returns 'remote'. Otherwise, it spawns a local Python server using `python -m api.main` from the extension's installation directory, then polls the health endpoint every second for up to 30 seconds. If the local server becomes healthy within that window, it returns 'local'. If neither remote nor local server is available after all retries, it returns 'none'.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context, used to resolve the extension's installation path (extensionPath) as the working directory when spawning the local Python server process.
 * @returns {Promise<"local" | "remote" | "none">} Resolves to 'remote' if a remote API server is already reachable, 'local' if a newly spawned local Python server becomes healthy within 30 seconds, or 'none' if no server could be reached.
 * @example
 * // Called inside the activate() function
 * const serverMode = await startApiServer(context);
 * if (serverMode === 'none') {
 *   vscode.window.showErrorMessage('Wright API server could not be started.');
 * }
 */


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

 /**
 * Checks whether an API key is configured and prompts the user to set or obtain one if it is missing.
 *
 * Reads the 'wright.apiKey' configuration value and, if absent, displays an information message offering three options: opening the VS Code settings to set the key directly, navigating to the Wright AI dashboard to obtain a new key, or dismissing the prompt. This function is called during extension activation to ensure onboarding for first-time users.
 * @returns {Promise<void>} A promise that resolves when the onboarding check is complete, either because the API key already exists or the user has responded to (or dismissed) the prompt.
 * @example
 * await checkApiKeyOnboarding(); // Displays onboarding prompt if wright.apiKey is not set
 */


async function checkApiKeyOnboarding(): /**
 * Activates the Wright VS Code extension by initializing the API server connection, registering providers, commands, and setting up file watchers for documentation coverage tracking.
 *
 * This activation function performs the complete initialization sequence for the Wright extension: establishes connection to the API server (local or remote), prompts for API key if missing, registers CodeLens and hover providers for multiple programming languages (Python, JavaScript, TypeScript, Java, Go, Rust), sets up gutter decorations for drift indicators, initializes the coverage tree view, creates status bar items, registers all extension commands (generate documentation, check drift, show coverage, chat), and sets up file system watchers to refresh coverage data when source files change.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context providing access to subscriptions, extension URI, and other extension lifecycle management resources.
 * @returns {Promise<void>} A promise that resolves when all activation tasks are complete.
 * @example
 * await activate(context)
 */
Promise<void> {
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
    await vscode.env.openExternal(vscode.Uri.parse("https://www.wrightai.live/dashboard/keys"));
  }
}

/**
 * Updates the VS Code status bar item to display documentation coverage percentage or a default label.
 *
 * When a valid percentage is provided, the status bar shows the coverage percentage and a tooltip with the documented/total function count. When no percentage is provided (null or undefined), the status bar reverts to a generic 'Wright AI' label and tooltip. This function is called by the activate() lifecycle function to reflect the current documentation scan state.
 *
 * @param {vscode.StatusBarItem} statusBar - The VS Code status bar item instance to update with text and tooltip content.
 * @param {number | null | undefined} pct - The documentation coverage percentage to display (e.g., 87.5). If null or undefined, the status bar reverts to the default idle state.
 * @param {number | undefined} documented - The number of functions that are currently documented, shown in the tooltip when pct is provided.
 * @param {number | undefined} total - The total number of functions detected in the codebase, shown in the tooltip when pct is provided.
 * @returns {void} This function does not return a value; it mutates the provided statusBar item in place.
 * @example
 * // Show coverage state
 * updateStatusBar(statusBarItem, 87.5, 14, 16);
 * 
 * // Reset to default idle state
 * updateStatusBar(statusBarItem, null);
 */

function updateStatusBar(statusBar: vscode.StatusBarItem, pct?: number | null, documented?: number, total?: number): void {
  if (pct !== null && pct !== undefined) {
    statusBar.text = `$(book) Wright: ${pct.toFixed(1)}%`;
    statusBar.tooltip = `Documentation coverage: ${documented}/${total} functions documented`;
  } else {
    statusBar.text = "$(book) Wright";
    statusBar.tooltip = "Wright AI — AI Code Documentation";
  }
}

/**
 * Activates the Wright extension by initializing the API server, registering providers, commands, and setting up file watchers.
 *
 * This function serves as the entry point for the Wright VS Code extension. It establishes connection to the API server (local or remote), performs onboarding checks for API key configuration, registers CodeLens and Hover providers for multiple programming languages, initializes gutter decorations for drift indicators, sets up a coverage tree view, creates a status bar item, registers all extension commands (generate documentation, check drift, chat), and configures file system watchers to refresh coverage on source file changes.
 *
 * @param {vscode.ExtensionContext} context - The extension context provided by VS Code, used to manage subscriptions and store extension state.
 * @returns {Promise<void>} A promise that resolves when the extension activation is complete.
 * @example
 * await activate(context);
 */
 /**
 * Activates the Wright VS Code extension by initializing the API server, registering providers and commands, setting up UI components, and starting file watchers.
 *
 * This is the main entry point for the Wright extension lifecycle. It performs the following steps in order: (1) attempts to start or connect to the API server (local or remote) and reports the connection status in the status bar; (2) runs onboarding to prompt for a missing API key; (3) registers CodeLens and Hover providers for supported languages (Python, JavaScript, TypeScript, Java, Go, Rust); (4) initializes and manages gutter decorations for drifted functions; (5) sets up drift detection on save; (6) creates and populates a documentation coverage tree view; (7) creates a persistent status bar item showing coverage metrics; (8) registers all extension commands including wright.generateCurrent, wright.generateFile, wright.showCoverage, wright.chat, wright.checkDrift, and wright.generateCurrentFromHover; and (9) installs a file system watcher to refresh coverage whenever a source file is added, changed, or deleted. All registered disposables are added to context.subscriptions for proper cleanup on deactivation.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context provided by the runtime, used to register disposables (subscriptions), access the extension URI, and persist state across sessions.
 * @returns {Promise<void>} Resolves when all providers, commands, decorations, and watchers have been successfully registered. Does not return a value.
 * @example
 * // Called automatically by VS Code when the extension activates
 * export { activate };
 * 
 * // Simulated manual call for testing:
 * const context = getMockExtensionContext();
 * await activate(context);
 */


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

/**
 * Cleans up and releases resources when the extension is deactivated.
 *
 * Terminates the API process if it exists by calling kill() and setting it to undefined, then disposes of the status bar item if present. This function is called by VS Code when the extension is being deactivated or unloaded.
 * @returns {void} No value is returned.
 * @example
 * deactivate()
 */
/**
 * Deactivates the VS Code extension by terminating the API process and disposing the status bar item.
 *
 * Called automatically by VS Code when the extension is deactivated. If a background API process is running, it is killed and its reference is cleared. The status bar item, if present, is also disposed to release UI resources.
 * @example
 * // Automatically invoked by VS Code on extension deactivation.
 * // Can also be called manually during testing:
 * deactivate();
 */

export function deactivate(): void {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = undefined;
  }
  statusBarItem?.dispose();
}
