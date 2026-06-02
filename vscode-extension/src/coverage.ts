import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";

interface CoverageItem {
  label: string;
  pct: number;
  description?: string;
}

/**
 * Resolves the Wright CLI command and arguments by searching virtual environments and the system PATH in priority order.
 *
 * Attempts to locate a usable Wright CLI executable using a three-tier fallback strategy: (1) a compiled `wright` binary inside the project's `.venv` or `venv` directory, (2) a virtual-environment Python interpreter invoked with `-m cli.main` for source-checkout setups, and (3) a system-wide `wright` executable on PATH as a last resort. Returns null if none of the candidates are found or functional.
 *
 * @param {string} repoRoot - Absolute path to the root of the repository being analysed; used as the base directory when constructing paths to virtual-environment binaries.
 * @returns {{ cmd: string; args: string[] } | null} An object containing `cmd` (the executable path or name to spawn) and `args` (any additional CLI arguments required to invoke Wright, e.g. `["-m", "cli.main"]`), or `null` if no viable Wright CLI could be located.
 * @example
 * const cli = findWrightCli('/home/user/projects/my-repo');
 * if (cli) {
 *   cp.spawn(cli.cmd, [...cli.args, 'scan'], { stdio: 'inherit' });
 * } else {
 *   vscode.window.showErrorMessage('Wright CLI not found.');
 * }
 */


export function findWrightCli(repoRoot: string): { cmd: string; args: string[] } | null {
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
 * Executes a CLI command as a child process and resolves with the output file path on success or null on failure.
 *
 * Spawns the given CLI command with its base arguments, any extra arguments, and an '--output' flag pointing to a temporary file path. The process runs within the repository root directory with a 90-second timeout. If the process exits with an error (unless allowExitOne is true and the exit code is 1), it logs the error to stderr, attempts to remove the temporary output file, and resolves with null. On success, it resolves with the path to the temporary output file.
 *
 * @param {{ cmd: string; args: string[] }} cli - An object containing the CLI command name (cmd) and its base argument list (args) to be passed to the child process.
 * @param {string} repoRoot - The absolute path to the repository root, used as the working directory for the spawned process.
 * @param {string[]} extraArgs - Additional arguments appended to the CLI's base args before the '--output' flag.
 * @param {string} tmpOut - The temporary file path passed as the value of the '--output' argument and returned on success.
 * @param {boolean} allowExitOne - If true, an exit code of 1 from the child process is not treated as an error. Defaults to false.
 * @returns {Promise<string | null>} Resolves with the tmpOut file path if the command succeeds (or exits with code 1 when allowExitOne is true), or null if the command fails.
 * @example
 * const outputPath = await runCli(
 *   { cmd: 'wright-cli', args: ['scan', '--format', 'json'] },
 *   '/home/user/my-repo',
 *   ['--include', 'src/* *'],
 *   '/tmp/wright-output-12345.json',
 *   true
 * );
 * if (outputPath) {
 *   console.log('Output written to:', outputPath);
 * }
 */

function loadDotEnv(repoRoot: string): Record<string, string> {
  const envPath = path.join(repoRoot, ".env");
  const vars: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return vars;
  try {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  } catch { /* ignore */ }
  return vars;
}

export function runCli(
  cli: { cmd: string; args: string[] },
  repoRoot: string,
  extraArgs: string[],
  tmpOut: string,
  allowExitOne = false,
  timeoutMs = 90_000,
): Promise<string | null> {
  const fullArgs = [...cli.args, ...extraArgs, "--output", tmpOut];
  // Merge .env from the project root so the CLI subprocess gets ANTHROPIC_API_KEY etc.
  const env = { ...process.env, ...loadDotEnv(repoRoot) };
  return new Promise(resolve => {
    cp.execFile(cli.cmd, fullArgs, { cwd: repoRoot, timeout: timeoutMs, env }, (err, _out, stderr) => {
      if (err && !(allowExitOne && err.code === 1)) {
        console.error("[Wright]", stderr || err.message);
        try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
        resolve(null);
        return;
      }
      resolve(tmpOut);
    });
  });
}

/**
 * Runs a Wright coverage scan on the given repository root and returns documentation coverage statistics.
 *
 * Locates the Wright CLI using `findWrightCli`, then invokes it with the `coverage` subcommand via `runCli`, writing results to a temporary JSON file. If the CLI cannot be found, a VS Code warning is shown and `null` is returned. On success, the temporary file is read, parsed, and cleaned up before returning the coverage data.
 *
 * @param {string} repoRoot - Absolute path to the root of the repository to scan for documentation coverage.
 * @returns {Promise<{ total: number; documented: number; files: number } | null>} A promise that resolves to an object containing `total` (total symbols), `documented` (documented symbols), and `files` (number of files scanned), or `null` if the CLI is unavailable, the scan fails, or the output cannot be parsed.
 * @example
 * const stats = await runScan('/home/user/my-project');
 * if (stats) {
 *   console.log(`Documented ${stats.documented} of ${stats.total} symbols across ${stats.files} files`);
 * }
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
  return runCli(cli, repoRoot, ["coverage", repoRoot], tmpOut, true).then(out => {
    if (!out) return null;
    try {
      const data = JSON.parse(fs.readFileSync(out, "utf8")) as { total: number; documented: number; files: number };
      try { fs.unlinkSync(out); } catch { /* ignore */ }
      return { total: data.total ?? 0, documented: data.documented ?? 0, files: data.files ?? 0 };
    } catch { return null; }
  });
}

