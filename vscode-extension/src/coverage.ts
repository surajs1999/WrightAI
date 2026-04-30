import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { hasDocstring } from "./gutter";

const FUNCTION_PATTERNS: Record<string, RegExp> = {
  python:     /^(\s*)(async\s+)?def\s+(\w+)\s*\(/gm,
  javascript: /^(\s*)(async\s+)?function\s+(\w+)\s*\(/gm,
  typescript: /^(\s*)(async\s+)?function\s+(\w+)\s*\(/gm,
  java:       /^\s*(public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{/gm,
  go:         /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm,
  rust:       /^(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/gm,
};

const EXT_TO_LANG: Record<string, string> = {
  ".py": "python", ".js": "javascript", ".ts": "typescript",
  ".tsx": "typescript", ".jsx": "javascript",
  ".java": "java", ".go": "go", ".rs": "rust",
};

const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
  "dist", "build", "out", ".next", "target", "vendor", ".cargo",
  "coverage", "htmlcov", ".tox", "tmp", "temp", ".cache", "out",
]);

interface CoverageItem {
  label: string;
  pct: number;
  description?: string;
}

const MAX_FILES = 2000; // safety cap — avoids scanning entire system

function scanWorkspace(repoRoot: string): { total: number; documented: number; files: number; capped: boolean } {
  let total = 0;
  let documented = 0;
  let files = 0;
  let capped = false;

  function walk(dir: string) {
    if (capped) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (capped) return;

      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          walk(path.join(dir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const lang = EXT_TO_LANG[ext];
        if (!lang) continue;

        if (files >= MAX_FILES) { capped = true; return; }

        let text: string;
        try { text = fs.readFileSync(path.join(dir, entry.name), "utf8"); }
        catch { continue; }

        const pattern = FUNCTION_PATTERNS[lang];
        if (!pattern) continue;

        const lines = text.split("\n");
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
          const defLine = text.slice(0, match.index).split("\n").length - 1;
          total++;
          if (hasDocstring(lines, defLine, lang)) documented++;
        }

        files++;
      }
    }
  }

  walk(repoRoot);
  return { total, documented, files, capped };
}

export class CoverageTreeProvider implements vscode.TreeDataProvider<CoverageItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CoverageItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _items: CoverageItem[] = [
    { label: "Scanning…", pct: 100, description: "" },
  ];

  private _pct: number | null = null;
  private _total = 0;
  private _documented = 0;

  get overallPct(): number | null { return this._pct; }
  get total(): number { return this._total; }
  get documented(): number { return this._documented; }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async loadCoverage(): Promise<void> {
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) {
      this._items = [{ label: "Open a workspace to see coverage", pct: 0 }];
      this.refresh();
      return;
    }

    // Run synchronous scan off the main thread via setImmediate
    await new Promise<void>(resolve => setImmediate(resolve));

    try {
      const { total, documented, files, capped } = scanWorkspace(repoRoot);
      const pct = total > 0 ? (documented / total) * 100 : 100;

      this._pct = pct;
      this._total = total;
      this._documented = documented;

      const rootName = path.basename(repoRoot);
      this._items = [
        {
          label: `Coverage: ${pct.toFixed(1)}%`,
          pct,
          description: `${files}${capped ? "+" : ""} files`,
        },
        {
          label: `Workspace: ${rootName}`,
          pct: 100,
          description: repoRoot,
        },
        {
          label: `Documented: ${documented} / ${total}`,
          pct,
          description: "functions",
        },
        {
          label: `Undocumented: ${total - documented}`,
          pct: total - documented === 0 ? 100 : 0,
          description: "functions",
        },
      ];

      if (capped) {
        this._items.push({
          label: `⚠ Scan capped at ${MAX_FILES} files`,
          pct: 50,
          description: "workspace may be too large",
        });
      }
    } catch {
      this._items = [{ label: "Could not scan workspace", pct: 0 }];
    }

    this.refresh();
  }

  getTreeItem(element: CoverageItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.iconPath =
      element.pct >= 80
        ? new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"))
        : element.pct >= 50
        ? new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"))
        : new vscode.ThemeIcon("error", new vscode.ThemeColor("editorError.foreground"));
    return item;
  }

  getChildren(element?: CoverageItem): CoverageItem[] {
    if (element) return [];
    return this._items;
  }
}
