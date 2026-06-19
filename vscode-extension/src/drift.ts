import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { findWrightCli, runCli, getRepoName } from "./coverage";
import { markFunctionDrifted, clearDriftedFunctions } from "./codelens";
import { syncDriftResults } from "./client";

let driftDecoration: vscode.TextEditorDecorationType | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let hasWarnedBadApiKey = false;

// Tracks the content hash of the last successfully drift-checked version of each file.
// Key: document URI string. Skips the API call if content hasn't changed since last check.
const _lastCheckedHash = new Map<string, string>();

function _contentHash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = Math.imul(31, h) + content.charCodeAt(i) | 0;
  }
  return h.toString(36);
}

/**
 * Initializes and registers a text editor decoration type for indicating outdated documentation drift.
 *
 * @param context - The VS Code extension context used to register the decoration for proper disposal.
 */
/**
 * Initializes and registers a text editor decoration type for displaying documentation drift warnings.
 *
 * Creates a decoration type that displays a warning indicator ("⚠ docs outdated") in the editor's overview ruler and inline after affected code. The decoration uses the editor's warning theme color and italic styling. The decoration is registered with the extension context for proper lifecycle management.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context used to register the decoration for automatic disposal when the extension deactivates.
 * @returns {void} This function does not return a value.
 * @example
 * initDriftDecoration(context);
 */
/**
 * Initializes and registers the drift decoration type used to visually mark outdated documentation in the editor.
 *
 * Creates a VS Code text editor decoration that renders a warning indicator ('⚠ docs outdated') in italic after affected code symbols, and also marks them in the overview ruler using the editor warning foreground color. The decoration is registered with the extension context's subscriptions to ensure it is disposed of automatically when the extension is deactivated.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context used to register the decoration for automatic disposal via context.subscriptions.
 * @returns {void} Does not return a value; sets the module-level driftDecoration variable as a side effect.
 * @example
 * // Called during extension activation
 * export function activate(context: vscode.ExtensionContext): void {
 *   initDriftDecoration(context);
 * }
 */


export function initDriftDecoration(context: vscode.ExtensionContext): void {
  driftDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: new vscode.ThemeColor("editorWarning.foreground"),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    after: {
      contentText: " ⚠ docs outdated",
      color: new vscode.ThemeColor("editorWarning.foreground"),
      fontStyle: "italic",
    },
  });
  context.subscriptions.push(driftDecoration);
}

export /**
 * Sets up a file save listener that triggers a debounced drift check whenever a text document is saved.
 *
 * Registers a workspace event listener that monitors document save events. When a document is saved, it debounces the drift check execution by 500ms to avoid excessive checks during rapid successive saves. The disposable subscription is added to the extension context to ensure proper cleanup.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context used to register disposable subscriptions for proper lifecycle management.
 * @param {{ refresh(): void }} codeLensProvider - The code lens provider object with a refresh method that will be passed to the drift check to update the UI after checks complete.
 * @returns {void} This function does not return a value.
 * @example
 * setupDriftOnSave(context, wrightCodeLensProvider)
 */
 /**
 * Registers a debounced on-save listener that triggers a drift check whenever a text document is saved in the workspace.
 *
 * Sets up a VS Code workspace event listener via `onDidSaveTextDocument` that debounces rapid consecutive saves with a 500 ms delay before invoking `runDriftCheck` on the saved document's URI. The resulting disposable is pushed onto the extension context's subscriptions to ensure proper cleanup on extension deactivation.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context used to register the disposable listener for automatic cleanup on deactivation.
 * @param {{ refresh(): void }} codeLensProvider - An object with a refresh method that is passed to runDriftCheck so code lenses can be updated after the drift check completes.
 * @returns {void} Does not return a value; the side effect is a registered and managed on-save event listener.
 * @example
 * // Called during extension activation
 * setupDriftOnSave(context, myCodeLensProvider);
 * // Now every file save triggers a debounced drift check after 500 ms
 */


function setupDriftOnSave(
  context: vscode.ExtensionContext,
  codeLensProvider: { refresh(): void },
  onDriftChecked?: () => void,
): void {
  const disposable = vscode.workspace.onDidSaveTextDocument((doc) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const uriStr = doc.uri.toString();
      const hash = _contentHash(doc.getText());
      if (_lastCheckedHash.get(uriStr) === hash) return; // content unchanged — skip API call
      const success = await runDriftCheck(doc.uri, codeLensProvider);
      if (success) {
        _lastCheckedHash.set(uriStr, hash); // only store hash if API responded successfully
        onDriftChecked?.();
      }
    }, 500);
  });
  context.subscriptions.push(disposable);
}

