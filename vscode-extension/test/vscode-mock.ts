export const workspace = {
  getConfiguration: () => ({ get: (_k: string, d: unknown) => d }),
};
export const window = {};
export const Uri = { file: (p: string) => ({ fsPath: p }) };
export const ProgressLocation = {};
export const OverviewRulerLane = { Left: 1, Right: 2 };
export class ThemeColor { constructor(public id: string) {} }
export class ThemeIcon { constructor(public id: string) {} }
export const TreeItemCollapsibleState = { None: 0 };
export class TreeItem { constructor(public label: string) {} }
export class EventEmitter<T> { event = (_l: (e: T) => void) => {}; fire(_e?: T) {} }
export class Range { constructor(public start: unknown, public end: unknown) {} }
export class Position { constructor(public line: number, public character: number) {} }
