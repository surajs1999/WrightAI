import * as vscode from "vscode";

/** Returns the Wright extension configuration (apiUrl, apiKey, style) from VS Code workspace settings. */
function getConfig() {
  const cfg = vscode.workspace.getConfiguration("wright");
  return {
    apiUrl: cfg.get<string>("apiUrl", "https://wrightai-api.fly.dev"),
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
 * Determines the documentation style to use for a given programming language.
 *
 * Retrieves the documentation style from the Wright VS Code extension configuration. First checks for a language-specific style setting, then falls back to sensible defaults for JavaScript, TypeScript, and Rust, and finally returns the global style setting or 'google' as the ultimate default.
 *
 * @param {string} languageId - The identifier of the programming language (e.g., 'javascript', 'typescript', 'rust').
 * @returns {string} The documentation style to use for the specified language (e.g., 'jsdoc', 'rust', 'google').
 * @example
 * const style = getStyleForLanguage('typescript'); // Returns 'jsdoc'
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
 * Builds HTTP headers for API requests, including content type and optional API key authentication.
 *
 * Constructs a HeadersInit object containing the required Content-Type header and conditionally adds the X-Wright-API-Key header if an API key is configured. This function is used by various client methods to authenticate and format API requests.
 * @returns {HeadersInit} An object containing HTTP headers with Content-Type set to application/json and X-Wright-API-Key included if an API key is configured.
 * @example
 * const headers = buildHeaders();
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
 * Checks the health status of the API server by making a GET request to the health endpoint.
 *
 * Performs a health check by sending an HTTP GET request to the API's /health endpoint. Returns true if the endpoint responds with an OK status (2xx), and false if the request fails or the response is not OK. This function is used during API server startup to verify connectivity and availability.
 * @returns {Promise<boolean>} A promise that resolves to true if the health endpoint responds with an OK status, false otherwise (including network errors or non-OK responses).
 * @example
 * const isHealthy = await checkHealth();
 */
/**
 * Checks the health status of the API server by sending a GET request to the /health endpoint.
 *
 * This function retrieves the API URL from the configuration, sends a GET request to the /health endpoint, and returns true if the response status is OK (2xx), or false if the request fails or returns a non-OK status.
 * @returns {Promise<boolean>} A promise that resolves to true if the API health check succeeds (HTTP 2xx response), or false if the request fails or returns a non-OK status.
 * @example
 * const isHealthy = await checkHealth();
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
 * Generates a docstring for a specified function by calling the API and returns the result with preview and injection details.
 *
 * Sends a POST request to the /generate endpoint with file path, function name, repository root, and documentation style information. The function can operate in dry-run mode to preview the docstring without writing it to the file. Optionally accepts a code snippet for context.
 *
 * @param {string} filePath - The path to the source file containing the function to document.
 * @param {string} functionName - The name of the function for which to generate documentation.
 * @param {string} repoRoot - The root directory path of the repository.
 * @param {boolean} dryRun - When true, generates a preview without writing to file; defaults to true.
 * @param {string} languageId - The programming language identifier for determining documentation style; defaults to 'python'.
 * @param {string | undefined} snippet - Optional code snippet to provide additional context for docstring generation.
 * @returns {Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }>} A promise resolving to an object containing success status, the generated docstring preview, the line number where it would be injected, and any error message.
 * @throws {Error} When the API request fails with a non-OK HTTP status code.
 * @example
 * const result = await generateDocstring('/src/utils.ts', 'calculateSum', '/project', false, 'typescript', 'function calculateSum(a, b) { return a + b; }');
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
 * Fetches documentation coverage statistics for a specified repository root from the API.
 *
 * Makes an HTTP GET request to the coverage endpoint with the repository root path as a query parameter, retrieves the documentation coverage metrics including the overall percentage, total items, and documented items count.
 *
 * @param {string} repoRoot - The root path of the repository for which to retrieve coverage statistics.
 * @returns {Promise<{ overall_pct: number; total: number; documented: number }>} A promise that resolves to an object containing overall_pct (overall percentage of documentation coverage), total (total number of items), and documented (number of documented items).
 * @throws {Error} When the API request fails with a non-OK HTTP status code.
 * @example
 * const coverage = await getCoverage('/path/to/my-project'); // Returns { overall_pct: 85.5, total: 100, documented: 85 }
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
 * Checks for drifted or undocumented functions in the repository by comparing against the previous commit.
 *
 * Sends a POST request to the drift-check API endpoint with the repository root path and compares changes since HEAD~1. Returns statistics about drifted and undocumented functions along with detailed results for each affected function.
 *
 * @param {string} repoRoot - The absolute path to the root directory of the repository to check for drift.
 * @returns {Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string }> }>} A promise that resolves to an object containing the count of drifted functions, count of undocumented functions, and an array of results with function names, file paths, and their drift status.
 * @throws {Error} When the drift check API returns a non-OK HTTP status code.
 * @example
 * const result = await checkDrift('/path/to/repo'); // { drifted: 2, undocumented: 1, results: [{ function_name: 'myFunc', file_path: 'src/app.ts', status: 'drifted' }] }
 */
export async function checkDrift(
  repoRoot: string
): Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string }> }> {
  const { apiUrl } = getConfig();
  const resp = await fetch(`${apiUrl}/drift-check`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ repo_root: repoRoot, since: "HEAD~1" }),
  });
  if (!resp.ok) {
    throw new Error(`Drift check API error: ${resp.status}`);
  }
  return resp.json() as Promise<{ drifted: number; undocumented: number; results: Array<{ function_name: string; file_path: string; status: string }> }>;
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
 * Streams chat responses from the API endpoint as server-sent events, yielding parsed JSON objects containing response data.
 *
 * Establishes a streaming connection to the chat API endpoint, processes the server-sent event (SSE) stream incrementally, and yields parsed JSON objects as they arrive. Handles partial data buffering and gracefully terminates when receiving the [DONE] signal or when the stream completes.
 *
 * @param {string} question - The user's question or prompt to send to the chat API.
 * @param {string} repoRoot - The root directory path of the repository context for the chat session.
 * @param {Array<{ role: string; content: string }>} history - The conversation history containing previous messages with role and content fields. Defaults to an empty array if not provided.
 * @returns {AsyncGenerator<{ type: string; content?: string; files?: string[]; questions?: string[] }>} An async generator that yields objects containing the response type and optional content, file references, or follow-up questions from the streaming API response.
 * @throws {Error} When the chat API returns a non-OK status code or the response body is unavailable.
 * @example
 * for await (const chunk of streamChat('Explain this function', '/path/to/repo', [])) { console.log(chunk.type, chunk.content); }
 */
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
