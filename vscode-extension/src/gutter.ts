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
 * Initializes the three VS Code gutter decoration types (documented, undocumented, and drifted) by writing SVG icon files to the system temp directory and registering them with the editor.
 *
 * Called once during extension activation, this function writes three SVG icon files to the OS temporary directory (because VS Code's gutterIconPath does not support data: URIs) and assigns the resulting TextEditorDecorationType instances to the module-level variables documentedDecoration, undocumentedDecoration, and driftedDecoration. Each decoration includes a gutter icon and a corresponding overview ruler color indicator.
 * @example
 * // Called internally by activate()
 * initGutterDecorations();
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
 * Scans the active editor's document for function definitions and applies gutter decorations to indicate whether each function is documented, undocumented, or has drifted documentation.
 *
 * Iterates over language-specific regex patterns from FUNCTION_PATTERNS to locate all function definitions in the editor's text. For each matched function, it checks whether a docstring is present via hasDocstring() and whether the function appears in the driftedFunctions set, then categorizes the decoration accordingly. Finally, it applies the three decoration types (documented, undocumented, drifted) to the editor. If the document's language has no registered patterns, the function returns early without making any changes.
 *
 * @param {vscode.TextEditor} editor - The active VS Code text editor whose document will be scanned for function definitions and decorated.
 * @param {Set<string>} driftedFunctions - A set of function names whose documentation is considered out-of-date or drifted from the current implementation.
 * @returns {void} Does not return a value; side-effects are applied directly to the editor's gutter decorations.
 * @example
 * const drifted = new Set<string>(['calculateTotal', 'fetchUser']);
 * updateGutterDecorations(vscode.window.activeTextEditor!, drifted);
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
 * Determines whether a docstring already exists adjacent to a function or method definition line for a given language.
 *
 * Checks the line immediately following the definition line for Python triple-quoted docstrings, and the line immediately preceding the definition line for JSDoc-style block comments in JavaScript, TypeScript, and Java, single-line `//` comments in Go, and triple-slash `///` doc comments in Rust. Returns false for any unrecognized language identifier.
 *
 * @param {string[]} lines - The full array of source-file lines, each as a raw string including any leading whitespace.
 * @param {number} defLineIdx - The zero-based index within `lines` of the function or method definition line to inspect.
 * @param {string} languageId - The VS Code language identifier of the source file (e.g. 'python', 'typescript', 'go', 'rust', 'java', 'javascript').
 * @returns {boolean} True if a language-appropriate docstring or doc comment is detected adjacent to the definition line; false otherwise.
 * @example
 * const fileLines = ['def greet():', '    """Says hello."""', '    pass'];
 * const alreadyDocumented = hasDocstring(fileLines, 0, 'python'); // true
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
 * Generates a 16x16 SVG file containing a single styled text symbol and writes it to disk, returning the full file path.
 *
 * Constructs an SVG string with a centered monospace text element using the provided symbol and color, writes the file synchronously to the specified directory, and returns the absolute path of the written file. This is typically called by initGutterDecorations() to create icon assets for VS Code gutter decorations.
 *
 * @param {string} dir - The directory path where the SVG file will be written.
 * @param {string} filename - The name of the SVG file to create (e.g., 'error.svg').
 * @param {string} symbol - The text character or symbol to render inside the SVG (e.g., '✖', '⚠', 'E').
 * @param {string} color - The CSS-compatible fill color string applied to the text element (e.g., '#ff0000', 'red').
 * @returns {string} The absolute file path of the newly written SVG file.
 * @throws {Error} When the directory does not exist or the process lacks write permissions, fs.writeFileSync will throw a Node.js filesystem error.
 * @example
 * const iconPath = writeSvgFile('/tmp/gutter-icons', 'error.svg', '✖', '#e74c3c');
 * // iconPath === '/tmp/gutter-icons/error.svg'
 */

function writeSvgFile(dir: string, filename: string, symbol: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <text x="8" y="12" text-anchor="middle" font-size="11" font-family="monospace" fill="${color}">${symbol}</text>
  </svg>`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, svg, "utf8");
  return filePath;
}
