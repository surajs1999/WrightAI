import * as vscode from "vscode";
import { generateDocstring } from "./client";

export async function generateAndInject(
  document: vscode.TextDocument,
  functionName: string,
  showPreview: boolean = true
): Promise<void> {
  const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!repoRoot) {
    vscode.window.showErrorMessage("Wright: No workspace folder open.");
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Wright: Generating docs for ${functionName}...` },
    async (progress) => {
      try {
        // Step 1: dry run to get preview
        progress.report({ message: "Generating docstring..." });
        const preview = await generateDocstring(document.uri.fsPath, functionName, repoRoot, true);

        if (!preview.success || !preview.preview) {
          vscode.window.showErrorMessage(`Wright: Failed to generate docs: ${preview.error ?? "Unknown error"}`);
          return;
        }

        if (showPreview) {
          // Step 2: show diff and ask user
          const choice = await vscode.window.showInformationMessage(
            `Wright: Generated docstring for ${functionName}. Preview:\n\n${preview.preview.slice(0, 200)}...`,
            "Apply",
            "Discard",
            "Regenerate"
          );

          if (choice === "Discard") return;

          if (choice === "Regenerate") {
            await generateAndInject(document, functionName, showPreview);
            return;
          }
        }

        // Step 3: apply
        progress.report({ message: "Applying docstring..." });
        const applied = await generateDocstring(document.uri.fsPath, functionName, repoRoot, false);

        if (!applied.success) {
          vscode.window.showErrorMessage(`Wright: Injection failed: ${applied.error ?? "Unknown error"}`);
          return;
        }

        vscode.window.showInformationMessage(`Wright: Docs generated for ${functionName} at line ${applied.injected_at_line ?? "?"}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Wright: Error: ${msg}`);
      }
    }
  );
}