/**
 * Checks for drifted test functions in a file and applies visual decorations to mark outdated functions in the editor.
 *
 * Performs a drift check against the repository root to identify test functions that are out of sync with their implementation. For any drifted functions found in the specified file, it marks them internally, applies visual decorations to highlight the affected lines in the editor, and refreshes the code lens provider to update UI indicators. Failures in drift checking are silently ignored as the API may not be available.
 *
 * @param {vscode.Uri} uri - The URI of the file to check for drift.
 * @param {{ refresh(): void }} codeLensProvider - The code lens provider instance whose refresh method will be called to update UI indicators after drift check.
 * @returns {Promise<void>} A promise that resolves when the drift check and decoration application is complete.
 * @example
 * await runDriftCheck(document.uri, myCodeLensProvider)
 */
 /**
 * Runs a drift check for the given file URI, applies editor decorations to drifted functions, and refreshes the CodeLens provider.
 *
 * Resolves the workspace root and invokes the drift detection API via `checkDrift`. For the specified file, it clears any previously recorded drifted functions, then iterates over the drift results to mark functions whose status is not 'up_to_date'. If the file is currently open in a visible editor, gutter decorations are applied to the affected lines. Finally, the CodeLens provider is refreshed to reflect updated drift state. All errors are swallowed silently, as the backend API may not be available.
 *
 * @param {vscode.Uri} uri - The URI of the source file to check for drift; used to match results from the drift API and to locate the corresponding visible text editor.
 * @param {{ refresh(): void }} codeLensProvider - An object exposing a `refresh` method that is called after drift results are processed to trigger a re-render of CodeLens items in the editor.
 * @returns {Promise<void>} Resolves with no value once the drift check, decorations, and CodeLens refresh are complete, or resolves immediately if the workspace root or drift decoration is unavailable.
 * @example
 * // Called on file save or extension activation
 * await runDriftCheck(
 *   vscode.Uri.file('/workspace/src/utils.ts'),
 *   myCodeLensProvider
 * );
 */


export async function runDriftCheck(
  uri: vscode.Uri,
  codeLensProvider: { refresh(): void }
): Promise<boolean> {
  if (!driftDecoration) return false;

  const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!repoRoot) return false;

  const cli = findWrightCli(repoRoot);
  if (!cli) return false;

  const tmpOut = path.join(os.tmpdir(), `wright-drift-file-${Date.now()}.json`);

  try {
    // Pass --file so the CLI scans only the saved file, not the whole repo.
    // The full repo scan still happens via refreshCoverage() on file-watcher events.
    const out = await runCli(cli, repoRoot, ["drift", repoRoot, "--file", uri.fsPath], tmpOut, true);
    if (!out) return false;

    const data = JSON.parse(fs.readFileSync(out, "utf8")) as {
      results: Array<{ function_name: string; file_path?: string; status: string; reason?: string | null; line: number | null; src_hash?: string | null; doc_hash?: string | null }>;
    };
    try { fs.unlinkSync(out); } catch { /* ignore */ }

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === uri.toString()
    );

    clearDriftedFunctions(uri.toString());
    const decorations: vscode.DecorationOptions[] = [];

    for (const r of data.results) {
      if (r.status !== "up_to_date") {
        markFunctionDrifted(uri.toString(), r.function_name);
        if (editor) {
          const lineNum = Math.max(0, r.line ? r.line - 1 : 0);
          const line = editor.document.lineAt(Math.min(lineNum, editor.document.lineCount - 1));
          decorations.push({ range: line.range });
        }
      }
    }

    // Push results to drift_results so the dashboard sees them without a second LLM pass
    const repoName = getRepoName(repoRoot);
    if (repoName) {
      const cfg = vscode.workspace.getConfiguration("wright");
      const apiUrl = cfg.get<string>("apiUrl", "https://api.wrightai.live");
      const apiKey = cfg.get<string>("apiKey", "");
      const relPath = path.relative(repoRoot, uri.fsPath);
      syncDriftResults(apiUrl, apiKey, repoName, data.results.map(r => ({
        file_path: relPath,
        func_name: r.function_name,
        status: r.status,
        reason: r.reason ?? undefined,
        src_hash: r.src_hash ?? undefined,
        doc_hash: r.doc_hash ?? undefined,
      }))).then((result) => {
        if (result !== "auth_failed" || hasWarnedBadApiKey) return;
        hasWarnedBadApiKey = true;
        vscode.window
          .showWarningMessage(
            "Wright: Your API key isn't linked to a dashboard account, so drift results won't sync. Check the wright.apiKey setting.",
            "Open Settings"
          )
          .then((choice) => {
            if (choice === "Open Settings") {
              vscode.commands.executeCommand("workbench.action.openSettings", "wright.apiKey");
            }
          });
      });
    }

    if (editor && driftDecoration) {
      editor.setDecorations(driftDecoration, decorations);
    }

    codeLensProvider.refresh();
    return true;
  } catch (err) {
    console.error("[Wright drift] check failed:", err);
    return false;
  }
}
