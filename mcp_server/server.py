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
    Returns the complete list of available tools registered with the MCP server.

    Handles the list_tools MCP protocol request by returning all tools stored in the _TOOLS registry, enabling clients to discover and invoke the tools available on this server. Decorated with @server.list_tools() to register it as the handler for the MCP list_tools protocol method.

    Args:
        request (ListToolsRequest): The MCP protocol request object for listing available tools.

    Returns:
        ListToolsResult: An object containing the array of all available tools sourced from the _TOOLS registry.

    Example:
        ```
        result = await list_tools(ListToolsRequest())
        print(result.tools)  # List of registered Tool objects
        ```

    Complexity: O(1) time, O(1) space
    """
    return ListToolsResult(tools=_TOOLS)


@server.call_tool()
async def call_tool(request: CallToolRequest) -> CallToolResult:
    """
    Routes and executes tool calls by dispatching to the appropriate internal handler based on the requested tool name, returning results as JSON-formatted text.

    This async handler function acts as the main dispatcher for MCP tool requests. It extracts the tool name and arguments from the incoming request, invokes the corresponding internal function (_search_docs, _get_function_doc, or _list_undocumented), gracefully handles any exceptions by returning an error payload, and wraps the final result in a CallToolResult containing a JSON-formatted TextContent object.

    Args:
        request (CallToolRequest): The incoming tool call request object containing the tool name (params.name) and optional arguments (params.arguments) to be dispatched and executed.

    Returns:
        CallToolResult: A CallToolResult containing a single TextContent item with the tool execution output or error message serialized as an indented JSON string.

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
    Searches repository documentation and returns the top-N most relevant function contexts matching a natural language query using a hybrid retrieval pipeline.

    Initializes a hybrid retrieval system composed of Voyage AI embeddings, ChromaDB vector storage, and dependency graph analysis, then queries that system to rank and return the top-N function contexts most relevant to the supplied search string. Each result includes the function name, source file path, starting line number, full docstring, a 100-character summary, and a combined relevance score. The function reads VOYAGE_API_KEY and CHROMA_PATH from environment variables, falling back to sensible defaults when they are absent.

    Args:
        args (dict[str, Any]): Dictionary containing required key 'query' (str) — the natural language search text, and 'repo_root' (str) — absolute path to the repository root. Optionally accepts 'n' (int, default=5) specifying the maximum number of results to return.

    Returns:
        list[dict]: List of dictionaries, one per matched function, each containing 'function_name' (str), 'file_path' (str), 'line' (int, 1-based starting line), 'docstring' (str or None), 'summary' (str or None, first 100 characters of docstring), and 'score' (float, combined relevance score). Returns an empty list when no matching contexts are found.

    Raises:
        KeyError: When required keys 'query' or 'repo_root' are missing from the args dictionary.

    Example:
        ```
        results = await _search_docs({'query': 'parse AST nodes', 'repo_root': '/path/to/repo', 'n': 3})
        ```

    Complexity: O(n*m) time where n is the corpus size and m is query complexity; O(n) space for retrieval results.
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
    Retrieves comprehensive documentation metadata for a specified function or method from a Python file, including its docstring, parameters, return type, async status, decorators, and dependency relationships.

    Parses the specified Python file using CodeParser to locate the named function or method, searching both top-level functions and class methods. Once found, builds a DependencyGraph over the parsed file to resolve callers and callees. Returns a structured dictionary of metadata, or a dictionary with an 'error' key if parsing fails or the function cannot be located. This coroutine is dispatched by call_tool() and internally delegates to parse_file(), build(), get_callers(), and get_callees().

    Args:
        args (dict[str, Any]): A dictionary with three required keys: 'function_name' (str) — the name of the target function or method to document; 'file_path' (str) — absolute or relative path to the Python source file to parse; 'repo_root' (str) — the root directory of the repository, currently reserved for future use.

    Returns:
        dict: A dictionary containing the function's metadata with keys: 'function_name' (str), 'file_path' (str), 'line' (int, 1-based), 'docstring' (str or None), 'parameters' (list), 'return_type' (str or None), 'is_async' (bool), 'decorators' (list), 'callers' (list of dicts with 'file' and 'function' keys), 'callees' (list of dicts with 'file' and 'function' keys), and 'example' (None). Returns a dictionary with a single 'error' key (str) if the file cannot be parsed or the function is not found.

    Example:
        ```
        doc = await _get_function_doc({'function_name': 'parse_file', 'file_path': '/path/to/repo/core/parser/tree_sitter_parser.py', 'repo_root': '/path/to/repo'})
        # doc['function_name'] == 'parse_file'
        # doc['is_async'] == False
        # doc['callers'] == [{'file': '/path/to/repo/mcp_server/server.py', 'function': '_get_function_doc'}]
        ```

    Complexity: O(n*m) time where n is the number of top-level functions and m is the number of class methods in the parsed file; O(k) space where k is the total number of dependency edges in the graph
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
    Scans a Python codebase directory for undocumented functions and returns documentation coverage statistics.

    Parses all Python files in the specified directory (or subdirectory) using tree-sitter via CodeParser, iterates over every non-anonymous function found, and classifies each as documented or undocumented based on the presence of an existing docstring. Returns aggregate counts alongside a detailed list of undocumented functions including their names, file paths, and line numbers.

    Args:
        args (dict[str, Any]): Configuration dictionary requiring 'repo_root' (str): absolute path to the repository root, and optionally 'folder' (str): a subdirectory path relative to repo_root to restrict the search scope.

    Returns:
        dict: Dictionary with four keys: 'total' (int) total number of named functions found, 'documented' (int) count of functions that have docstrings, 'undocumented_count' (int) count of functions without docstrings, and 'undocumented' (list[dict]) each containing 'function_name' (str), 'file_path' (str), and 'line' (int, 1-based) for every undocumented function.

    Raises:
        KeyError: When the required 'repo_root' key is absent from the args dictionary.

    Example:
        ```
        result = await _list_undocumented({'repo_root': '/home/user/my_project', 'folder': 'src'})
        # result => {'total': 42, 'documented': 30, 'undocumented_count': 12, 'undocumented': [{'function_name': 'helper', 'file_path': '/home/user/my_project/src/utils.py', 'line': 17}, ...]}

        # Without a subdirectory restriction
        result = await _list_undocumented({'repo_root': '/home/user/my_project'})
        ```

    Complexity: O(n*m) time where n is the number of Python files parsed and m is the average number of functions per file; O(k) space where k is the number of undocumented functions stored in the result list.
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
    Starts the MCP server by establishing stdio communication streams and running the server with 'wright' initialization options.

    Serves as the main async entry point for the MCP (Model Context Protocol) server. Opens a stdio server context to obtain read and write streams, then invokes the server's run loop with InitializationOptions specifying the server name 'wright', version '0.1.0', and the server's capability configuration. This function is called by the CLI entrypoint and various callers such as DriftPage and generate.

    Returns:
        None: Does not return a value; runs the server until the stdio streams are closed or the process exits.

    Example:
        ```
        import asyncio
        asyncio.run(run())
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
    Serves as the synchronous entry point for the MCP server by bootstrapping and running the async event loop.

    Acts as the top-level entry point called by the CLI (findWrightCli) to start the MCP server. It uses asyncio.run() to execute the run() coroutine, blocking until the server completes or is interrupted. This bridges the synchronous CLI invocation with the asynchronous server implementation.

    Returns:
        None: Does not return a value; blocks until the asyncio event loop completes.

    Example:
        ```
        main()
        ```
    """
    asyncio.run(run())


if __name__ == "__main__":
    main()
