import * as vscode from "vscode";

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("wright");
  return {
    apiUrl: cfg.get<string>("apiUrl", "http://localhost:8765"),
    apiKey: cfg.get<string>("apiKey", ""),
    style: cfg.get<string>("style", "google"),
  };
}

function buildHeaders(): HeadersInit {
  const { apiKey } = getConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Wright-API-Key"] = apiKey;
  }
  return headers;
}

export async function checkHealth(): Promise<boolean> {
  const { apiUrl } = getConfig();
  try {
    const resp = await fetch(`${apiUrl}/health`, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function generateDocstring(
  filePath: string,
  functionName: string,
  repoRoot: string,
  dryRun: boolean = true
): Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }> {
  const { apiUrl, style } = getConfig();
  const resp = await fetch(`${apiUrl}/generate`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      file_path: filePath,
      function_name: functionName,
      repo_root: repoRoot,
      style,
      dry_run: dryRun,
    }),
  });
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<{ success: boolean; preview: string | null; injected_at_line: number | null; error: string | null }>;
}

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

export async function* streamChat(
  question: string,
  repoRoot: string
): AsyncGenerator<{ type: string; content?: string; files?: string[] }> {
  const { apiUrl } = getConfig();
  const resp = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ question, repo_root: repoRoot }),
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
          yield JSON.parse(data) as { type: string; content?: string; files?: string[] };
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}
