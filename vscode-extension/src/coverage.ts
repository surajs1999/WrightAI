import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";
import { hasDocstring } from "./gutter";

interface CoverageItem {
  label: string;
  pct: number;
  description?: string;
}

/** Find the Python executable that has the project's packages installed. */
function findPython(repoRoot: string): string {
  const candidates = [
    path.join(repoRoot, ".venv", "bin", "python3"),
    path.join(repoRoot, ".venv", "bin", "python"),
    path.join(repoRoot, "venv",  "bin", "python3"),
    path.join(repoRoot, "venv",  "bin", "python"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return "python3"; // system fallback
}

/**
 * Run the exact same tree-sitter scan used by `wright init`.
 * Uses the project's .venv Python so tree-sitter packages are always available.
 */
function runPythonScan(
  repoRoot: string,
): Promise<{ total: number; documented: number; files: number } | null> {
  const os = require("os") as typeof import("os");
  const tmpOut    = path.join(os.tmpdir(), `wright-cov-${Date.now()}.json`);
  const tmpScript = path.join(os.tmpdir(), `wright-scan-${Date.now()}.py`);

  const script = [
    "import json, sys",
    `sys.path.insert(0, ${JSON.stringify(repoRoot)})`,
    "from core.parser.tree_sitter_parser import CodeParser",
    "parser = CodeParser()",
    `parsed = parser.parse_directory(${JSON.stringify(repoRoot)})`,
    "all_funcs  = [f for pf in parsed for f in pf.functions if f.name != '<anonymous>']",
    "total      = len(all_funcs)",
    "documented = sum(1 for f in all_funcs if f.existing_docstring)",
    `open(${JSON.stringify(tmpOut)}, 'w').write(`,
    `  json.dumps({'total': total, 'documented': documented, 'files': len(parsed)}))`,
  ].join("\n");

  try { fs.writeFileSync(tmpScript, script, "utf8"); } catch { return Promise.resolve(null); }

  const python = findPython(repoRoot);

  return new Promise(resolve => {
    cp.exec(`"${python}" "${tmpScript}"`, { cwd: repoRoot, timeout: 60_000 }, (err, _out, stderr) => {
      try { fs.unlinkSync(tmpScript); } catch { /* ignore */ }
      if (err) {
        console.error("[Wright coverage]", stderr || err.message);
        resolve(null);
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(tmpOut, "utf8")) as {
          total: number; documented: number; files: number;
        };
        try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
        resolve({ total: data.total ?? 0, documented: data.documented ?? 0, files: data.files ?? 0 });
      } catch { resolve(null); }
    });
  });
}

export class CoverageTreeProvider implements vscode.TreeDataProvider<CoverageItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CoverageItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _items: CoverageItem[] = [{ label: "Scanning…", pct: 100, description: "" }];
  private _pct: number | null = null;
  private _total = 0;
  private _documented = 0;

  get overallPct(): number | null { return this._pct; }
  get total(): number { return this._total; }
  get documented(): number { return this._documented; }

  refresh(): void { this._onDidChangeTreeData.fire(); }

  async loadCoverage(): Promise<void> {
    // The workspace folder the user opened IS the project root — use it directly.
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) {
      this._items = [{ label: "Open a workspace to see coverage", pct: 0 }];
      this.refresh();
      return;
    }

    await new Promise<void>(resolve => setImmediate(resolve));

    // Use the same tree-sitter scanner as `wright init` / `wright coverage`
    const result = await runPythonScan(repoRoot);

    if (result) {
      const { total, documented, files } = result;
      const pct = total > 0 ? (documented / total) * 100 : 100;
      this._pct = pct;
      this._total = total;
      this._documented = documented;
      this._items = [
        { label: `Coverage: ${pct.toFixed(1)}%`,        pct,                              description: `${files} files` },
        { label: `Workspace: ${path.basename(repoRoot)}`, pct: 100,                        description: repoRoot },
        { label: `Documented: ${documented} / ${total}`, pct,                              description: "functions" },
        { label: `Undocumented: ${total - documented}`,  pct: total - documented === 0 ? 100 : 0, description: "functions" },
      ];
    } else {
      this._items = [{ label: "Could not scan workspace", pct: 0, description: "ensure Python + wright are installed" }];
    }

    this.refresh();
  }

  getTreeItem(element: CoverageItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.iconPath =
      element.pct >= 80
        ? new vscode.ThemeIcon("check",   new vscode.ThemeColor("testing.iconPassed"))
        : element.pct >= 50
        ? new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"))
        : new vscode.ThemeIcon("error",   new vscode.ThemeColor("editorError.foreground"));
    return item;
  }

  getChildren(element?: CoverageItem): CoverageItem[] {
    if (element) return [];
    return this._items;
  }
}
