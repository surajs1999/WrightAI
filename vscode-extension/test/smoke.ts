/**
 * Smoke test — runs with ts-node + tsconfig-paths, no VS Code process needed.
 * The test/tsconfig.json maps "vscode" → test/vscode-mock so all src imports work.
 */

import { langExt, insertPreviewIntoSource } from "../src/injector";
import { hasDocstring } from "../src/gutter";
import { extractDocstringAfterLine } from "../src/hover";
import { getStyleForLanguage } from "../src/client";

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

/**
 * Compares actual and expected values using JSON serialization and logs the result with a pass/fail indicator.
 *
 * Performs an assertion-style check by comparing two values after JSON stringification. Logs a success message with a checkmark (✅) if values match, or an error message with detailed expected vs actual output if they differ. Updates global passed and failed counters accordingly.
 *
 * @param {string} label - A descriptive label for the test case that will be displayed in the output.
 * @param {unknown} actual - The actual value produced by the code being tested.
 * @param {unknown} expected - The expected value that the actual value should match.
 * @returns {void} This function does not return a value; it performs side effects by logging to console and updating global counters.
 * @example
 * expect('should return sum', calculator.add(2, 3), 5)
 */
/**
 * Compares actual and expected values using JSON serialization and logs the result with a pass/fail indicator.
 *
 * This function performs an assertion-style check by comparing two values after JSON stringification. It logs a success message with a checkmark if values match, or an error message with detailed expected vs actual output if they differ. It also increments global passed or failed counters accordingly.
 *
 * @param {string} label - A descriptive label for the test case that will be displayed in the output.
 * @param {unknown} actual - The actual value produced by the code being tested.
 * @param {unknown} expected - The expected value that the actual value should match.
 * @returns {void} This function does not return a value; it performs side effects by logging to console and updating global counters.
 * @example
 * expect('should return sum', calculator.add(2, 3), 5)
 */
function expect(label: string, actual: unknown, expected: unknown): void {
"""
Compares actual and expected values using JSON serialization and logs the result with a pass/fail indicator.

This function performs an assertion-style check by comparing two values after JSON stringification. It logs a success message with a checkmark if values match, or an error message with detailed expected vs actual output if they differ. It also increments global passed or failed counters accordingly.

Args:
    label (string): A descriptive label for the test case that will be displayed in the output.
    actual (unknown): The actual value produced by the code being tested.
    expected (unknown): The expected value that the actual value should match.

Returns:
    void: This function does not return a value; it performs side effects by logging to console and updating global counters.

Example:
    ```
    expect('should return sum', calculator.add(2, 3), 5)
    ```
"""
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    console.error(`       expected: ${JSON.stringify(expected)}`);
    console.error(`       actual  : ${JSON.stringify(actual)}`);
    failed++;
  }
}

function section(name: string): void {
  console.log(`\n── ${name} ${"─".repeat(Math.max(0, 50 - name.length))}`);
}

// ═══════════════════════════════════════════════════════════════════════════
section("langExt");
expect("python  → py",    langExt("python"),     "py");
expect("javascript → js", langExt("javascript"), "js");
expect("typescript → ts", langExt("typescript"), "ts");
expect("java → java",     langExt("java"),       "java");
expect("go → go",         langExt("go"),         "go");
expect("rust → rs",       langExt("rust"),       "rs");
expect("unknown → txt",   langExt("cobol"),      "txt");

// ═══════════════════════════════════════════════════════════════════════════
section("getStyleForLanguage (defaults when no config)");
expect("js  → jsdoc",   getStyleForLanguage("javascript"), "jsdoc");
expect("ts  → jsdoc",   getStyleForLanguage("typescript"),  "jsdoc");
expect("rust → rust",   getStyleForLanguage("rust"),        "rust");
expect("py  → google",  getStyleForLanguage("python"),      "google");
expect("go  → google",  getStyleForLanguage("go"),          "google");
expect("java → google", getStyleForLanguage("java"),        "google");

// ═══════════════════════════════════════════════════════════════════════════
section("hasDocstring — Python");
expect("triple-quote detected",
  hasDocstring(["def foo():", '    """Docs."""'], 0, "python"), true);
expect("single-quote detected",
  hasDocstring(["def foo():", "    '''Docs.'''"], 0, "python"), true);
expect("no docstring → false",
  hasDocstring(["def foo():", "    pass"], 0, "python"), false);
expect("empty file (no next line) → false",
  hasDocstring(["def foo():"], 0, "python"), false);

section("hasDocstring — JavaScript / TypeScript");
expect("/** above function detected",
  hasDocstring(["/** Say hello. */", "function hello() {", "}"], 1, "javascript"), true);
expect("* (multi-line jsdoc) detected",
  hasDocstring([" * @param x", "function foo(x) {"], 1, "javascript"), true);
expect("no jsdoc → false",
  hasDocstring(["function hello() {", "}"], 0, "javascript"), false);

section("hasDocstring — Go");
expect("// comment detected",
  hasDocstring(["// Foo does foo.", "func Foo() {", "}"], 1, "go"), true);
