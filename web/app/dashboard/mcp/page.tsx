"use client";

import { ga } from "@/lib/ga";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnectedRepos } from "@/hooks/useConnectedRepos";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.wrightai.live";

type Tool = "claude" | "cursor" | "continue" | "windsurf";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "claude", label: "Claude Code", icon: "✦" },
  { id: "cursor", label: "Cursor", icon: "⌘" },
  { id: "continue", label: "Continue", icon: "▶" },
  { id: "windsurf", label: "Windsurf", icon: "〜" },
];

/**
 * Generates a JSON configuration string for integrating the Wright MCP server with a specified AI development tool.
 *
 * Produces tool-specific JSON configuration snippets for connecting to the Wright Model Context Protocol (MCP) server. Supports 'claude', 'cursor', 'continue', and 'windsurf' tools. For 'claude', 'cursor', and 'windsurf', the output follows the standard `mcpServers` schema. For 'continue', it uses the `experimental.modelContextProtocolServers` schema with an HTTP transport definition. Falls back to placeholder values if `apiKey` or `repoPath` are empty strings.
 *
 * @param {Tool} tool - The target AI development tool for which to generate the configuration. Accepted values are 'claude', 'cursor', 'continue', and 'windsurf'.
 * @param {string} apiKey - The Wright API key to embed in the configuration headers. Defaults to the placeholder string 'YOUR_API_KEY' if an empty or falsy value is provided.
 * @param {string} repoPath - The absolute path to the local repository root to embed in the configuration headers. Defaults to '/path/to/your/repo' if an empty or falsy value is provided.
 * @returns {string} A pretty-printed (2-space indented) JSON string containing the MCP server configuration tailored to the specified tool.
 * @example
 * const config = configFor('claude', 'sk-abc123', '/home/user/my-project');
 * console.log(config);
 * // {
 * //   "mcpServers": {
 * //     "wright": {
 * //       "url": "https://api.wright.dev/mcp",
 * //       "headers": {
 * //         "X-Wright-API-Key": "sk-abc123",
 * //         "X-Repo-Root": "/home/user/my-project"
 * //       }
 * //     }
 * //   }
 * // }
 */




function configFor(tool: Tool, apiKey: string, repoPath: string): string {
  const key = apiKey || "YOUR_API_KEY";
  const repo = repoPath || "/path/to/your/repo";

  const server = {
    url: `${API_URL}/mcp`,
    headers: { "X-Wright-API-Key": key, "X-Repo-Root": repo },
  };

  if (tool === "claude") {
    return JSON.stringify(
      { mcpServers: { wright: server } },
      null, 2
    );
  }
  if (tool === "cursor") {
    return JSON.stringify(
      { mcpServers: { wright: server } },
      null, 2
    );
  }
  if (tool === "continue") {
    return JSON.stringify(
      {
        experimental: {
          modelContextProtocolServers: [
            { transport: { type: "http", url: `${API_URL}/mcp`, requestOptions: { headers: { "X-Wright-API-Key": key, "X-Repo-Root": repo } } } },
          ],
        },
      },
      null, 2
    );
  }
  // windsurf
  return JSON.stringify(
    { mcpServers: { wright: server } },
    null, 2
  );
}

/**
 * Returns the filesystem configuration file path for a given MCP-supported tool.
 *
 * Maps a Tool identifier to its corresponding MCP configuration file path string, providing the expected location where the tool reads its MCP server configuration. For Claude, an alternative CLI command is also included in the returned string.
 *
 * @param {Tool} tool - A Tool union type literal identifying the target development tool (e.g., 'claude', 'cursor', 'continue', or 'windsurf').
 * @returns {string} The filesystem path string for the specified tool's MCP configuration file, potentially including usage hints.
 * @example
 * const path = configPath('cursor'); // Returns '~/.cursor/mcp.json'
 */



function configPath(tool: Tool): string {
  const paths: Record<Tool, string> = {
    claude: "~/.claude/mcp.json  (or use: claude mcp add)",
    cursor: "~/.cursor/mcp.json",
    continue: "~/.continue/config.json",
    windsurf: "~/.codeium/windsurf/mcp_config.json",
  };
  return paths[tool];
}

/**
 * Renders the MCP (Model Context Protocol) server configuration page that allows users to connect Wright AI to various AI-powered code editors like Claude Code, Cursor, and Continue.
 *
 * This React component provides a comprehensive interface for setting up MCP server integration. It manages API key retrieval and display, repository selection, tool-specific configuration generation, connection testing, and clipboard operations. The component fetches the user's API key on mount and refocus, displays server status, allows selection of a connected repository, provides tab-based navigation between different supported tools (Claude Code, Cursor, Continue, etc.), generates tool-specific configuration with pre-filled API key and repository path, and offers copy-to-clipboard functionality for server URL, API key, and configuration snippets.
 * @returns {JSX.Element} A React component rendering the MCP server configuration interface with header section showing server status and test connection button, API URL and key display cards with copy functionality, repository selector dropdown (if repositories are available), tabbed interface for different tool setup guides, and code block displaying tool-specific configuration with copy button.
 * @example
 * <McpPage />
 */