/**
 * Runs a drift scan on the given repository root using the Wright CLI and returns counts of drifted and undocumented items.
 *
 * Locates the Wright CLI within the repository, invokes it with the 'drift' subcommand, writes the results to a temporary JSON file, reads and parses that file, then cleans it up before returning the drifted and undocumented counts. Returns null if the CLI cannot be found, if the CLI invocation fails, or if the output cannot be parsed.
 *
 * @param {string} repoRoot - The absolute path to the root of the repository to scan for documentation drift.
 * @returns {Promise<{ drifted: number; undocumented: number } | null>} A promise that resolves to an object containing the number of drifted and undocumented items, or null if the scan could not be completed.
 * @example
 * const result = await runDriftScan('/home/user/my-project');
 * if (result) {
 *   console.log(`Drifted: ${result.drifted}, Undocumented: ${result.undocumented}`);
 * }
 */

function runDriftScan(repoRoot: string): Promise<{ total: number; documented: number; drifted: number; undocumented: number } | null> {
  const os = require("os") as typeof import("os");
  const tmpOut = path.join(os.tmpdir(), `wright-drift-${Date.now()}.json`);
  const cli = findWrightCli(repoRoot);
  if (!cli) return Promise.resolve(null);
  return runCli(cli, repoRoot, ["drift", repoRoot], tmpOut, true, 600_000).then(out => {
    if (!out) return null;
    try {
      const data = JSON.parse(fs.readFileSync(out, "utf8")) as { total: number; drifted: number; undocumented: number; up_to_date: number };
      try { fs.unlinkSync(out); } catch { /* ignore */ }
      const total = data.total ?? 0;
      const drifted = data.drifted ?? 0;
      const undocumented = data.undocumented ?? 0;
      const documented = (data.up_to_date ?? 0) + drifted;
      return { total, documented, drifted, undocumented };
    } catch { return null; }
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

  /** Immediately update just the Drifted row without re-running the CLI scan. */
  setDriftedCount(count: number): void {
    const idx = this._items.findIndex(i => i.label.startsWith("Drifted:"));
    if (idx >= 0) {
      this._items[idx] = { label: `Drifted: ${count}`, pct: count === 0 ? 100 : 0, description: "need regeneration" };
      this.refresh();
    }
  }

  async loadCoverage(): Promise<void> {
    // The workspace folder the user opened IS the project root — use it directly.
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) {
      this._items = [{ label: "Open a workspace to see coverage", pct: 0 }];
      this.refresh();
      return;
    }

    await new Promise<void>(resolve => setImmediate(resolve));

    // Use wright drift for all numbers — fast on reload due to LLM result cache.
    // First run is slow (LLM per documented function); subsequent runs hit the cache.
    const driftResult = await runDriftScan(repoRoot);

    if (driftResult) {
      const { total, documented, drifted, undocumented } = driftResult;
      const pct = total > 0 ? (documented / total) * 100 : 100;
      this._pct = pct;
      this._total = total;
      this._documented = documented;
      this._items = [
        { label: `Coverage: ${pct.toFixed(1)}%`,          pct,                                        description: `${total} functions` },
        { label: `Workspace: ${path.basename(repoRoot)}`,  pct: 100,                                   description: repoRoot },
        { label: `Documented: ${documented} / ${total}`,   pct,                                        description: "functions" },
        { label: `Undocumented: ${undocumented}`,          pct: undocumented === 0 ? 100 : 0,          description: "functions" },
        { label: `Drifted: ${drifted}`,                    pct: drifted === 0 ? 100 : 0,               description: "need regeneration" },
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
