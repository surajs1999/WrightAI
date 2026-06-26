"use client";

import { useEffect } from "react";

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      execute: (params: Record<string, unknown>) => Promise<unknown>;
    },
    options: { signal: AbortSignal }
  ) => void;
};

export default function WebMCPProvider() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("modelContext" in navigator)) return;

    const ctx = (navigator as Navigator & { modelContext: ModelContext }).modelContext;
    const controller = new AbortController();
    const { signal } = controller;

    ctx.registerTool(
      {
        name: "generate_documentation",
        description: "Generate AI docstrings for a project using Wright AI. Supports Python, TypeScript, JavaScript, Go, and Rust.",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              enum: ["python", "typescript", "javascript", "go", "rust"],
              description: "Programming language of the target code",
            },
          },
        },
        execute: async ({ language }) => {
          const path = language ? `/${language}` : "/dashboard/generate";
          window.location.href = path as string;
          return { navigated: true, url: path };
        },
      },
      { signal }
    );

    ctx.registerTool(
      {
        name: "check_documentation_coverage",
        description: "Check what percentage of functions in a codebase are documented vs undocumented.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          window.location.href = "/dashboard/coverage";
          return { navigated: true, url: "/dashboard/coverage" };
        },
      },
      { signal }
    );

    ctx.registerTool(
      {
        name: "detect_documentation_drift",
        description: "Detect documentation drift — functions whose docstrings no longer match the current code signature.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          window.location.href = "/dashboard/drift";
          return { navigated: true, url: "/dashboard/drift" };
        },
      },
      { signal }
    );

    ctx.registerTool(
      {
        name: "search_codebase_documentation",
        description: "Search across all documented functions in a codebase using natural language. Returns results with file:line citations.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Natural language search query" },
          },
          required: ["query"],
        },
        execute: async ({ query }) => {
          window.location.href = `/dashboard/chat?q=${encodeURIComponent(query as string)}`;
          return { navigated: true, url: "/dashboard/chat" };
        },
      },
      { signal }
    );

    ctx.registerTool(
      {
        name: "get_api_key",
        description: "Get a Wright AI API key (wai_) to use with the CLI, VS Code extension, GitHub Action, or MCP server.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          window.location.href = "/dashboard/keys";
          return { navigated: true, url: "/dashboard/keys" };
        },
      },
      { signal }
    );

    ctx.registerTool(
      {
        name: "install_wright_ai",
        description: "Get installation instructions for Wright AI — VS Code extension, CLI, GitHub Action, or MCP server.",
        inputSchema: {
          type: "object",
          properties: {
            surface: {
              type: "string",
              enum: ["vscode", "cli", "github-action", "mcp"],
              description: "Which surface to install Wright AI on",
            },
          },
        },
        execute: async ({ surface }) => {
          const anchors: Record<string, string> = {
            vscode: "#vscode",
            cli: "#cli",
            "github-action": "#github-action",
            mcp: "#mcp-reference",
          };
          const anchor = surface ? (anchors[surface as string] ?? "") : "";
          window.location.href = `/docs${anchor}`;
          return { navigated: true, url: `/docs${anchor}` };
        },
      },
      { signal }
    );

    return () => controller.abort();
  }, []);

  return null;
}
