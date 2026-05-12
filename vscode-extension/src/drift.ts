import * as vscode from "vscode";
import { checkDrift } from "./client";
import { markFunctionDrifted, clearDriftedFunctions } from "./codelens";

let driftDecoration: vscode.TextEditorDecorationType | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

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
 * Initializes and configures the text editor decoration type for displaying documentation drift warnings in the VS Code editor.
 *
 * Creates a text editor decoration that displays a warning indicator (⚠ docs outdated) in italic style next to code elements with outdated documentation, using the editor's warning theme color. The decoration appears both inline and in the overview ruler on the right side of the editor. The decoration is registered with the extension context for proper lifecycle management.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context used to register the decoration for disposal when the extension is deactivated.
 * @returns {void} This function does not return a value.
 * @example
 * initDriftDecoration(context)
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
 * Registers an event listener that triggers a debounced drift check whenever a text document is saved in the workspace.
 *
 * Sets up a VS Code workspace event handler that monitors document save events. When a document is saved, it cancels any pending drift check and schedules a new one after a 500ms delay to avoid excessive checks during rapid consecutive saves. The disposable subscription is added to the extension context for proper cleanup.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context used to register the disposable subscription for lifecycle management.
 * @param {{ refresh(): void }} codeLensProvider - An object with a refresh method that will be passed to the drift check operation to update code lens displays after drift detection.
 * @returns {void} This function does not return a value.
 * @example
 * setupDriftOnSave(context, testCoverageLensProvider)
 */
function setupDriftOnSave(
  context: vscode.ExtensionContext,
  codeLensProvider: { refresh(): void }
): void {
  const disposable = vscode.workspace.onDidSaveTextDocument((doc) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runDriftCheck(doc.uri, codeLensProvider).catch(console.error);
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
 * Runs a drift check for a given file URI, marks drifted functions, applies visual decorations, and refreshes the CodeLens provider.
 *
 * Performs an asynchronous drift analysis on the repository to identify functions whose implementation has diverged from their test coverage. Clears previous drift markers for the specified file, then iterates through drift check results to mark and visually decorate any drifted functions in the active editor. The CodeLens provider is refreshed to reflect updated drift status. Silently catches and ignores errors to gracefully handle cases where the drift check API may not be running.
 *
 * @param {vscode.Uri} uri - The URI of the file to check for drift.
 * @param {{ refresh(): void }} codeLensProvider - The CodeLens provider instance to refresh after drift checking.
 * @returns {Promise<void>} A promise that resolves when the drift check is complete and decorations are applied.
 * @example
 * await runDriftCheck(fileUri, myCodeLensProvider)
 */
export async function runDriftCheck(
  uri: vscode.Uri,
  codeLensProvider: { refresh(): void }
): Promise<void> {
  const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!repoRoot || !driftDecoration) return;

  try {
    const result = await checkDrift(repoRoot);
    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === uri.toString()
    );

    clearDriftedFunctions(uri.toString());
    const decorations: vscode.DecorationOptions[] = [];

    for (const r of result.results) {
      if (r.file_path === uri.fsPath && r.status !== "up_to_date") {
        markFunctionDrifted(uri.toString(), r.function_name);
        if (editor) {
          const lineNum = Math.max(0, (r as unknown as { line?: number }).line ? (r as unknown as { line: number }).line - 1 : 0);
          const line = editor.document.lineAt(Math.min(lineNum, editor.document.lineCount - 1));
          decorations.push({ range: line.range });
        }
      }
    }

    if (editor && driftDecoration) {
      editor.setDecorations(driftDecoration, decorations);
    }

    codeLensProvider.refresh();
  } catch {
    // Drift check failing silently is acceptable — API may not be running
  }
}