export default function McpPage() {
  const { repos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();
  const [activeTool, setActiveTool] = useState<Tool>("claude");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [tested, setTested] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  const fetchKey = () => {
    fetch("/api/auth/key")
      .then(r => r.json())
      .then((d: { key: string }) => setApiKey(d.key ?? ""))
      .catch(() => {});
  };

  useEffect(() => {
    ga.dashboardPageVisit("mcp");
    ga.mcpSetupViewed();
    
    fetchKey();
    window.addEventListener("focus", fetchKey);
    return () => window.removeEventListener("focus", fetchKey);
  }, []);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const testConnection = async () => {
    setTested("loading");
    try {
      const res = await fetch("/api/proxy/health", { method: "GET" }).catch(() => null)
        ?? await fetch(`${API_URL}/health`);
      setTested(res.ok ? "ok" : "fail");
    } catch {
      setTested("fail");
    }
    setTimeout(() => setTested("idle"), 4000);
  };

  const config = configFor(activeTool, apiKey, selectedRepo?.local_path ?? "");

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "18px 22px",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 6 }}>
              MCP Server
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              Connect Wright AI to Claude Code, Cursor, Continue, or any MCP-compatible editor.
              Your AI assistant can then query your codebase, check coverage, and detect drift directly from the chat.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green, #4ade80)", boxShadow: "0 0 6px var(--green, #4ade80)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>Server online</span>
            </div>
            <button
              onClick={testConnection}
              disabled={tested === "loading"}
              style={{
                padding: "6px 14px", background: "transparent",
                border: "1px solid var(--border)", borderRadius: 8,
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: tested === "ok" ? "var(--green, #4ade80)" : tested === "fail" ? "var(--red)" : "var(--text-muted)",
                cursor: tested === "loading" ? "default" : "pointer",
              }}
            >
              {tested === "loading" ? "Testing…" : tested === "ok" ? "✓ Connected" : tested === "fail" ? "✕ Failed" : "Test connection"}
            </button>
          </div>
        </div>
      </div>

      {/* Server URL + API key row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Server URL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", wordBreak: "break-all" }}>
              {API_URL}/mcp
            </code>
            <button
              onClick={() => copy("url", `${API_URL}/mcp`)}
              style={{ flexShrink: 0, padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
            >
              {copied === "url" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>API Key</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)", wordBreak: "break-all" }}>
              {apiKey ? `${apiKey.slice(0, 7)}${"•".repeat(12)}${apiKey.slice(-4)}` : "—"}
            </code>
            <button
              onClick={() => apiKey && copy("key", apiKey)}
              disabled={!apiKey}
              style={{ flexShrink: 0, padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: apiKey ? "pointer" : "default", opacity: apiKey ? 1 : 0.5 }}
            >
              {copied === "key" ? "✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Repo selector */}
      {repos.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>Repo for config:</span>
          <select
            value={selectedRepoId}
            onChange={e => setSelectedRepoId(e.target.value)}
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, padding: "6px 12px", outline: "none", cursor: "pointer" }}
          >
            {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {selectedRepo && (
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{selectedRepo.local_path}</code>
          )}
        </div>
      )}

      {/* Tool tabs + config */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
          Setup guide
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 8,
                border: "1px solid var(--border)",
                background: activeTool === t.id ? "rgba(83,74,183,0.14)" : "transparent",
                borderColor: activeTool === t.id ? "rgba(83,74,183,0.4)" : "var(--border)",
                color: activeTool === t.id ? "var(--text)" : "var(--text-muted)",
                fontFamily: "var(--font-body)", fontSize: 13,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 12 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <Step n={1} text={
            activeTool === "claude"
              ? 'Open your Claude Code config or run: claude mcp add'
              : `Open or create the config file at: ${configPath(activeTool)}`
          } />
          <Step n={2} text="Paste the config below (your API key and repo path are pre-filled)." />
          <Step n={3} text={
            activeTool === "claude"
              ? 'Restart Claude Code. Type /mcp in the chat to verify Wright is connected.'
              : `Restart ${TOOLS.find(t => t.id === activeTool)?.label}. Wright tools will appear in the AI chat.`
          } />
        </div>

        {/* Config block */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8, zIndex: 1 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", padding: "2px 8px", background: "rgba(175,169,236,0.06)", borderRadius: 4, border: "1px solid var(--border)" }}>
              {configPath(activeTool)}
            </span>
            <button
              onClick={() => copy("config", config)}
              style={{ padding: "3px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
            >
              {copied === "config" ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre style={{
            background: "#0A0818", border: "1px solid var(--border)", borderRadius: 10,
            padding: "14px 16px", paddingTop: 42,
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-code)",
            overflowX: "auto", margin: 0, lineHeight: 1.6,
          }}>
            {config}
          </pre>
        </div>

        {!apiKey && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--amber)", marginTop: 12 }}>
            ⚠ Log in to auto-fill your API key, or get it from the{" "}
            <Link href="/dashboard/keys" style={{ color: "var(--purple-light)", textDecoration: "none" }}>API Keys</Link> page.
          </p>
        )}
      </div>
    </div>
  );
}

     /**
 * Renders a numbered step indicator with an associated descriptive text label.
 *
 * A React functional component that displays a single step in a sequential list, consisting of a circular badge showing the step number and a text description alongside it. The badge uses a purple-tinted style with monospace font, while the description uses the body font with muted coloring.
 *
 * @param {number} n - The step number displayed inside the circular badge.
 * @param {string} text - The descriptive text content displayed next to the step number badge.
 * @returns {JSX.Element} A flex container div element containing a styled circular step number badge and a span with the step description text.
 * @example
 * <Step n={1} text="Install the MCP package using your preferred package manager." />
 */




function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
        background: "rgba(83,74,183,0.15)", border: "1px solid rgba(83,74,183,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", fontWeight: 600,
      }}>
        {n}
      </div>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, paddingTop: 2 }}>{text}</span>
    </div>
  );
}
