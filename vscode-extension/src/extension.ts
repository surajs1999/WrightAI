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
 * Starts the Wright API server by attempting to connect to a remote server first, then spawning a local Python server if remote connection fails, with a 30-second timeout for local startup.
 *
 * This function implements a fallback strategy for API server initialization. It first checks if a remote API server is available using the default apiUrl. If the remote server is not accessible, it spawns a local Python API server as a child process and waits up to 30 seconds for it to become healthy. Error output from the local server process is logged to the console.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context providing access to the extension's installation path and other extension-specific resources.
 * @returns {Promise<"local" | "remote" | "none">} A promise that resolves to 'remote' if the remote server is available, 'local' if the local server started successfully, or 'none' if both attempts failed.
 * @example
 * const serverStatus = await startApiServer(extensionContext);
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
 * Checks if the Wright API key is configured and prompts the user to set it up if missing.
 *
 * This function verifies whether the Wright API key is present in the VS Code workspace configuration. If the key is not set, it displays an information message with options to either set the API key directly in settings, navigate to the Wright AI dashboard to obtain a new API key, or dismiss the prompt. The function facilitates the onboarding process by guiding users through API key configuration.
 * @returns {Promise<void>} A promise that resolves when the API key check and any user interaction is complete.
 * @example
 * await checkApiKeyOnboarding()
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
    await vscode.env.openExternal(vscode.Uri.parse("https://wrightai-web.fly.dev/dashboard/keys"));
  }
}

/**
 * Updates the VS Code status bar item to display Wright documentation coverage statistics or a default message.
 *
 * Sets the status bar text and tooltip based on whether documentation coverage percentage is provided. When coverage data is available, displays the percentage with one decimal place and a tooltip showing documented/total function counts. Otherwise, displays the default Wright branding.
 *
 * @param {vscode.StatusBarItem} statusBar - The VS Code status bar item to update with text and tooltip.
 * @param {number | null | undefined} pct - The documentation coverage percentage to display. If null or undefined, the status bar shows the default message.
 * @param {number | undefined} documented - The number of documented functions, displayed in the tooltip when pct is provided.
 * @param {number | undefined} total - The total number of functions, displayed in the tooltip when pct is provided.
 * @returns {void} This function does not return a value.
 * @example
 * updateStatusBar(myStatusBar, 85.5, 17, 20)
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
 * Activates the Wright VSCode extension by initializing the API server, registering providers, commands, and setting up workspace watchers.
 *
 * This function serves as the entry point for the Wright extension activation lifecycle. It establishes connection to the API server (local or remote), performs onboarding checks for API keys, registers CodeLens and Hover providers for multiple programming languages, initializes gutter decorations for drift visualization, sets up a coverage tree view with status bar integration, registers all extension commands (generate documentation, check drift, chat), and creates file system watchers to refresh coverage on source file changes.
 *
 * @param {vscode.ExtensionContext} context - The extension context provided by VSCode, used to manage subscriptions, store extension state, and access extension resources.
 * @returns {Promise<void>} A promise that resolves when the extension activation is complete.
 * @throws {Error} When the API server fails to start or connect, though the function handles this gracefully by showing a warning message.
 * @example
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
 * Cleans up and terminates the API process and disposes of the status bar item when the extension is deactivated.
 *
 * This function is called by VS Code when the extension is being deactivated. It ensures proper cleanup by terminating any running API process and disposing of UI elements like the status bar item to prevent resource leaks.
 * @returns {void} This function does not return a value.
 * @example
 * deactivate()
 */
export function deactivate(): void {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = undefined;
  }
  statusBarItem?.dispose();
}
