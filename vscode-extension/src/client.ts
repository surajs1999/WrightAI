import * as vscode from "vscode";

/** Returns the Wright extension configuration (apiUrl, apiKey, style) from VS Code workspace settings. */
function getConfig() {
  const cfg = vscode.workspace.getConfiguration("wright");
  return {
    apiUrl: cfg.get<string>("apiUrl", "https://api.wrightai.live"),
    apiKey: cfg.get<string>("apiKey", ""),
    style: cfg.get<string>("style", "google"),
  };
}

/**
 * Returns the documentation style for a specific language, falling back to the global style setting.
 *
 * @param languageId - The programming language identifier (e.g., "javascript", "typescript", "rust").
 * @returns The documentation style string for the specified language (e.g., "jsdoc", "rust", "google").
 */
/**
 * Determines the appropriate documentation style for a given programming language based on VSCode workspace configuration and sensible defaults.
 *
 * Queries the workspace configuration for a language-specific style setting (wright.style.<languageId>). If no specific style is configured, returns language-specific defaults (jsdoc for JavaScript/TypeScript, rust for Rust) or falls back to the general style setting (defaulting to google).
 *
 * @param {string} languageId - The identifier of the programming language (e.g., 'javascript', 'typescript', 'rust').
 * @returns {string} The documentation style identifier to use for the specified language (e.g., 'jsdoc', 'rust', 'google').
 * @example
 * const style = getStyleForLanguage('typescript'); // returns 'jsdoc'
 */
/**
 * Resolves the documentation style string for a given VS Code language identifier based on workspace configuration and built-in language defaults.
 *
 * Looks up the Wright extension configuration for a language-specific style setting (e.g., `style.typescript`). If no explicit override is found, it applies sensible defaults: 'jsdoc' for JavaScript and TypeScript, 'rust' for Rust, and falls back to the global `style` setting (defaulting to 'google') for all other languages.
 *
 * @param {string} languageId - The VS Code language identifier for the active file (e.g., 'typescript', 'python', 'rust').
 * @returns {string} The documentation style string to use (e.g., 'jsdoc', 'rust', 'google') for generating docstrings in the specified language.
 * @example
 * const style = getStyleForLanguage('typescript'); // Returns 'jsdoc'
 * const style2 = getStyleForLanguage('python');     // Returns 'google' (or user-configured value)
 */


export function getStyleForLanguage(languageId: string): string {
  const cfg = vscode.workspace.getConfiguration("wright");
  const langKey = `style.${languageId}` as const;
  const langStyle = cfg.get<string>(langKey);
  if (langStyle) return langStyle;
  // Sensible defaults per language even if not explicitly set
  if (languageId === "javascript" || languageId === "typescript") return "jsdoc";
  if (languageId === "rust") return "rust";
  return cfg.get<string>("style", "google");
}

 /**
 * Builds and returns the HTTP headers required for API requests, conditionally including the API key.
 *
 * Retrieves the current configuration via getConfig() and constructs a headers object with 'Content-Type' set to 'application/json'. If an API key is present in the configuration, it is added as the 'X-Wright-API-Key' header. This function is used internally by generateDocstring(), getCoverage(), checkDrift(), and streamChat() to ensure consistent header construction across all API calls.
 * @returns {HeadersInit} A record of HTTP header key-value pairs, always containing 'Content-Type: application/json' and optionally 'X-Wright-API-Key' if an API key is configured.
 * @example
 * const headers = buildHeaders();
 * // Result (with API key): { 'Content-Type': 'application/json', 'X-Wright-API-Key': 'my-secret-key' }
 * // Result (without API key): { 'Content-Type': 'application/json' }
 */


function buildHeaders(): HeadersInit {
  const { apiKey } = getConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Wright-API-Key"] = apiKey;
  }
  return headers;
}

/**
 * Inspects a fetch Response for quota warning/exceeded headers or 429/403 status,
 * surfaces a VS Code notification, and re-throws when the request should be blocked.
 */
