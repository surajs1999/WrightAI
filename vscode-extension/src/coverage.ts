import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";

interface CoverageItem {
  label: string;
  pct: number;
  description?: string;
}

/** Resolve candidates for the wright CLI, venv Python, and system Python. */
function findWrightCli(repoRoot: string): { cmd: string; args: string[] } | null {
  // 1. wright in the project's venv
  const venvCandidates = [
    path.join(repoRoot, ".venv", "bin", "wright"),
    path.join(repoRoot, "venv",  "bin", "wright"),
  ];
  for (const p of venvCandidates) {
    if (fs.existsSync(p)) return { cmd: p, args: [] };
  }
  // 2. python -m cli.main (source checkout with venv Python)
  const pyVenv = [
    path.join(repoRoot, ".venv", "bin", "python3"),
    path.join(repoRoot, ".venv", "bin", "python"),
    path.join(repoRoot, "venv",  "bin", "python3"),
    path.join(repoRoot, "venv",  "bin", "python"),
  ].find(p => fs.existsSync(p));
  if (pyVenv) return { cmd: pyVenv, args: ["-m", "cli.main"] };
  // 3. system wright / python as last resort
  if (cp.spawnSync("wright", ["--version"], { stdio: "ignore" }).status === 0) {
    return { cmd: "wright", args: [] };
  }
  return null;
}

/**
 * Run `wright coverage <repoRoot> --output <tmpFile>` and parse the JSON result.
 * Falls back to a self-contained Python script for source-checkout installations
 * where the module path can be resolved from the venv.
 */
function runScan(
  repoRoot: string,
): Promise<{ total: number; documented: number; files: number } | null> {
  const os = require("os") as typeof import("os");
  const tmpOut = path.join(os.tmpdir(), `wright-cov-${Date.now()}.json`);

  const cli = findWrightCli(repoRoot);
  if (!cli) {
    vscode.window.showWarningMessage(
      "Wright: could not find wright CLI or Python. Install wright (`pip install wright`) to enable coverage scanning."
    );
    return Promise.resolve(null);
  }

  const { cmd, args } = cli;
  const fullArgs = [...args, "coverage", repoRoot, "--output", tmpOut];

  return new Promise(resolve => {
    cp.execFile(cmd, fullArgs, { cwd: repoRoot, timeout: 90_000 }, (err, _out, stderr) => {
      // exit code 1 is expected when coverage < threshold — not a fatal error
      if (err && err.code !== 1) {
        console.error("[Wright coverage]", stderr || err.message);
        try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
        resolve(null);
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(tmpOut, "utf8")) as {
          total: number; documented: number; files: number;
        };
        try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
        resolve({ total: data.total ?? 0, documented: data.documented ?? 0, files: data.files ?? 0 });
      } catch {
        resolve(null);
      }
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

    const result = await runScan(repoRoot);

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
      this._items = [{ label: "Could not scan workspace", pct: 0, description: "run: pip install wright" }];
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
