import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { generateDocstring } from "./client";

const FIRST_INJECT_KEY = "wright.hasInjectedOnce";

export async function generateAndInject(
  document: vscode.TextDocument,
  functionName: string,
  context?: vscode.ExtensionContext
): Promise<void> {
  const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!repoRoot) {
    vscode.window.showErrorMessage("Wright: No workspace folder open.");
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Wright: Generating docs for ${functionName}…` },
    async () => {
      try {
        // Step 1: dry run to get preview
        const preview = await generateDocstring(
          document.uri.fsPath, functionName, repoRoot, true, document.languageId
        );

        if (!preview.success || !preview.preview) {
          vscode.window.showErrorMessage(`Wright: Failed to generate docs: ${preview.error ?? "Unknown error"}`);
          return;
        }

        // Step 2: show inline diff preview
        const accepted = await showDiffPreview(document, functionName, preview.preview);
        if (!accepted) return;

        // Step 3: apply
        const applied = await generateDocstring(
          document.uri.fsPath, functionName, repoRoot, false, document.languageId
        );

        if (!applied.success) {
          vscode.window.showErrorMessage(`Wright: Injection failed: ${applied.error ?? "Unknown error"}`);
          return;
        }

        // Step 4: first-time tip
        if (context) {
          const hasShown = context.globalState.get<boolean>(FIRST_INJECT_KEY);
          if (!hasShown) {
            await context.globalState.update(FIRST_INJECT_KEY, true);
            vscode.window.showInformationMessage(
              "Wright: Tip — save this file to automatically check for documentation drift.",
              "Got it"
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Wright: Error: ${msg}`);
      }
    }
  );
}

async function showDiffPreview(
  document: vscode.TextDocument,
  functionName: string,
  docstringPreview: string
): Promise<boolean> {
  // Write a temp file with the docstring inserted so we can show a real diff
  const originalText = document.getText();
  const previewText = insertPreviewIntoSource(originalText, functionName, docstringPreview, document.languageId);

  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `wright-preview-${Date.now()}.${langExt(document.languageId)}`);
  fs.writeFileSync(tmpPath, previewText, "utf8");
  const tmpUri = vscode.Uri.file(tmpPath);

  const diffTitle = `Wright: ${functionName} — docstring preview`;

  try {
    await vscode.commands.executeCommand(
      "vscode.diff",
      document.uri,
      tmpUri,
      diffTitle,
      { preview: true }
    );

    const choice = await vscode.window.showInformationMessage(
      `Wright: Apply this docstring for "${functionName}"?`,
      { modal: true },
      "Apply",
      "Discard"
    );

    return choice === "Apply";
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    // Close the specific diff tab by matching its label
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.label.startsWith(`Wright: ${functionName}`)) {
          await vscode.window.tabGroups.close(tab);
          break;
        }
      }
    }
  }
}

export function langExt(languageId: string): string {
  const map: Record<string, string> = {
    python: "py", javascript: "js", typescript: "ts",
    java: "java", go: "go", rust: "rs",
  };
  return map[languageId] ?? "txt";
}

export function insertPreviewIntoSource(
  source: string,
  functionName: string,
  docstring: string,
  languageId: string
): string {
  // Find the function definition line and insert docstring after it
  const lines = source.split("\n");
  const patterns: Record<string, RegExp> = {
    python: new RegExp(`^(\\s*)(async\\s+)?def\\s+${functionName}\\s*\\(`),
    javascript: new RegExp(`^(\\s*)(async\\s+)?function\\s+${functionName}\\s*\\(`),
    typescript: new RegExp(`^(\\s*)(async\\s+)?function\\s+${functionName}\\s*\\(`),
    java: new RegExp(`\\s+${functionName}\\s*\\(`),
    go: new RegExp(`^func\\s+(?:\\(\\w+\\s+\\*?\\w+\\)\\s+)?${functionName}\\s*\\(`),
    rust: new RegExp(`^(pub\\s+)?(async\\s+)?fn\\s+${functionName}\\s*\\(`),
  };

  const pattern = patterns[languageId];
  if (!pattern) return source;

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      // Find the line after the opening brace/colon
      let insertAt = i + 1;
      if (languageId === "python") {
        // Insert after the def line (colon line)
        const defLine = lines[i];
        const indent = defLine.match(/^(\s*)/)?.[1] ?? "";
        const indented = docstring.split("\n").map(l => l ? indent + "    " + l : l).join("\n");
        lines.splice(insertAt, 0, indented);
      } else {
        lines.splice(insertAt, 0, docstring);
      }
      return lines.join("\n");
    }
  }
  // Fallback: prepend to file
  return docstring + "\n" + source;
}
