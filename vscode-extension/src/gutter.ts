import * as vscode from "vscode";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";

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

let documentedDecoration: vscode.TextEditorDecorationType;
let undocumentedDecoration: vscode.TextEditorDecorationType;
let driftedDecoration: vscode.TextEditorDecorationType;

/**
 * Initializes three text editor decoration types with SVG gutter icons for documenting code states (documented, undocumented, and drifted).
 *
 * Creates and configures VS Code TextEditorDecorationType objects for displaying gutter icons and overview ruler indicators. Writes SVG files to the system temporary directory since data URIs are not supported for gutterIconPath. The three decoration types are: documented (green checkmark), undocumented (gray circle), and drifted (orange warning).
 * @returns {void} No return value; modifies module-level decoration variables as side effects.
 * @example
 * initGutterDecorations()
 */
export function initGutterDecorations(): void {
  // Write SVG files to disk — data: URIs are not supported for gutterIconPath
  const tmpDir = os.tmpdir();

  documentedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: writeSvgFile(tmpDir, "wright-doc.svg", "✓", "#4ade80"),
    gutterIconSize: "contain",
    overviewRulerColor: "#4ade8060",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });

  undocumentedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: writeSvgFile(tmpDir, "wright-undoc.svg", "○", "#94a3b8"),
    gutterIconSize: "contain",
    overviewRulerColor: "#94a3b840",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });

  driftedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: writeSvgFile(tmpDir, "wright-drift.svg", "⚠", "#f59e0b"),
    gutterIconSize: "contain",
    overviewRulerColor: "#f59e0b80",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });
}

/**
 * Updates gutter decorations in the editor to visually indicate documented, undocumented, and drifted functions.
 *
 * Scans the active editor document for function definitions using language-specific regex patterns, checks for documentation presence, and applies appropriate gutter decorations (green for documented, yellow for undocumented, red for drifted). Creates hover messages with documentation status and generation commands for undocumented functions.
 *
 * @param {vscode.TextEditor} editor - The VS Code text editor instance to apply decorations to.
 * @param {Set<string>} driftedFunctions - Set of function names whose documentation has drifted from implementation.
 * @returns {void} No return value; applies decorations directly to the editor.
 * @example
 * updateGutterDecorations(activeEditor, new Set(['calculateTotal', 'processData']))
 */
export function updateGutterDecorations(
  editor: vscode.TextEditor,
  driftedFunctions: Set<string>
): void {
  const language = editor.document.languageId;
  const patterns = FUNCTION_PATTERNS[language];
  if (!patterns?.length) return;

  const text = editor.document.getText();
  const lines = text.split("\n");

  const documented: vscode.DecorationOptions[] = [];
  const undocumented: vscode.DecorationOptions[] = [];
  const drifted: vscode.DecorationOptions[] = [];
  const seenLines = new Set<number>();

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const funcName = match[3] ?? match[2] ?? match[1] ?? "";
      if (!funcName) continue;

      const pos = editor.document.positionAt(match.index);
      if (seenLines.has(pos.line)) continue;
      seenLines.add(pos.line);

      const range = new vscode.Range(pos, pos);
      const defLine = pos.line;

      const hasDoc = hasDocstring(lines, defLine, language);
      const decoration: vscode.DecorationOptions = {
        range,
        hoverMessage: hasDoc
          ? new vscode.MarkdownString(`**${funcName}** — documented`)
          : new vscode.MarkdownString(`**${funcName}** — [$(book) Generate docs](command:wright.generateCurrent?${encodeURIComponent(JSON.stringify([editor.document.uri, funcName]))})`),
      };
      (decoration.hoverMessage as vscode.MarkdownString).isTrusted = true;

      if (driftedFunctions.has(funcName)) {
        drifted.push(decoration);
      } else if (hasDoc) {
        documented.push(decoration);
      } else {
        undocumented.push(decoration);
      }
    }
  }

  editor.setDecorations(documentedDecoration, documented);
  editor.setDecorations(undocumentedDecoration, undocumented);
  editor.setDecorations(driftedDecoration, drifted);
}

/**
 * Checks whether a function or method definition at the specified line has associated documentation.
 *
 * Inspects the lines surrounding a function definition to determine if documentation exists based on language-specific conventions. For Python, checks if the next line starts with triple quotes. For JavaScript, TypeScript, and Java, checks if the previous line starts with JSDoc-style comments. For Go, checks for single-line comments, and for Rust, checks for triple-slash doc comments.
 *
 * @param {string[]} lines - Array of source code lines from the document.
 * @param {number} defLineIdx - Zero-based index of the line containing the function or method definition.
 * @param {string} languageId - Programming language identifier (e.g., 'python', 'javascript', 'typescript', 'java', 'go', 'rust').
 * @returns {boolean} True if documentation is present according to the language's conventions, false otherwise.
 * @example
 * hasDocstring(['def example():', '    """This is a docstring."""', '    pass'], 0, 'python')
 */
export function hasDocstring(lines: string[], defLineIdx: number, languageId: string): boolean {
  const next = lines[defLineIdx + 1]?.trimStart() ?? "";

  if (languageId === "python") {
    return next.startsWith('"""') || next.startsWith("'''");
  }
  if (languageId === "javascript" || languageId === "typescript" || languageId === "java") {
    const prev = lines[defLineIdx - 1]?.trimStart() ?? "";
    return prev.startsWith("*") || prev.startsWith("/**");
  }
  if (languageId === "go") {
    return (lines[defLineIdx - 1]?.trimStart() ?? "").startsWith("//");
  }
  if (languageId === "rust") {
    return (lines[defLineIdx - 1]?.trimStart() ?? "").startsWith("///");
  }
  return false;
}

/**
 * Creates an SVG file containing a centered text symbol with specified color and writes it to the given directory.
 *
 * Generates a 16x16 pixel SVG with a centered monospace text element, writes it to the filesystem using synchronous file operations, and returns the full file path.
 *
 * @param {string} dir - The directory path where the SVG file will be written.
 * @param {string} filename - The name of the SVG file to create.
 * @param {string} symbol - The text character or symbol to display in the SVG.
 * @param {string} color - The fill color for the text symbol (CSS color format).
 * @returns {string} The full file path where the SVG file was written.
 * @throws {Error} When the directory does not exist or is not writable.
 * @throws {Error} When file system write operation fails.
 * @example
 * const svgPath = writeSvgFile('/tmp/icons', 'symbol.svg', '✓', '#00ff00')
 */
function writeSvgFile(dir: string, filename: string, symbol: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <text x="8" y="12" text-anchor="middle" font-size="11" font-family="monospace" fill="${color}">${symbol}</text>
  </svg>`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, svg, "utf8");
  return filePath;
}
