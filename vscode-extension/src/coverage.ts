import * as vscode from "vscode";
import { getCoverage } from "./client";

interface CoverageItem {
  label: string;
  pct: number;
}

export class CoverageTreeProvider implements vscode.TreeDataProvider<CoverageItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CoverageItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _items: CoverageItem[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async loadCoverage(): Promise<void> {
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) return;

    try {
      const data = await getCoverage(repoRoot);
      this._items = [
        { label: `Overall: ${data.overall_pct.toFixed(1)}%`, pct: data.overall_pct },
        { label: `Total functions: ${data.total}`, pct: 100 },
        { label: `Documented: ${data.documented}`, pct: 100 },
      ];
    } catch {
      this._items = [{ label: "Could not connect to Wright API", pct: 0 }];
    }
    this.refresh();
  }

  getTreeItem(element: CoverageItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.iconPath =
      element.pct >= 80
        ? new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"))
        : new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
    return item;
  }

  getChildren(element?: CoverageItem): CoverageItem[] {
    if (element) return [];
    return this._items;
  }
}
