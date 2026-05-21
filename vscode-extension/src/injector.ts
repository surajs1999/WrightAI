import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { generateDocstring } from "./client";
import { friendlyError, friendlyApiError } from "./errors";

const FIRST_INJECT_KEY = "wright.hasInjectedOnce";

/**
 * Generates a JSDoc/docstring for the specified function and injects it into the document after user confirmation via a diff preview.
 *
 * Orchestrates a four-step workflow: (1) performs a dry-run call to `generateDocstring` to obtain a preview, (2) presents an inline diff preview via `showDiffPreview` for user acceptance, (3) applies the docstring by calling `generateDocstring` again with `dryRun=false`, and (4) on first successful injection, surfaces a one-time informational tip about documentation drift detection. Requires an open workspace folder; shows an error message and returns early if none is found.
 *
 * @param {vscode.TextDocument} document - The currently active text document whose source text and file path are used to locate and annotate the target function.
 * @param {string} functionName - The exact name of the function within the document for which documentation should be generated and injected.
 * @param {vscode.ExtensionContext} context - Optional extension context used to read and write global state for tracking whether the first-injection tip has already been shown to the user.
 * @returns {Promise<void>} Resolves with no value once the injection workflow completes, is cancelled by the user, or exits early due to an error condition.
 * @throws {Error} Any unexpected error thrown by `generateDocstring`, `showDiffPreview`, or VS Code API calls is caught internally and surfaced as a VS Code error message notification via `friendlyError`.
 * @example
 * // Called from the activate() function in extension.ts
 * await generateAndInject(vscode.window.activeTextEditor.document, 'calculateTotal', context);
 */


export async function generateAndInject(
  document: vscode.TextDocument,
  functionName: string,
  context?: vscode.ExtensionContext
): Promise<void> {
  const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!repoRoot) {
    vscode.window.showErrorMessage("Wright: Please open a folder or workspace first.");
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Wright: Generating docs for ${functionName}…` },
    async () => {
      try {
        const fileContent = document.getText();

        // Step 1: dry run to get preview
        const preview = await generateDocstring(
          document.uri.fsPath, functionName, repoRoot, true, document.languageId, fileContent
        );

        if (!preview.success || !preview.preview) {
          vscode.window.showErrorMessage(`Wright: ${friendlyApiError(preview.error)}`);
          return;
        }

        // Step 2: show inline diff preview
        const accepted = await showDiffPreview(document, functionName, preview.preview);
        if (!accepted) return;

        // Step 3: apply docstring locally so the file watcher fires and the coverage panel refreshes
        const currentText = document.getText();
        const newText = insertPreviewIntoSource(currentText, functionName, preview.preview, document.languageId);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(document.positionAt(0), document.positionAt(currentText.length)),
          newText
        );
        const applied = await vscode.workspace.applyEdit(edit);
        if (!applied) {
          vscode.window.showErrorMessage("Wright: Failed to apply docstring.");
          return;
        }
        await document.save();

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
        vscode.window.showErrorMessage(`Wright: ${friendlyError(err)}`);
      }
    }
  );
}

/**
 * Displays a side-by-side diff preview of the proposed docstring insertion and prompts the user to apply or discard the change.
 *
 * Generates a temporary file containing the source code with the proposed docstring inserted, opens a VSCode diff editor comparing the original document against the preview, and presents a modal confirmation dialog. Regardless of the user's choice, the temporary file is deleted and the diff tab is closed. Called by generateAndInject() as the final user-confirmation step before committing a docstring to the source file.
 *
 * @param {vscode.TextDocument} document - The active VSCode text document whose source code will be compared against the docstring preview.
 * @param {string} functionName - The name of the function for which the docstring was generated; used to locate the insertion point and to label the diff tab.
 * @param {string} docstringPreview - The generated docstring text to be previewed and optionally inserted into the source file.
 * @returns {Promise<boolean>} Resolves to true if the user clicked 'Apply', or false if the user clicked 'Discard' or dismissed the dialog.
 * @example
 * const applied = await showDiffPreview(document, 'calculateTotal', '/** Calculates the total price. *\/');
 */


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

/**
 * Maps a VS Code language identifier to its corresponding file extension string.
 *
 * Performs a lookup against a predefined map of supported language identifiers (python, javascript, typescript, java, go, rust) and returns the associated file extension. Falls back to 'txt' for any unrecognized language identifier. Used by showDiffPreview() to determine the appropriate file extension when constructing diff preview URIs.
 *
 * @param {string} languageId - The VS Code language identifier (e.g., 'python', 'typescript') to look up.
 * @returns {string} The file extension corresponding to the given language identifier (e.g., 'py' for 'python'), or 'txt' if the language identifier is not recognized.
 * @example
 * const ext = langExt('typescript'); // returns 'ts'
 * const fallback = langExt('cobol');   // returns 'txt'
 */


export function langExt(languageId: string): string {
  const map: Record<string, string> = {
    python: "py", javascript: "js", typescript: "ts",
    java: "java", go: "go", rust: "rs",
  };
  return map[languageId] ?? "txt";
}

/**
 * Inserts a generated docstring into source code after the definition line of a specified function,
 * with language-aware indentation and placement.
 *
 * For Python, the docstring is indented to match the function body. For all other supported
 * languages (JS, TS, Java, Go, Rust), the docstring is inserted verbatim on the line following
 * the definition. Returns the original source unchanged if the language is unsupported; prepends
 * the docstring to the file as a fallback if the function is not found.
 *
 * @param {string} source - The full source code of the file.
 * @param {string} functionName - The name of the function whose definition line will be located.
 * @param {string} docstring - The formatted docstring text to insert.
 * @param {string} languageId - The VS Code language identifier (e.g., 'python', 'typescript', 'go').
 * @returns {string} The modified source with the docstring inserted, or the original source if unsupported.
 * @example
 * const updated = insertPreviewIntoSource('def greet(name):\n    pass', 'greet', '"""Says hello."""', 'python');
 * // Result: 'def greet(name):\n    """Says hello."""\n    pass'
 */
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