export async function handleQuotaResponse(resp: Response): Promise<void> {
  if (resp.status === 429 || resp.status === 403) {
    let detail: { message?: string; feature?: string; upgrade_url?: string } = {};
    try {
      detail = await resp.clone().json().then((b: { detail?: typeof detail }) => b.detail ?? {});
    } catch { /* ignore */ }

    const msg = detail.message ?? "You've reached your plan quota. Upgrade to Pro to continue.";
    const action = await vscode.window.showErrorMessage(
      `Wright AI: ${msg}`,
      "Upgrade to Pro",
      "Dismiss",
    );
    if (action === "Upgrade to Pro") {
      vscode.env.openExternal(vscode.Uri.parse("https://www.wrightai.live/pricing"));
    }
    throw new Error(`quota_exceeded:${resp.status}`);
  }

  // Soft warning — show status bar message, don't block
  if (resp.headers.get("X-Wright-Quota-Warning") === "true") {
    const pct = resp.headers.get("X-Wright-Usage-Pct") ?? "?";
    vscode.window.setStatusBarMessage(
      `$(warning) Wright AI: ${pct}% of monthly quota used — upgrade soon`,
      8000,
    );
  }
}

/**
 * Checks the health status of the API server by making a GET request to the health endpoint.
 *
 * Performs a health check by sending an HTTP GET request to the API's /health endpoint. Returns true if the endpoint responds with an OK status (2xx), and false if the request fails or the response is not OK. This function is used during API server startup to verify connectivity and availability.
 * @returns {Promise<boolean>} A promise that resolves to true if the health endpoint responds with an OK status, false otherwise (including network errors or non-OK responses).
 * @example
 * const isHealthy = await checkHealth();
 */
/**
 * Checks the health of the API server by sending a GET request to its health endpoint and returning whether the server is responsive.
 *
 * Retrieves the configured API URL via getConfig(), then performs an HTTP GET request to the '/health' endpoint. Returns true if the server responds with an OK status, or false if the response is not OK or if any network/fetch error occurs. This function is called by startApiServer() to verify server availability.
 * @returns {Promise<boolean>} Resolves to true if the API server's /health endpoint responds with an HTTP OK status (2xx), or false if the response indicates an error or if a network exception is thrown.
 * @example
 * const isHealthy = await checkHealth();
 * if (isHealthy) {
 *   console.log('API server is up and running.');
 * } else {
 *   console.warn('API server is not reachable.');
 * }
 */

