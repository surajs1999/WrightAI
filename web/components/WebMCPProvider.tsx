"use client";

import { useEffect } from "react";

export default function WebMCPProvider() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("modelContext" in navigator)) return;

    const ctx = (navigator as Navigator & {
      modelContext: {
        provideContext: (config: {
          tools: {
            name: string;
            description: string;
            inputSchema: object;
            execute: (params: Record<string, unknown>) => Promise<unknown>;
          }[];
        }) => void;
      };
    }).modelContext;

    ctx.provideContext({
      tools: [
        {
          name: "generate_documentation",
          description:
            "Generate AI docstrings for a function or entire project using Wright AI. Supports Python, TypeScript, JavaScript, Go, and Rust.",
          inputSchema: {
            type: "object",
            properties: {
              language: {
                type: "string",
                enum: ["python", "typescript", "javascript", "go", "rust"],
                description: "Programming language of the target code",
              },
            },
            required: [],
          },
          execute: async ({ language }) => {
            const path = language ? `/${language}` : "/dashboard/generate";
            window.location.href = path as string;
            return { navigated: true, url: path };
          },
        },
        {
          name: "check_documentation_coverage",
          description:
            "Check the documentation coverage percentage for a codebase — how many functions are documented vs undocumented.",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
          execute: async () => {
            window.location.href = "/dashboard/coverage";
            return { navigated: true, url: "/dashboard/coverage" };
          },
        },
        {
          name: "detect_documentation_drift",
          description:
            "Detect documentation drift — functions whose docstrings no longer match the current code signature or logic.",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
          execute: async () => {
            window.location.href = "/dashboard/drift";
            return { navigated: true, url: "/dashboard/drift" };
          },
        },
        {
          name: "search_codebase_documentation",
          description:
            "Search across all documented functions in a codebase using natural language. Returns results with file:line citations.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Natural language search query about the codebase",
              },
            },
            required: ["query"],
          },
          execute: async ({ query }) => {
            window.location.href = `/dashboard/chat?q=${encodeURIComponent(query as string)}`;
            return { navigated: true, url: "/dashboard/chat" };
          },
        },
        {
          name: "get_api_key",
          description:
            "Get a Wright AI API key (wai_) to use with the CLI, VS Code extension, GitHub Action, or MCP server.",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
          execute: async () => {
            window.location.href = "/dashboard/keys";
            return { navigated: true, url: "/dashboard/keys" };
          },
        },
        {
          name: "install_wright_ai",
          description:
            "Get installation instructions for Wright AI — VS Code extension, CLI (pip install wright), GitHub Action, or MCP server.",
          inputSchema: {
            type: "object",
            properties: {
              surface: {
                type: "string",
                enum: ["vscode", "cli", "github-action", "mcp"],
                description: "Which surface to install Wright AI on",
              },
            },
            required: [],
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
      ],
    });
  }, []);

  return null;
}
