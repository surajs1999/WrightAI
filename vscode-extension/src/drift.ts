import * as vscode from "vscode";
import { checkDrift } from "./client";
import { markFunctionDrifted, clearDriftedFunctions } from "./codelens";

let driftDecoration: vscode.TextEditorDecorationType | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

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

export function setupDriftOnSave(
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