export async function checkHealth(): Promise<boolean> {
  const { apiUrl } = getConfig();
  try {
    const resp = await fetch(`${apiUrl}/health`, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Generates a docstring for a function by calling the API, supporting dry-run preview and actual injection.
 *
 * @param filePath - Path to the file containing the function.
 * @param functionName - Name of the function to document.
 * @param repoRoot - Root directory of the repository.
 * @param dryRun - When true, generates a preview without injecting.
 * @param languageId - Programming language identifier used to determine doc style.
 * @param snippet - Optional code snippet for additional context.
 */
/**
 * Generates a docstring for a specified function by sending a request to the documentation API.
 *
 * This asynchronous function constructs and sends a POST request to the API's generate endpoint with function metadata and repository context. It returns a response containing the generated docstring preview, injection details, and success status. The function supports both dry-run mode (preview only) and actual injection.
 *
 * @param {string} filePath - The absolute or relative path to the source file containing the function.
 * @param {string} functionName - The name of the function for which to generate documentation.
 * @param {string} repoRoot - The root directory path of the repository for context resolution.
 * @param {boolean} dryRun - When true, generates a preview without injecting the docstring into the file. Defaults to true.
 * @param {string} languageId - The programming language identifier (e.g., 'python', 'typescript') for determining documentation style. Defaults to 'python'.
 * @param {string | undefined} snippet - Optional code snippet to provide additional context for docstring generation.
 * @returns {Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }>} A promise that resolves to an object containing the generation success status, generated docstring preview text, the line number where the docstring was injected (if applicable), and any error message.
 * @throws {Error} When the API request fails with a non-OK HTTP status code.
 * @example
 * const result = await generateDocstring('/src/utils.ts', 'formatDate', '/project', false, 'typescript', 'function formatDate(date: Date): string { ... }')
 */
 /**
  * Sends a POST request to the docstring generation API and returns the generated docstring along with injection metadata.
  *
  * Constructs a JSON payload containing the target file path, function name, repository root, documentation style (derived from the language ID), and an optional code snippet, then posts it to the configured API endpoint. If `dryRun` is true, the API previews the docstring without writing it to disk. Called by `activate()` and `generateAndInject()` to drive the core documentation workflow.
  *
  * @param {string} filePath - Absolute or workspace-relative path to the source file containing the target function.
  * @param {string} functionName - Name of the function for which the docstring should be generated.
  * @param {string} repoRoot - Absolute path to the root of the repository, used by the API for broader code context.
  * @param {boolean} dryRun - When true (default), the API returns a preview without modifying the source file.
  * @param {string} languageId - VS Code language identifier (e.g. 'python', 'typescript') used to select the appropriate docstring style via `getStyleForLanguage()`.
  * @param {string} snippet - Optional raw source snippet of the function body sent to the API for more accurate docstring generation.
  * @returns {Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }>} Resolves to an object where `success` indicates whether generation succeeded, `preview` holds the generated docstring text (or null), `injected_at_line` is the 1-based line number where the docstring was (or would be) inserted, and `error` contains an error message if generation failed.
  * @throws {Error} Thrown when the API responds with a non-OK HTTP status (e.g. 4xx or 5xx), with a message of the form 'API error: <status> <statusText>'.
  * @example
  * const result = await generateDocstring(
  *   '/workspace/src/utils.py',
  *   'calculate_total',
  *   '/workspace',
  *   true,
  *   'python',
  *   'def calculate_total(items): return sum(items)'
  * );
  * console.log(result.preview); // prints the generated docstring
  */

export async function generateDocstring(
  filePath: string,
  functionName: string,
  repoRoot: string,
  dryRun: boolean = true,
  languageId: string = "python",
  snippet?: string
): Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }> {
  const { apiUrl } = getConfig();
  const style = getStyleForLanguage(languageId);
  const resp = await fetch(`${apiUrl}/generate`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      file_path: filePath,
      function_name: functionName,
      repo_root: repoRoot,
      style,
      dry_run: dryRun,
      ...(snippet ? { snippet } : {}),
    }),
  });
  await handleQuotaResponse(resp);
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }>;
}

/**
 * Fetches documentation coverage statistics for a given repository root from the coverage API endpoint.
 *
 * Makes an HTTP GET request to the coverage API with the repository root path as a query parameter, retrieves configuration and builds authentication headers, then returns an object containing the overall coverage percentage, total items count, and documented items count.
 *
 * @param {string} repoRoot - The absolute or relative path to the repository root directory for which to retrieve coverage statistics.
 * @returns {Promise<{ overall_pct: number; total: number; documented: number }>} A promise that resolves to an object containing coverage metrics: overall_pct (the percentage of documented items), total (the total number of items), and documented (the number of documented items).
 * @throws {Error} When the coverage API request fails with a non-OK HTTP status code.
 * @example
 * const coverage = await getCoverage('/path/to/my/project');
 */
/**
 * Fetches documentation coverage statistics for a given repository root from the coverage API.
 *
 * Makes an authenticated GET request to the configured API endpoint to retrieve documentation coverage metrics for the specified repository. Returns an object containing the overall coverage percentage, total number of items, and the count of documented items. Throws an error if the API responds with a non-OK HTTP status.
 *
 * @param {string} repoRoot - The absolute or relative path to the root of the repository for which coverage statistics are being requested.
 * @returns {Promise<{ overall_pct: number; total: number; documented: number }>} A promise that resolves to an object with `overall_pct` (overall documentation coverage as a percentage), `total` (total number of documentable items), and `documented` (number of items that are documented).
 * @throws {Error} Thrown when the coverage API responds with a non-OK HTTP status code (e.g., 404, 500), with the message including the HTTP status code.
 * @example
 * const coverage = await getCoverage('/home/user/my-project');
 * console.log(`Coverage: ${coverage.overall_pct}% (${coverage.documented}/${coverage.total} documented)`);
 */

