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

// Simple per-language docstring extractors (look for string/comment right after def line)
/**
 * Extracts documentation strings from source code lines based on the programming language's documentation conventions.
 *
 * Parses documentation comments or strings that appear immediately before or after a function definition line. Supports Python docstrings (triple quotes), Rust doc comments (///), JSDoc comments, Java Javadoc, Go line comments (//), and inline string literals. Searches up to 15-20 lines depending on the language.
 *
 * @param {string[]} lines - Array of source code lines to search for documentation strings.
 * @param {number} defLineIdx - Zero-based index of the function definition line within the lines array.
 * @param {string} languageId - Programming language identifier (e.g., 'python', 'rust', 'javascript', 'typescript', 'java', 'go').
 * @returns {string | null} Extracted documentation string with whitespace normalized and joined, or null if no documentation is found.
 * @example
 * const doc = extractDocstringAfterLine(codeLines, 42, 'python')
 */
export function extractDocstringAfterLine(lines: string[], defLineIdx: number, languageId: string): string | null {
  const next = lines[defLineIdx + 1]?.trimStart() ?? "";

  if (languageId === "python") {
    if (next.startsWith('"""') || next.startsWith("'''")) {
      const quote = next.startsWith('"""') ? '"""' : "'''";
      const firstLine = next.slice(3);
      const endIdx = firstLine.indexOf(quote);
      if (endIdx >= 0) return firstLine.slice(0, endIdx).trim(); // single-line
      // Multi-line: collect until closing quote
      const collected = [firstLine];
      for (let i = defLineIdx + 2; i < Math.min(defLineIdx + 20, lines.length); i++) {
        const l = lines[i];
        const closeIdx = l.indexOf(quote);
        if (closeIdx >= 0) { collected.push(l.slice(0, closeIdx)); break; }
        collected.push(l.trimStart());
      }
      return collected.join(" ").trim();
    }
  } else if (languageId === "rust") {
    // Look backwards for /// comments before the fn line
    const docs: string[] = [];
    for (let i = defLineIdx - 1; i >= Math.max(0, defLineIdx - 15); i--) {
      const l = lines[i].trimStart();
      if (l.startsWith("///")) { docs.unshift(l.slice(3).trim()); }
      else break;
    }
    return docs.length ? docs.join(" ") : null;
  } else if (languageId === "javascript" || languageId === "typescript") {
    // Look backwards for /** ... */ comment
    if (lines[defLineIdx - 1]?.trimStart().startsWith("*/")) {
      const docs: string[] = [];
      for (let i = defLineIdx - 1; i >= Math.max(0, defLineIdx - 20); i--) {
        const l = lines[i].trimStart();
        docs.unshift(l.replace(/^\/?\*+\/?/, "").trim());
        if (l.startsWith("/**")) break;
      }
      return docs.filter(Boolean).join(" ");
    }
    // Also check for string literal after {
    if (next.startsWith('"') || next.startsWith("'") || next.startsWith("`")) {
      return next.slice(1, next.lastIndexOf(next[0])).trim();
    }
  } else if (languageId === "java") {
    if (lines[defLineIdx - 1]?.trimStart().startsWith("*/")) {
      const docs: string[] = [];
      for (let i = defLineIdx - 1; i >= Math.max(0, defLineIdx - 20); i--) {
        const l = lines[i].trimStart();
        docs.unshift(l.replace(/^\/?\*+\/?/, "").trim());
        if (l.startsWith("/**")) break;
      }
      return docs.filter(Boolean).join(" ");
    }
  } else if (languageId === "go") {
    // Go docs are // comments before the func line
    const docs: string[] = [];
    for (let i = defLineIdx - 1; i >= Math.max(0, defLineIdx - 15); i--) {
      const l = lines[i].trimStart();
      if (l.startsWith("//")) { docs.unshift(l.slice(2).trim()); }
      else break;
    }
    return docs.length ? docs.join(" ") : null;
  }
  return null;
}

export class WrightHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | null {
    const language = document.languageId;
    const patterns = FUNCTION_PATTERNS[language];
    if (!patterns?.length) return null;

    const text = document.getText();
    const lines = text.split("\n");
    const seenLines = new Set<number>();

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const funcName = match[3] ?? match[2] ?? match[1] ?? "";
        if (!funcName) continue;

        const defPos = document.positionAt(match.index);
        const defLine = defPos.line;
        if (seenLines.has(defLine)) continue;
        seenLines.add(defLine);

        // Check if hover position is on the def line or within 3 lines
        if (Math.abs(position.line - defLine) > 2) continue;

        const wordRange = document.getWordRangeAtPosition(position);
        const word = document.getText(wordRange);
        if (word !== funcName) continue;

        const docstring = extractDocstringAfterLine(lines, defLine, language);

        const md = new vscode.MarkdownString("", true);
        md.isTrusted = true;

        // Command args must be serialized as primitives — pass fsPath string, not Uri object
        const cmdArgs = encodeURIComponent(JSON.stringify([document.uri.fsPath, funcName]));
        if (docstring) {
          md.appendMarkdown(`**${funcName}**\n\n${docstring}`);
          md.appendMarkdown(`\n\n---\n_[$(sync) Regenerate with Wright](command:wright.generateCurrentFromHover?${cmdArgs})_`);
        } else {
          md.appendMarkdown(`**${funcName}** — *no documentation yet*`);
          md.appendMarkdown(`\n\n[$(book) Generate docs with Wright](command:wright.generateCurrentFromHover?${cmdArgs})`);
        }

        return new vscode.Hover(md, new vscode.Range(defPos, defPos.translate(0, funcName.length)));
      }
    }

    return null;
  }
}
