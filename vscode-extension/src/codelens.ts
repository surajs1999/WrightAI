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
 * Registers a function as drifted for a given document URI in the global DRIFTED_FUNCTIONS map.
 *
 * Ensures that an entry exists in the DRIFTED_FUNCTIONS map for the specified document URI, then adds the given function name to the associated set of drifted functions. This is called by runDriftCheck() when a function is detected to have drifted from its documented or expected state.
 *
 * @param {string} documentUri - The URI of the document containing the drifted function, used as the key in the DRIFTED_FUNCTIONS map.
 * @param {string} functionName - The name of the function that has been identified as drifted and should be recorded.
 * @returns {void} This function does not return a value.
 * @example
 * markFunctionDrifted('file:///workspace/src/utils.ts', 'parseConfig');
 */


export function markFunctionDrifted(documentUri: string, functionName: string): void {
  if (!DRIFTED_FUNCTIONS.has(documentUri)) {
    DRIFTED_FUNCTIONS.set(documentUri, new Set());
  }
  DRIFTED_FUNCTIONS.get(documentUri)!.add(functionName);
}

/**
 * Removes all tracked drifted functions associated with the given document URI from the internal registry.
 *
 * Called by runDriftCheck() to clear stale or outdated drift data for a specific document before re-running drift analysis, ensuring the registry reflects the current state of the document.
 *
 * @param {string} documentUri - The URI string identifying the VS Code document whose drifted function entries should be removed from the DRIFTED_FUNCTIONS map.
 * @returns {void} Does not return a value.
 * @example
 * clearDriftedFunctions('file:///Users/dev/project/src/utils.ts');
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