export async function getCoverage(
  repoRoot: string
): Promise<{ overall_pct: number; total: number; documented: number }> {
  const { apiUrl } = getConfig();
  const resp = await fetch(`${apiUrl}/coverage?repo_root=${encodeURIComponent(repoRoot)}`, {
    headers: buildHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Coverage API error: ${resp.status}`);
  }
  return resp.json() as Promise<{ overall_pct: number; total: number; documented: number }>;
}

/**
 * Checks for documentation drift and undocumented functions by querying the drift-check API.
 *
 * @param repoRoot - Absolute path to the root directory of the repository to check.
 * @returns Counts of drifted and undocumented functions along with per-function details.
 */
/**
 * Checks for documentation drift by comparing the current repository state against the previous commit.
 *
 * Sends a POST request to the drift-check API endpoint to analyze changes since HEAD~1 and identify functions that have drifted from their documentation or remain undocumented.
 *
 * @param {string} repoRoot - The absolute path to the root directory of the repository to check for drift.
 * @returns {Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string }> }>} A promise resolving to an object containing the count of drifted functions, undocumented functions, and an array of detailed results for each analyzed function.
 * @throws {Error} When the drift check API returns a non-ok HTTP status code.
 * @example
 * const result = await checkDrift('/Users/user/my-project'); console.log(`Found ${result.drifted} drifted functions`);
 */
/**
 * Sends a POST request to the drift-check API endpoint to identify drifted or undocumented functions in a repository since the last commit.
 *
 * Retrieves the API URL and authorization headers via getConfig() and buildHeaders(), then posts the repository root path and a git reference ('HEAD~1') to the remote drift-check service. Parses and returns the JSON response containing counts of drifted and undocumented functions along with per-function details.
 *
 * @param {string} repoRoot - The absolute path to the root of the repository to be analyzed for documentation drift.
 * @returns {Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string }> }>} A promise that resolves to an object containing the count of drifted functions, the count of undocumented functions, and an array of result objects each describing a function's name, file path, and drift status.
 * @throws {Error} Thrown when the drift-check API responds with a non-OK HTTP status code, with the message including the status code.
 * @example
 * const driftReport = await checkDrift('/home/user/projects/my-repo');
 * console.log(`Drifted: ${driftReport.drifted}, Undocumented: ${driftReport.undocumented}`);
 * driftReport.results.forEach(r => console.log(r.function_name, r.file_path, r.status));
 */

/**
 * Checks documentation drift for a single file by sending its content to the API.
 * Uses the server-side ANTHROPIC_API_KEY — no local key required.
 */
export async function checkFileDrift(
  fileContent: string,
  language: string,
  filePath: string,
): Promise<{ results: Array<{ function_name: string; file_path: string; status: string; reason?: string; line?: number }> }> {
  const { apiUrl } = getConfig();
  const resp = await fetch(`${apiUrl}/drift-check/file`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ file_content: fileContent, file_path: filePath, language }),
  });
  await handleQuotaResponse(resp);
  if (!resp.ok) {
    throw new Error(`Drift file check API error: ${resp.status}`);
  }
  return resp.json() as Promise<{ results: Array<{ function_name: string; file_path: string; status: string; reason?: string; line?: number }> }>;
}

export async function checkDrift(
  repoRoot: string,
  filePath?: string,
): Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string; line?: number }> }> {
  const { apiUrl } = getConfig();
  const resp = await fetch(`${apiUrl}/drift-check`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ repo_root: repoRoot, ...(filePath ? { file_path: filePath } : {}) }),
  });
  if (!resp.ok) {
    throw new Error(`Drift check API error: ${resp.status}`);
  }
  return resp.json() as Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string; line?: number }> }>;
}

/**
 * Streams chat responses from the API as Server-Sent Events.
 *
 * @param question - The user's chat question or prompt.
 * @param repoRoot - Root directory path of the repository context.
 * @param history - Optional conversation history array with prior messages.
 */
/**
 * Streams chat responses from the API server-sent events endpoint as an async generator of typed message objects.
 *
 * Establishes a streaming connection to the chat API endpoint and yields parsed JSON objects from server-sent events (SSE). The function buffers incoming data, splits by newlines, and parses lines starting with 'data:' as JSON. Streaming continues until the '[DONE]' marker is received or the stream ends. Malformed SSE lines are silently skipped.
 *
 * @param {string} question - The user's question or prompt to send to the chat API.
 * @param {string} repoRoot - The root directory path of the repository being queried.
 * @param {Array<{ role: string; content: string }>} history - The conversation history array containing previous messages with role and content properties. Defaults to an empty array.
 * @returns {AsyncGenerator<{ type: string; content?: string; files?: string[]; questions?: string[] }>} An async generator that yields objects containing a type field and optional content, files, or questions fields depending on the message type from the API.
 * @throws {Error} When the chat API request fails with a non-OK status or response body is unavailable.
 * @example
 * for await (const message of streamChat('How does auth work?', '/path/to/repo', [])) { console.log(message.type, message.content); }
 */
 /**
 * Streams chat responses from the backend API as an async generator yielding parsed Server-Sent Events (SSE) chunks.
 *
 * Sends a POST request to the configured chat API endpoint with the user's question, repository root, and conversation history. The response body is consumed as a readable stream; incoming bytes are buffered, split on newlines, and each `data:` SSE line is JSON-parsed and yielded to the caller. Streaming terminates when the `[DONE]` sentinel is received or the stream is exhausted. Malformed SSE lines are silently skipped.
 *
 * @param {string} question - The user's chat message or query to send to the backend.
 * @param {string} repoRoot - Absolute path to the root of the repository being analysed, forwarded to the API as `repo_root`.
 * @param {Array<{ role: string; content: string }>} history - Prior conversation turns (role/content pairs) sent as `conversation_history` to give the model context. Defaults to an empty array.
 * @returns {AsyncGenerator<{ type: string; content?: string; files?: string[]; questions?: string[] }>} An async generator that yields parsed SSE event objects. Each object includes a mandatory `type` field and optional fields: `content` (text chunk), `files` (referenced file paths), and `questions` (suggested follow-up questions).
 * @throws {Error} Thrown with the message `Chat API error: <status>` when the HTTP response status is not OK or the response body is absent.
 * @example
 * for await (const chunk of streamChat('What does AuthService do?', '/workspace/my-repo', [{ role: 'user', content: 'Hello' }])) {
 *   if (chunk.type === 'token' && chunk.content) {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 */


/**
 * Pushes per-function drift results to the API's drift_results table (fire-and-forget).
 * Called after each local CLI drift run so the dashboard sees results without a second LLM pass.
 * Entries that carry src_hash/doc_hash also get mirrored into the shared drift_llm_cache
 * L2 cache, so cold-start containers and other users skip a redundant LLM call.
 */
/**
 * Posts local drift results to the dashboard sync endpoint.
 *
 * Fire-and-forget by design — never throws. Returns "auth_failed" when the
 * configured API key was rejected outright (401) or isn't linked to a
 * dashboard account (the `{ ok: false, error: "unresolvable api key" }` the
 * server returns for valid CLI/static keys with no Supabase user), so callers
 * can warn the user that drift results aren't syncing. Returns "ok" otherwise,
 * including on network errors.
 */
export async function syncDriftResults(
  apiUrl: string,
  apiKey: string,
  repoName: string,
  results: Array<{ file_path: string; func_name: string; status: string; reason?: string; src_hash?: string; doc_hash?: string }>
): Promise<"ok" | "auth_failed"> {
  if (!apiKey || !results.length) return "ok";
  try {
    const resp = await fetch(`${apiUrl}/drift-check/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Wright-API-Key": apiKey },
      body: JSON.stringify({ repo_name: repoName, results }),
    });
    if (resp.status === 401) return "auth_failed";
    const body = (await resp.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (body?.ok === false && body.error === "unresolvable api key") return "auth_failed";
    return "ok";
  } catch {
    // fire-and-forget — never block the editor
    return "ok";
  }
}

export async function* streamChat(
  question: string,
  repoRoot: string,
  history: Array<{ role: string; content: string }> = []
): AsyncGenerator<{ type: string; content?: string; files?: string[]; questions?: string[] }> {
  const { apiUrl } = getConfig();
  const resp = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ question, repo_root: repoRoot, conversation_history: history }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`Chat API error: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          yield JSON.parse(data) as { type: string; content?: string; files?: string[]; questions?: string[] };
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}
