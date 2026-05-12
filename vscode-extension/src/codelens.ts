import * as vscode from "vscode";

const FUNCTION_PATTERNS: Record<string, RegExp[]> = {
  python: [
    /^(\s*)(async\s+)?def\s+(\w+)\s*\(/gm,
  ],
  javascript: [
    /^(\s*)(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s+(\w+)\s*\(/gm,
    /^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)[^\n=]*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/gm,
    /^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)[^\n=]*=\s*(?:async\s+)?function\b/gm,
  ],
  typescript: [
    /^(\s*)(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s+(\w+)\s*\(/gm,
    /^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)[^\n=]*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/gm,
    /^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)[^\n=]*=\s*(?:async\s+)?function\b/gm,
  ],
  java: [
    /^\s*(public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{/gm,
  ],
  go: [
    /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm,
  ],
  rust: [
    /^(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/gm,
  ],
};

export const DRIFTED_FUNCTIONS = new Map<string, Set<string>>();

/**
 * Marks a function as drifted by adding it to the drifted functions tracking map for the specified document.
 *
 * @param {string} documentUri - The URI of the document containing the drifted function.
 * @param {string} functionName - The name of the function that has drifted.
 */
export function markFunctionDrifted(documentUri: string, functionName: string): void {
  if (!DRIFTED_FUNCTIONS.has(documentUri)) {
    DRIFTED_FUNCTIONS.set(documentUri, new Set());
  }
  DRIFTED_FUNCTIONS.get(documentUri)!.add(functionName);
}

/**
 * Removes all drifted function entries for a specific document from the tracked collection.
 *
 * @param {string} documentUri - The URI of the document whose drifted functions should be cleared from tracking.
 */
export function clearDriftedFunctions(documentUri: string): void {
  DRIFTED_FUNCTIONS.delete(documentUri);
}

export class WrightCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const language = document.languageId;
    const patterns = FUNCTION_PATTERNS[language];
    if (!patterns?.length) return [];

    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const drifted = DRIFTED_FUNCTIONS.get(document.uri.toString()) ?? new Set<string>();
    const seenLines = new Set<number>();

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const functionName = match[3] ?? match[2] ?? match[1] ?? "";
        if (!functionName) continue;

        const pos = document.positionAt(match.index);
        if (seenLines.has(pos.line)) continue;
        seenLines.add(pos.line);

        const range = new vscode.Range(pos, pos);

        if (drifted.has(functionName)) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: "$(warning) Docs outdated — regenerate",
              command: "wright.generateCurrent",
              arguments: [document.uri, functionName],
            })
          );
        } else {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: "$(book) Generate Docs",
              command: "wright.generateCurrent",
              arguments: [document.uri, functionName],
            })
          );
        }
      }
    }

    return codeLenses;
  }

  resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
    return codeLens;
  }
}