expect("no comment → false",
  hasDocstring(["func Foo() {", "}"], 0, "go"), false);

section("hasDocstring — Rust");
expect("/// comment detected",
  hasDocstring(["/// Does bar.", "fn bar() {", "}"], 1, "rust"), true);
expect("// (not ///) → false",
  hasDocstring(["// plain", "fn bar() {"], 1, "rust"), false);

// ═══════════════════════════════════════════════════════════════════════════
section("extractDocstringAfterLine — Python");
expect("single-line triple-quote",
  extractDocstringAfterLine(["def foo():", '    """Return 42."""'], 0, "python"),
  "Return 42.");
expect("no docstring → null",
  extractDocstringAfterLine(["def foo():", "    pass"], 0, "python"), null);
expect("multi-line triple-quote returns non-null",
  extractDocstringAfterLine(
    ["def foo():", '    """', "    Line one.", "    Line two.", '    """'],
    0, "python") !== null, true);

section("extractDocstringAfterLine — Go");
expect("// comment extracted",
  extractDocstringAfterLine(["// Foo does foo.", "func Foo() {"], 1, "go"),
  "Foo does foo.");
expect("no comment → null",
  extractDocstringAfterLine(["func Foo() {"], 0, "go"), null);

section("extractDocstringAfterLine — Rust");
expect("/// extracted",
  extractDocstringAfterLine(["/// Does bar.", "fn bar() {"], 1, "rust"),
  "Does bar.");
expect("multi-line /// joined",
  extractDocstringAfterLine(["/// Line one.", "/// Line two.", "fn bar() {"], 2, "rust"),
  "Line one. Line two.");
expect("no /// → null",
  extractDocstringAfterLine(["fn bar() {"], 0, "rust"), null);

section("extractDocstringAfterLine — JS/TS JSDoc");
const jsDoc = ["/**", " * Say hello.", " */", "function hello() {"];
expect("/** */ block extracted",
  extractDocstringAfterLine(jsDoc, 3, "javascript"), "Say hello.");
expect("no jsdoc → null",
  extractDocstringAfterLine(["function hello() {"], 0, "javascript"), null);

// ═══════════════════════════════════════════════════════════════════════════
section("insertPreviewIntoSource — Python");
const pySrc = "def add(a, b):\n    return a + b";
const pyOut = insertPreviewIntoSource(pySrc, "add", '"""Add two numbers."""', "python");
expect("docstring inserted after def",   pyOut.includes('"""Add two numbers."""'), true);
expect("body preserved",                 pyOut.includes("return a + b"),           true);
expect("def line preserved",             pyOut.includes("def add(a, b):"),          true);
expect("docstring comes before body",    pyOut.indexOf('"""') < pyOut.indexOf("return"), true);

const pyAsync = "async def fetch(url):\n    pass";
expect("async def handled",
  insertPreviewIntoSource(pyAsync, "fetch", '"""Fetch URL."""', "python")
    .includes('"""Fetch URL."""'), true);

const pyIndented = "class Foo:\n    def bar(self):\n        pass";
expect("indented method handled",
  insertPreviewIntoSource(pyIndented, "bar", '"""Bar."""', "python")
    .includes('"""Bar."""'), true);

section("insertPreviewIntoSource — JavaScript");
const jsSrc = "function greet(name) {\n  return `Hi ${name}`;\n}";
const jsOut = insertPreviewIntoSource(jsSrc, "greet", "/** Greet. */", "javascript");
expect("jsdoc inserted",           jsOut.includes("/** Greet. */"), true);
expect("body preserved",           jsOut.includes("return `Hi ${name}`"), true);

section("insertPreviewIntoSource — TypeScript");
const tsSrc = "async function load(id: number) {\n  return id;\n}";
expect("ts async function",
  insertPreviewIntoSource(tsSrc, "load", "/** Load. */", "typescript")
    .includes("/** Load. */"), true);

section("insertPreviewIntoSource — Go");
const goSrc = "func Mul(a, b int) int {\n\treturn a * b\n}";
expect("go func doc",
  insertPreviewIntoSource(goSrc, "Mul", "// Mul returns a*b.", "go")
    .includes("// Mul returns a*b."), true);

const goMethod = "func (r *Repo) Save() error {\n\treturn nil\n}";
expect("go method",
  insertPreviewIntoSource(goMethod, "Save", "// Save persists.", "go")
    .includes("// Save persists."), true);

section("insertPreviewIntoSource — Rust");
const rustSrc = "pub fn square(x: i32) -> i32 {\n    x * x\n}";
expect("rust pub fn",
  insertPreviewIntoSource(rustSrc, "square", "/// Returns x².", "rust")
    .includes("/// Returns x²."), true);

const rustAsync = "pub async fn fetch(url: &str) -> String {\n    String::new()\n}";
expect("rust pub async fn",
  insertPreviewIntoSource(rustAsync, "fetch", "/// Fetches URL.", "rust")
    .includes("/// Fetches URL."), true);

section("insertPreviewIntoSource — fallbacks");
expect("unknown language returns source unchanged",
  insertPreviewIntoSource("some code", "foo", "# doc", "ruby"), "some code");
