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
                "n": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 5,
                },
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
                "file_path": {
                    "type": "string",
                    "description": "Path to the file containing the function",
                },
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
    """
    Returns the list of available tools registered with the server.

    Handler for the list_tools MCP protocol request that provides the complete list of tools (_TOOLS) available on this server for clients to discover and invoke.

    Args:
        request (ListToolsRequest): The MCP protocol request object for listing tools.

    Returns:
        ListToolsResult: An object containing the array of available tools from the _TOOLS registry.

    Example:
        ```
        result = await list_tools(ListToolsRequest())
        ```

    Complexity: O(1) time, O(1) space
    """
    return ListToolsResult(tools=_TOOLS)


@server.call_tool()
async def call_tool(request: CallToolRequest) -> CallToolResult:
    """
    Routes and executes tool calls based on the requested tool name, returning results as formatted JSON text.

    This async handler function serves as the main dispatcher for tool requests. It extracts the tool name and arguments from the request, invokes the appropriate internal tool function (_search_docs, _get_function_doc, or _list_undocumented), handles any exceptions that occur during execution, and returns the result wrapped in a CallToolResult with JSON-formatted text content.

    Args:
        request (CallToolRequest): The tool call request containing the tool name and arguments to be executed.

    Returns:
        CallToolResult: A result object containing the tool execution output or error message as JSON-formatted text content.

    Example:
        ```
        result = await call_tool(CallToolRequest(params=ToolCallParams(name='search_docs', arguments={'query': 'authentication'})))
        ```
    """
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

    return CallToolResult(content=[TextContent(type="text", text=json.dumps(result, indent=2))])


async def _search_docs(args: dict[str, Any]) -> list[dict]:
    """
    Searches documentation for relevant code contexts using hybrid retrieval based on a natural language query.

    Initializes a hybrid retrieval system with embeddings (Voyage AI), vector storage (ChromaDB), and dependency graph analysis to find and rank the most relevant function contexts matching the search query. Returns detailed information about matching functions including their locations, docstrings, and relevance scores.

    Args:
        args (dict[str, Any]): Dictionary containing 'query' (str) for the search text, 'repo_root' (str) for the repository root path, and optionally 'n' (int, default=5) for the number of results to return.

    Returns:
        list[dict]: List of dictionaries, each containing 'function_name' (str), 'file_path' (str), 'line' (int) starting line number, 'docstring' (str or None) full docstring, 'summary' (str or None) first 100 characters of docstring, and 'score' (float) relevance score.

    Raises:
        KeyError: When required keys 'query' or 'repo_root' are missing from args dictionary.

    Example:
        ```
        results = await _search_docs({'query': 'parse AST nodes', 'repo_root': '/path/to/repo', 'n': 3})
        ```

    Complexity: O(n*m) time where n is corpus size and m is query complexity, O(n) space for retrieval results
    """
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
            "summary": (ctx.function.existing_docstring or "")[:100]
            if ctx.function.existing_docstring
            else None,
            "score": ctx.combined_score,
        }
        for ctx in contexts
    ]


async def _get_function_doc(args: dict[str, Any]) -> dict:
    """
    Retrieves comprehensive documentation metadata for a specified function or method from a Python file.

    Parses the specified Python file to locate the named function or method, then builds a dependency graph to determine its callers and callees. Returns a dictionary containing the function's metadata including docstring, parameters, return type, async status, decorators, and dependency relationships.

    Args:
        args (dict[str, Any]): Dictionary containing 'function_name' (str) for the target function name, 'file_path' (str) for the Python file to parse, and 'repo_root' (str) for the repository root directory.

    Returns:
        dict: Dictionary containing function metadata with keys: 'function_name', 'file_path', 'line', 'docstring', 'parameters', 'return_type', 'is_async', 'decorators', 'callers', 'callees', and 'example'. Returns a dictionary with 'error' key if parsing fails or function is not found.

    Example:
        ```
        doc = await _get_function_doc({'function_name': 'parse_file', 'file_path': '/path/to/module.py', 'repo_root': '/path/to/repo'})
        ```

    Complexity: O(n*m) time where n is the number of functions and m is the number of classes/methods in the file, O(k) space where k is the number of dependencies
    """
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser

    function_name = args["function_name"]
    file_path = args["file_path"]
    repo_root = args["repo_root"]  # noqa: F841

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
    """
    Lists all undocumented functions in a Python codebase directory and returns statistics about documentation coverage.

    Parses Python files in the specified directory using tree-sitter, identifies functions with and without docstrings, and returns detailed information about undocumented functions along with coverage statistics.

    Args:
        args (dict[str, Any]): Dictionary containing 'repo_root' (required str: path to repository root) and optional 'folder' (str: subdirectory path relative to repo_root to search within).

    Returns:
        dict: Dictionary with keys 'total' (int: total function count), 'documented' (int: count of functions with docstrings), 'undocumented_count' (int: count of functions without docstrings), and 'undocumented' (list of dicts containing 'function_name', 'file_path', and 'line' for each undocumented function).

    Raises:
        KeyError: When 'repo_root' key is missing from args dictionary.

    Example:
        ```
        result = await _list_undocumented({'repo_root': '/path/to/repo', 'folder': 'src'})
        ```

    Complexity: O(n*m) time where n is the number of files and m is the average number of functions per file, O(k) space where k is the number of undocumented functions
    """
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
            if func.name == "<anonymous>":
                continue
            total += 1
            if func.existing_docstring:
                documented += 1
            else:
                undoc.append(
                    {
                        "function_name": func.name,
                        "file_path": func.file_path,
                        "line": func.start_line + 1,
                    }
                )

    return {
        "total": total,
        "documented": documented,
        "undocumented_count": len(undoc),
        "undocumented": undoc,
    }


async def run() -> None:
    """
    Runs the MCP server by establishing stdio communication streams and initializing the server with wright capabilities.

    This asynchronous function serves as the main entry point for the MCP (Model Context Protocol) server. It creates a stdio server context that provides read and write streams for communication, then runs the server with initialization options including the server name 'wright', version '0.1.0', and the server's capabilities configuration.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        await run()
        ```
    """
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
    """
    Serves as the entry point for the MCP server, initializing and running the asyncio event loop.

    This function acts as the synchronous entry point that bootstraps the asynchronous MCP server by running the run() coroutine using asyncio.run(). It blocks until the server completes execution.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        main()
        ```
    """
    asyncio.run(run())


if __name__ == "__main__":
    main()
