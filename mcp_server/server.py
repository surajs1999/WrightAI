from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    Tool,
)

load_dotenv()

server: Server = Server("wright")

_TOOLS: list[Tool] = [
    Tool(
        name="search_docs",
        description="Search documentation and code in the repository using semantic search",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "repo_root": {"type": "string", "description": "Path to repository root"},
                "n": {"type": "integer", "description": "Number of results to return", "default": 5},
            },
            "required": ["query", "repo_root"],
        },
    ),
    Tool(
        name="get_function_doc",
        description="Get detailed documentation for a specific function",
        inputSchema={
            "type": "object",
            "properties": {
                "function_name": {"type": "string", "description": "Name of the function"},
                "file_path": {"type": "string", "description": "Path to the file containing the function"},
                "repo_root": {"type": "string", "description": "Path to repository root"},
            },
            "required": ["function_name", "file_path", "repo_root"],
        },
    ),
    Tool(
        name="list_undocumented",
        description="List all undocumented functions in the repository",
        inputSchema={
            "type": "object",
            "properties": {
                "repo_root": {"type": "string", "description": "Path to repository root"},
                "folder": {"type": "string", "description": "Optional subfolder to limit search"},
            },
            "required": ["repo_root"],
        },
    ),
]


@server.list_tools()
async def list_tools(request: ListToolsRequest) -> ListToolsResult:
    return ListToolsResult(tools=_TOOLS)


@server.call_tool()
async def call_tool(request: CallToolRequest) -> CallToolResult:
    name = request.params.name
    args = request.params.arguments or {}

    try:
        if name == "search_docs":
            result = await _search_docs(args)
        elif name == "get_function_doc":
            result = await _get_function_doc(args)
        elif name == "list_undocumented":
            result = await _list_undocumented(args)
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}

    return CallToolResult(
        content=[TextContent(type="text", text=json.dumps(result, indent=2))]
    )


async def _search_docs(args: dict[str, Any]) -> list[dict]:
    from core.embeddings.chroma_store import ChromaStore
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    from core.parser.dep_graph import DependencyGraph
    from core.retrieval.hybrid_retriever import HybridRetriever

    query = args["query"]
    repo_root = args["repo_root"]
    n = int(args.get("n", 5))

    voyage_key = os.getenv("VOYAGE_API_KEY", "")
    embedder = VoyageEmbedder(api_key=voyage_key)
    chroma_path = os.getenv("CHROMA_PATH", os.path.join(repo_root, ".wright", "chroma"))
    chroma = ChromaStore(persist_path=chroma_path, repo_root=repo_root)
    dep_graph = DependencyGraph()
    retriever = HybridRetriever(chroma, dep_graph, embedder)

    contexts = retriever.retrieve_for_query(query, n=n)
    return [
        {
            "function_name": ctx.function.name,
            "file_path": ctx.chunk.file_path,
            "line": ctx.chunk.start_line + 1,
            "docstring": ctx.function.existing_docstring,
            "summary": (ctx.function.existing_docstring or "")[:100] if ctx.function.existing_docstring else None,
            "score": ctx.combined_score,
        }
        for ctx in contexts
    ]


async def _get_function_doc(args: dict[str, Any]) -> dict:
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser

    function_name = args["function_name"]
    file_path = args["file_path"]
    repo_root = args["repo_root"]

    parser = CodeParser()
    try:
        parsed_file = parser.parse_file(file_path)
    except Exception as e:
        return {"error": f"Failed to parse file: {e}"}

    func = None
    for f in parsed_file.functions:
        if f.name == function_name:
            func = f
            break
    for cls in parsed_file.classes:
        for m in cls.methods:
            if m.name == function_name:
                func = m
                break

    if func is None:
        return {"error": f"Function '{function_name}' not found in {file_path}"}

    dep_graph = DependencyGraph()
    dep_graph.build([parsed_file])
    callers = dep_graph.get_callers(func.name, func.file_path)
    callees = dep_graph.get_callees(func.name, func.file_path)

    return {
        "function_name": func.name,
        "file_path": func.file_path,
        "line": func.start_line + 1,
        "docstring": func.existing_docstring,
        "parameters": func.parameters,
        "return_type": func.return_type,
        "is_async": func.is_async,
        "decorators": func.decorators,
        "callers": [{"file": fp, "function": fn} for fp, fn in callers],
        "callees": [{"file": fp, "function": fn} for fp, fn in callees],
        "example": None,
    }


async def _list_undocumented(args: dict[str, Any]) -> dict:
    from core.parser.tree_sitter_parser import CodeParser

    repo_root = args["repo_root"]
    folder = args.get("folder")
    search_path = os.path.join(repo_root, folder) if folder else repo_root

    parser = CodeParser()
    parsed_files = parser.parse_directory(search_path)

    undoc = []
    total = 0
    documented = 0

    for pf in parsed_files:
        for func in pf.functions:
            total += 1
            if func.existing_docstring:
                documented += 1
            else:
                undoc.append({
                    "function_name": func.name,
                    "file_path": func.file_path,
                    "line": func.start_line + 1,
                })

    return {
        "total": total,
        "documented": documented,
        "undocumented_count": len(undoc),
        "undocumented": undoc,
    }


async def run() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="wright",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None,
                ),
            ),
        )


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