expect("function not found prepends",
  insertPreviewIntoSource("def other():\n    pass", "missing", '"""doc"""', "python")
    .startsWith('"""doc"""'), true);

// ═══════════════════════════════════════════════════════════════════════════
section("Regex patterns — all 6 languages");

const PATTERNS: Record<string, RegExp> = {
  python:     /^(\s*)(async\s+)?def\s+(\w+)\s*\(/gm,
  javascript: /^(\s*)(async\s+)?function\s+(\w+)\s*\(/gm,
  typescript: /^(\s*)(async\s+)?function\s+(\w+)\s*\(/gm,
  java:       /^\s*(public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{/gm,
  go:         /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm,
  rust:       /^(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/gm,
};

function extractName(lang: string, source: string): string | null {
  const p = PATTERNS[lang]; p.lastIndex = 0;
  const m = p.exec(source);
  if (!m) return null;
  return (m[3] ?? m[2] ?? m[1] ?? null) as string | null;
}

expect("python def",             extractName("python",     "def foo(a, b):"),           "foo");
expect("python async def",       extractName("python",     "async def bar():"),          "bar");
expect("python indented def",    extractName("python",     "    def baz(self):"),        "baz");
expect("js function",            extractName("javascript", "function greet(name) {"),   "greet");
expect("js async function",      extractName("javascript", "async function load() {"),  "load");
expect("ts function",            extractName("typescript", "function render(): void {"),"render");
expect("go func",                extractName("go",         "func Add(a, b int) int {"), "Add");
expect("go method receiver",     extractName("go",         "func (r *Repo) Save() {"),  "Save");
expect("rust fn",                extractName("rust",       "fn compute(x: i32) {"),     "compute");
expect("rust pub fn",            extractName("rust",       "pub fn new() -> Self {"),   "new");
expect("rust pub async fn",      extractName("rust",       "pub async fn fetch() {"),   "fetch");

const javaP = PATTERNS["java"]; javaP.lastIndex = 0;
const javaM = javaP.exec("  public int getValue() {");
"""
Parses a raw Server-Sent Events (SSE) string and yields JSON objects from each data line.

Iterates through lines in the raw SSE response string, extracting and parsing JSON data from lines prefixed with 'data: '. Stops processing when encountering the '[DONE]' sentinel value. Silently skips lines that fail JSON parsing.

Args:
    raw (string): The raw SSE response string containing newline-separated event data.

Returns:
    Generator<Record<string, unknown>>: A generator that yields parsed JSON objects as key-value records from valid SSE data lines.

Example:
    ```
    for (const event of parseSse('data: {    """
    Filters elements by checking if their type property equals 'followups'.

    This is an arrow function predicate used as a filter callback to identify elements with a type property matching the string 'followups'.

    Args:
        e (unknown): The element to check, expected to have a type property.

    Returns:
        boolean: True if the element's type property equals 'followups', false otherwise.

    Example:
        ```
        const followupElements = elements.filter(e => e.type === "followups")
        ```

    Complexity: O(1) time, O(1) space
    """
"id":"1","text":"hello"}\ndata: [DONE]')) { console.log(event); }
    ```

Complexity: O(n) time where n is the number of characters in the input string, O(1) space for the generator state
"""
expect("java method name in group 2", javaM ? javaM[2] : null, "getValue");

const javaStaticP = PATTERNS["java"]; javaStaticP.lastIndex = 0;
const javaStaticM = javaStaticP.exec("  public static void main(String[] args) {");
expect("java static method", javaStaticM ? javaStaticM[2] : null, "main");

// ═══════════════════════════════════════════════════════════════════════════
section("SSE stream parser (client.ts logic)");

function* parseSse(raw: string): Generator<Record<string, unknown>> {
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") return;
    try { yield JSON.parse(data) as Record<string, unknown>; } catch { /* skip */ }
  }
}

const sse = [
  `data: {"type":"token","content":"Hello"}`,
  `data: {"type":"token","content":" world"}`,
  `data: {"type":"citations","files":["src/foo.py"]}`,
  `data: {"type":"followups","questions":["What next?"]}`,
  `data: [DONE]`,
  `data: {"type":"token","content":"after done — must be ignored"}`,
].join("\n");

const events = [...parseSse(sse)];
expect("2 token events",        events.filter(e => e.type === "token").length,   2);
expect("citations parsed",      (events.find(e => e.type === "citations") as {files: string[]})?.files, ["src/foo.py"]);
expect("followups parsed",      (events.find(e => e.type === "followups") as {questions: string[]})?.questions, ["What next?"]);
expect("[DONE] stops at 4",     events.length,                                   4);
expect("malformed line skipped", [...parseSse("data: {bad}\ndata: {\"type\":\"token\",\"content\":\"ok\"}")].length, 1);

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(58)}`);
const status = failed === 0 ? "✅ ALL PASSED" : `❌ ${failed} FAILED`;
console.log(`  ${status} — ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(58)}\n`);
if (failed > 0) process.exit(1);
