import * as vscode from "vscode";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";

const FUNCTION_PATTERNS: Record<string, RegExp> = {
  python: /^(\s*)(async\s+)?def\s+(\w+)\s*\(/gm,
  javascript: /^(\s*)(async\s+)?function\s+(\w+)\s*\(/gm,
  typescript: /^(\s*)(async\s+)?function\s+(\w+)\s*\(/gm,
  java: /^\s*(public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{/gm,
  go: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm,
  rust: /^(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/gm,
};

let documentedDecoration: vscode.TextEditorDecorationType;
let undocumentedDecoration: vscode.TextEditorDecorationType;
let driftedDecoration: vscode.TextEditorDecorationType;

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

export function updateGutterDecorations(
  editor: vscode.TextEditor,
  driftedFunctions: Set<string>
): void {
  const language = editor.document.languageId;
  const pattern = FUNCTION_PATTERNS[language];
  if (!pattern) return;

  const text = editor.document.getText();
  const lines = text.split("\n");

  const documented: vscode.DecorationOptions[] = [];
  const undocumented: vscode.DecorationOptions[] = [];
  const drifted: vscode.DecorationOptions[] = [];

  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const funcName = match[3] ?? match[2] ?? match[1] ?? "";
    if (!funcName) continue;

    const pos = editor.document.positionAt(match.index);
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

  editor.setDecorations(documentedDecoration, documented);
  editor.setDecorations(undocumentedDecoration, undocumented);
  editor.setDecorations(driftedDecoration, drifted);
}

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

function writeSvgFile(dir: string, filename: string, symbol: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <text x="8" y="12" text-anchor="middle" font-size="11" font-family="monospace" fill="${color}">${symbol}</text>
  </svg>`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, svg, "utf8");
  return filePath;
}
