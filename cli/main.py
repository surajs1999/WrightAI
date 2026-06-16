# WrightAI — AI-powered code documentation tool
# Copyright (C) 2026 Suraj Sahoo
# SPDX-License-Identifier: AGPL-3.0-or-later
# https://github.com/surajs1999/WrightAI
from __future__ import annotations

import asyncio
import json
import os
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.embeddings.chroma_store import ChromaStore
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    from core.llm.gateway import LLMGateway
    from core.parser.cache import ASTCache

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

load_dotenv()

app = typer.Typer(name="wright", help="AI-powered code documentation", add_completion=False)
console = Console()


def _resolve_workspace(path: str) -> str:
    """
    Walks up the directory tree from the given path to find and return the nearest ancestor directory containing a '.wright.json' configuration file.

    Starting from the absolute path of the provided file or directory, this function traverses parent directories upward until it locates a directory containing '.wright.json'. If found, it returns that directory as the resolved workspace root. If no such file is found before reaching the filesystem root, the function falls back to returning the absolute path of the original input. Used internally by CLI commands such as generate(), coverage(), drift(), chat(), and llms_txt() to determine the active workspace context.

    Args:
        path (str): A file path or directory path to start searching from. Can be relative or absolute; resolved to an absolute path internally before traversal begins.

    Returns:
        str: The absolute path of the nearest ancestor directory (inclusive of the starting directory) that contains a '.wright.json' file, or the absolute path of the original input if no such directory is found.

    Example:
        ```
        workspace = _resolve_workspace('/home/user/projects/myapp/src/module.py')
        # Returns '/home/user/projects/myapp' if '.wright.json' exists there
        ```

    Complexity: O(d) time, O(1) space, where d is the depth of the directory tree from the starting path to the filesystem root
    """
    start = os.path.abspath(path)
    check = start if os.path.isdir(start) else os.path.dirname(start)
    while True:
        if os.path.isfile(os.path.join(check, ".wright.json")):
            return check
        parent = os.path.dirname(check)
        if parent == check:
            break
        check = parent
    return start


def _require_env(key: str) -> str:
    """
    Retrieves a required environment variable by key, terminating the application with an error message if the variable is not set or empty.

    Used internally by `_build_gateway()` to enforce that critical environment variables are present before proceeding. If the specified variable is missing or empty, prints a formatted red error message to the console instructing the user to add the variable to their `.env` file, then raises `typer.Exit` with exit code 1 to terminate the application.

    Args:
        key (str): The name of the environment variable to retrieve (e.g., 'OPENAI_API_KEY').

    Returns:
        str: The non-empty string value of the requested environment variable.

    Raises:
        typer.Exit: When the environment variable specified by `key` is not set or is an empty string; exits with code 1.

    Example:
        ```
        api_key = _require_env('OPENAI_API_KEY')
        ```
    """
    val = os.getenv(key)
    if not val:
        console.print(f"[red]Error: {key} is not set. Add it to your .env file.[/red]")
        raise typer.Exit(1)
    return val


def _build_gateway() -> "LLMGateway":
    """
    Builds and returns a configured LLMGateway instance using API keys read from environment variables.

    Reads the Anthropic API key (required) and Gemini API key (optional) from environment variables and uses them to instantiate an LLMGateway object. If the ANTHROPIC_API_KEY environment variable is not set, `_require_env` prints an error and raises `typer.Exit(1)` before the gateway is created. This function is used internally by CLI commands such as generate, drift, chat, and llms_txt.

    Returns:
        LLMGateway: A fully configured LLMGateway instance initialised with the Anthropic API key and, if available, the Gemini API key as a fallback model.

    Raises:
        typer.Exit: When the ANTHROPIC_API_KEY environment variable is not set in the current environment; exits with code 1.

    Example:
        ```
        gateway = _build_gateway()
        answer, citations = await gateway.chat("What does this repo do?", contexts)
        ```
    """
    from core.llm.gateway import LLMGateway

    return LLMGateway(
        anthropic_key=_require_env("ANTHROPIC_API_KEY"),
        gemini_key=os.getenv("GEMINI_API_KEY"),
    )


def _build_embedder() -> "VoyageEmbedder":
    """
    Builds and returns a VoyageEmbedder instance configured with the API key retrieved from the VOYAGE_API_KEY environment variable.

    This factory function reads the VOYAGE_API_KEY environment variable to initialize a VoyageEmbedder instance. If the environment variable is not set, an empty string is used as the fallback API key. It is called internally by the init(), generate(), drift(), and chat() CLI commands to provide a consistent embedder object.

    Returns:
        VoyageEmbedder: A VoyageEmbedder instance initialized with the API key from the VOYAGE_API_KEY environment variable, or an empty string if the variable is not set.

    Example:
        ```
        import os
        os.environ['VOYAGE_API_KEY'] = 'your-voyage-api-key'
        embedder = _build_embedder()
        # embedder is now a VoyageEmbedder configured with 'your-voyage-api-key'
        ```
    """
    from core.embeddings.voyage_embeddings import VoyageEmbedder

    voyage_key = os.getenv("VOYAGE_API_KEY", "")
    return VoyageEmbedder(api_key=voyage_key)


def _get_cache(repo_root: str) -> "ASTCache":
    """
    Retrieves or initializes an ASTCache instance for the specified repository root directory.

    Determines the cache database path from the SQLITE_CACHE_PATH environment variable, falling back to a default path at <repo_root>/.wright/ast_cache.db. Ensures the target directory exists before constructing and returning the ASTCache instance. Called internally by generate() and drift() to provide a shared caching layer for parsed AST data.

    Args:
        repo_root (str): The root directory path of the repository where the AST cache database should be stored.

    Returns:
        ASTCache: An initialized ASTCache instance configured with the resolved cache database file path.

    Raises:
        OSError: When the cache directory cannot be created due to permission issues or an invalid path.

    Example:
        ```
        cache = _get_cache('/home/user/projects/my_repo')
        ```
    """
    from core.parser.cache import ASTCache

    cache_path = os.getenv("SQLITE_CACHE_PATH", os.path.join(repo_root, ".wright", "ast_cache.db"))
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    return ASTCache(cache_path)


def _sync_baselines_to_api(cache: "ASTCache", results: list, repo_root: str) -> None:
    """Fire-and-forget: push AST baselines for scanned files to the Wright API so the
    server-side drift detector keeps a real baseline across Cloud Run cold starts.
    No-op when WRIGHT_API_KEY is not set in the environment."""
    import sqlite3 as _sqlite3

    api_key = os.getenv("WRIGHT_API_KEY", "")
    if not api_key:
        return
    api_url = os.getenv("WRIGHT_API_URL", "https://api.wrightai.live").rstrip("/")
    repo_name = os.path.basename(repo_root)

    scanned_abs = list({r.file_path for r in results})
    if not scanned_abs:
        return

    files = []
    try:
        with _sqlite3.connect(cache._db_path) as conn:
            for abs_path in scanned_abs:
                row = conn.execute(
                    "SELECT parsed_json FROM ast_cache WHERE file_path = ?", (abs_path,)
                ).fetchone()
                if row and row[0]:
                    files.append(
                        {
                            "file_path": os.path.relpath(abs_path, repo_root),
                            "parsed_json": row[0],
                        }
                    )
    except Exception:
        return

    if not files:
        return

    try:
        import httpx as _httpx

        _httpx.post(
            f"{api_url}/drift-check/sync-baseline",
            json={"repo_name": repo_name, "files": files},
            headers={"X-Wright-API-Key": api_key},
            timeout=15.0,
        )
    except Exception:
        pass


def _sync_results_to_api(results: list, repo_root: str) -> None:
    """Fire-and-forget: push per-function drift results to the Wright API so the
    dashboard reflects local CLI runs without needing the VS Code extension.
    No-op when WRIGHT_API_KEY is not set."""
    api_key = os.getenv("WRIGHT_API_KEY", "")
    if not api_key or not results:
        return
    api_url = os.getenv("WRIGHT_API_URL", "https://api.wrightai.live").rstrip("/")
    repo_name = os.path.basename(repo_root)
    items = [
        {
            "file_path": os.path.relpath(r.file_path, repo_root),
            "func_name": r.function_name,
            "status": r.status,
            "reason": r.reason,
        }
        for r in results
    ]
    try:
        import httpx as _httpx

        _httpx.post(
            f"{api_url}/drift-check/sync",
            json={"repo_name": repo_name, "results": items},
            headers={"X-Wright-API-Key": api_key},
            timeout=15.0,
        )
    except Exception:
        pass


def _get_chroma(repo_root: str) -> "ChromaStore":
    """
    Initializes and returns a configured ChromaStore instance for vector embeddings storage using the repository root path.

    Acts as a factory method that constructs a ChromaStore object with a persistence path resolved from the CHROMA_PATH environment variable, falling back to the default '.wright/chroma' directory within the given repository root. This instance is used by init(), generate(), drift(), and chat() to interact with the Chroma vector database.

    Args:
        repo_root (str): The absolute or relative root directory path of the repository where the Chroma database will be persisted if CHROMA_PATH is not set.

    Returns:
        ChromaStore: A ChromaStore instance configured with persist_path set to either the CHROMA_PATH environment variable value or the default path '<repo_root>/.wright/chroma', and repo_root set to the provided repository root.

    Example:
        ```
        chroma_store = _get_chroma('/home/user/my_project')
        ```
    """
    from core.embeddings.chroma_store import ChromaStore

    chroma_path = os.getenv("CHROMA_PATH", os.path.join(repo_root, ".wright", "chroma"))
    return ChromaStore(persist_path=chroma_path, repo_root=repo_root)


@app.command()
def init(repo: str = typer.Argument(".", help="Repository root")) -> None:
    """
    Initializes Wright for a repository by scanning source files, reporting documentation coverage, writing a .wright.json configuration file, and building a local semantic search index.

    Scans the specified repository root directory for source files using a tree-sitter-based code parser, computes documentation coverage statistics (file count, total named functions, and percentage already documented), detects the dominant programming language by function count, displays up to three sample undocumented functions, and then prompts the user to confirm creation of a .wright.json configuration file. Finally, if VOYAGE_API_KEY or OPENAI_API_KEY is set, chunks the parsed codebase and embeds it into a local ChromaDB collection (under .wright/chroma) so `wright chat`, `wright generate`, and `wright drift --fix` have retrieval context available immediately, without requiring a separate indexing step.

    Args:
        repo (str): Filesystem path to the repository root to initialize. Defaults to '.' (current working directory). Resolved to an absolute path before processing.

    Returns:
        None: This function does not return a value; all output is written to the console, optionally to a .wright.json file, and to a local ChromaDB collection under .wright/chroma.

    Raises:
        SystemExit: Raised implicitly by Typer if required CLI arguments are malformed or if the user aborts the confirmation prompt.

    Example:
        ```
        # From the command line:
        # $ wright init /path/to/my_project

        # Programmatically (e.g. in tests):
        from cli.main import init
        init(repo='/path/to/my_project')
        ```

    Complexity: O(F) time where F is the total number of source files in the repository, driven by the directory scan and parse step.
    """
    from core.config import WrightConfig, save_config
    from core.parser.tree_sitter_parser import CodeParser

    repo_path = os.path.abspath(repo)
    console.print(f"[bold green]Initializing Wright for:[/bold green] {repo_path}")

    parser = CodeParser()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        scan_task = progress.add_task("Scanning repository...", total=None)
        parsed_files = parser.parse_directory(repo_path)
        progress.update(scan_task, completed=True, description=f"Found {len(parsed_files)} files")

    named_funcs = [
        f
        for pf in parsed_files
        for f in (*pf.functions, *(m for cls in pf.classes for m in cls.methods))
        if f.name != "<anonymous>"
    ]
    total_funcs = len(named_funcs)
    documented = sum(1 for f in named_funcs if f.existing_docstring)
    console.print("\n[bold]Scan results:[/bold]")
    console.print(f"  Files:     {len(parsed_files)}")
    console.print(f"  Functions: {total_funcs}")
    console.print(f"  Documented: {documented} ({100 * documented // max(total_funcs, 1)}%)")

    # Detect dominant language
    lang_counts: dict[str, int] = {}
    for pf in parsed_files:
        lang_counts[pf.language] = lang_counts.get(pf.language, 0) + len(pf.functions)
    detected_lang = max(lang_counts, key=lang_counts.get) if lang_counts else "python"

    # Show 3 sample undocumented functions
    undoc = [
        f
        for pf in parsed_files
        for f in (*pf.functions, *(m for cls in pf.classes for m in cls.methods))
        if not f.existing_docstring
    ][:3]
    if undoc:
        console.print("\n[bold]Sample undocumented functions:[/bold]")
        for f in undoc:
            console.print(f"  • [cyan]{f.name}[/cyan] in {f.file_path}:{f.start_line + 1}")

    confirm = typer.confirm("\nWrite .wright.json configuration?", default=True)
    if confirm:
        config = WrightConfig(languages=[detected_lang])
        save_config(config, repo_path)
        console.print("[green]Created .wright.json[/green]")

    # Build the semantic search index so `wright chat`, `wright generate`, and
    # `wright drift --fix` have embeddings to retrieve from right away.
    voyage_key = os.getenv("VOYAGE_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if not (voyage_key or openai_key):
        console.print(
            "\n[yellow]Tip: set VOYAGE_API_KEY (or OPENAI_API_KEY) to build a semantic "
            "search index for [bold]wright chat[/bold], [bold]wright generate[/bold], "
            "and [bold]wright drift --fix[/bold].[/yellow]"
        )
    else:
        from core.parser.ast_chunker import ASTChunker

        try:
            with Progress(
                SpinnerColumn(), TextColumn("{task.description}"), console=console
            ) as progress:
                t = progress.add_task("Building semantic search index...", total=None)
                chunks = ASTChunker().chunk_directory(parsed_files)
                if chunks:
                    embeddings = _build_embedder().embed_chunks(chunks)
                    _get_chroma(repo_path).upsert_chunks(chunks, embeddings)
                progress.update(t, completed=True)
            console.print(
                f"[green]Indexed {len(chunks)} code chunk(s) for semantic search.[/green]"
            )
        except Exception as e:
            console.print(f"[yellow]Could not build semantic search index: {e}[/yellow]")


@app.command()
def generate(
    path: str = typer.Argument(".", help="File or directory to document"),
    style: Optional[str] = typer.Option(
        None, help="Override doc style (google/numpy/jsdoc/epytext/rust)"
    ),
    verbosity: str = typer.Option("standard", "--verbosity", help="concise/standard/detailed"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview without writing"),
    watch: bool = typer.Option(False, "--watch", help="Watch for changes"),
    quality: str = typer.Option(
        "standard",
        "--quality",
        help="standard/high — 'high' enables critic/rewriter loop (uses more tokens)",
    ),
) -> None:
    """
    Generates and injects docstrings for all undocumented functions in a specified file or directory using an LLM-backed pipeline.

    Scans the specified path (file or directory) for undocumented functions, builds a dependency graph and hybrid retriever for context, then concurrently generates docstrings via a configured LLM gateway and injects them into source files. Files within the same path are processed serially to maintain correct byte offsets after each injection, while different files are processed concurrently with a semaphore limit of 3. Supports multiple documentation styles, verbosity levels, dry-run preview mode, and an experimental watch mode.

    Args:
        path (str): Filesystem path to a single source file or a directory to recursively scan for undocumented functions. Defaults to the current working directory ('.').
        style (Optional[str]): Documentation style to use for generated docstrings. Accepted values are 'google', 'numpy', 'jsdoc', 'epytext', or 'rust'. If omitted, the style is inferred from the project configuration or the detected language of each function.
        verbosity (str): Controls the level of detail in generated docstrings. Accepted values are 'concise', 'standard', or 'detailed'. Defaults to 'standard'.
        dry_run (bool): When True, previews the generated docstrings in the results table without writing any changes to disk. Defaults to False.
        watch (bool): When True, intended to watch the target path for file changes and re-generate docstrings automatically. Watch mode is not yet implemented and will display a notice if enabled. Defaults to False.
        quality (str): Generation quality level, 'standard' or 'high'. 'high' enables an additional critic/rewriter loop in the LLM gateway for better results at the cost of more tokens. Defaults to 'standard'.

    Returns:
        None: Does not return a value. Outputs a Rich-formatted results table to the console summarising the generation status of each function.

    Raises:
        Exception: Any exception raised during docstring generation or injection for a specific function is caught per-function, logged in the results table with an error message, and does not abort processing of remaining functions.

    Example:
        ```
        # Generate Google-style docstrings for all undocumented functions in ./src with detailed verbosity
        $ wright generate ./src --style google --verbosity detailed

        # Preview generated docstrings without writing to disk
        $ wright generate ./src/utils.py --dry-run
        ```
    """
    from core.config import load_config
    from core.llm.prompts import DocStyle, LANGUAGE_DEFAULT_STYLE
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    path_abs = os.path.abspath(path)
    repo_root = _resolve_workspace(path_abs)
    config = load_config(repo_root)
    doc_style = DocStyle(style) if style else config.style

    gateway = _build_gateway()
    embedder = _build_embedder()
    gen_cache = _get_cache(repo_root)
    chroma = _get_chroma(repo_root)
    parser = CodeParser()
    injector = DocstringInjector()

    if os.path.isfile(path_abs):
        parsed_files = [parser.parse_file(path_abs)]
    else:
        parsed_files = parser.parse_directory(repo_root)

    dep_graph = DependencyGraph()
    dep_graph.build(parsed_files)
    retriever = HybridRetriever(chroma, dep_graph, embedder)

    # Track a qualified name ("ClassName.method" for methods, bare name for
    # top-level functions) per function so re-parsing after each injection
    # (below) can find the right function even when a top-level function and
    # a class method share the same bare name.
    undoc_funcs: list = []
    qualified_names: dict[int, str] = {}
    for pf in parsed_files:
        for f in pf.functions:
            if not f.existing_docstring and f.name != "<anonymous>":
                undoc_funcs.append((pf, f))
                qualified_names[id(f)] = f.name
        for cls in pf.classes:
            for m in cls.methods:
                if not m.existing_docstring and m.name != "<anonymous>":
                    undoc_funcs.append((pf, m))
                    qualified_names[id(m)] = f"{cls.name}.{m.name}"

    if not undoc_funcs:
        console.print("[green]All functions are already documented![/green]")
        return

    console.print(
        f"\nGenerating docs for [bold]{len(undoc_funcs)}[/bold] undocumented functions..."
    )
    if dry_run:
        console.print("[yellow](Dry run — no files will be modified)[/yellow]")

    results_table = Table(title="Generation Results")
    results_table.add_column("Function", style="cyan")
    results_table.add_column("File", style="dim")
    results_table.add_column("Status", style="green")

    async def _run() -> None:
        # Fix 1: group by file so functions in the same file are injected serially.
        # After each injection the file changes on disk; we re-parse before the next
        # function in that file so byte offsets are always fresh.
        # Different files are processed concurrently (semaphore=3).
        from collections import defaultdict

        by_file: dict[str, list] = defaultdict(list)
        for _pf, f in undoc_funcs:
            by_file[f.file_path].append(f)

        sem = asyncio.Semaphore(3)

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console,
        ) as progress:
            task = progress.add_task("Generating...", total=len(undoc_funcs))

            async def process_file(file_path: str, funcs: list) -> None:
                async with sem:
                    for func in funcs:
                        try:
                            # Re-parse to get fresh byte offsets before each injection
                            # (previous injection shifted bytes for later functions).
                            if not dry_run:
                                fresh_parsed = parser.parse_file(file_path)
                                fresh_by_qualified_name: dict = {
                                    f.name: f for f in fresh_parsed.functions
                                }
                                for cls in fresh_parsed.classes:
                                    for m in cls.methods:
                                        fresh_by_qualified_name[f"{cls.name}.{m.name}"] = m
                                qname = qualified_names[id(func)]
                                func = fresh_by_qualified_name.get(qname, func)

                            effective_style = (
                                doc_style
                                if style
                                else LANGUAGE_DEFAULT_STYLE.get(func.language, doc_style)
                            )
                            contexts = retriever.retrieve_for_function(func)
                            doc, _llm = await gateway.generate_docstring(
                                func,
                                contexts,
                                effective_style,
                                verbosity=verbosity,
                                quality=quality,
                            )
                            result = injector.inject(
                                file_path, func, doc, effective_style, dry_run=dry_run
                            )
                            status = (
                                "✓ preview"
                                if dry_run
                                else ("✓ injected" if result.success else f"✗ {result.error}")
                            )
                            results_table.add_row(func.name, os.path.basename(file_path), status)
                        except Exception as e:
                            results_table.add_row(
                                func.name, os.path.basename(file_path), f"[red]Error: {e}[/red]"
                            )
                        finally:
                            progress.advance(task)
                    # Re-parse the fully-injected file and store as drift baseline
                    if not dry_run:
                        try:
                            gen_cache.set(parser.parse_file(file_path))
                        except Exception:
                            pass

            await asyncio.gather(*[process_file(fp, funcs) for fp, funcs in by_file.items()])

    asyncio.run(_run())
    console.print(results_table)

    if watch:
        console.print("\n[yellow]Watch mode not yet implemented in this version.[/yellow]")


@app.command()
def coverage(
    path: str = typer.Argument(".", help="Repository root"),
    output: Optional[str] = typer.Option(None, "--output", help="Write JSON report to file"),
) -> None:
    """
    Scans a repository root for Python documentation coverage and prints a per-folder breakdown table, optionally writing a JSON report and exiting with a non-zero code if coverage falls below the configured threshold.

    Traverses all Python files under the given repository root using CodeParser, counts total and documented functions (excluding anonymous ones), and computes per-folder and overall coverage percentages. Results are rendered as a Rich table in the console. If an output path is supplied, a JSON report containing overall percentage, total counts, and per-folder breakdowns is written to disk. If the overall coverage percentage falls below the threshold defined in the project configuration, a red warning is printed and the CLI exits with code 1.

    Args:
        path (str): Filesystem path to the repository root to scan. Defaults to '.' (the current working directory).
        output (Optional[str]): If provided, writes a JSON summary report containing overall_pct, total, documented, files, and by_folder breakdowns to the specified file path. Defaults to None.

    Returns:
        None: Does not return a value; all output is written to the console, an optional JSON file, and/or triggers a typer.Exit(1) if coverage is below threshold.

    Raises:
        typer.Exit: Raised with exit code 1 when the overall documentation coverage percentage falls below the threshold defined in the project configuration (config.coverage_threshold * 100).

    Example:
        ```
        # From the command line:
        # $ wright coverage ./my_project --output coverage_report.json

        # Programmatic equivalent using Typer's test runner:
        from typer.testing import CliRunner
        from cli.main import app

        runner = CliRunner()
        result = runner.invoke(app, ['coverage', './my_project', '--output', 'coverage_report.json'])
        print(result.output)
        # Console prints a Rich table with per-folder coverage and writes coverage_report.json
        ```

    Complexity: O(F + N) where F is the number of Python files parsed and N is the total number of functions across all files.
    """
    from core.config import load_config
    from core.parser.tree_sitter_parser import CodeParser

    path_abs = _resolve_workspace(os.path.abspath(path))
    config = load_config(path_abs)
    parser = CodeParser()

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as progress:
        t = progress.add_task("Scanning repository…", total=None)
        parsed_files = parser.parse_directory(path_abs, exclude=config.exclude)
        progress.update(t, completed=True, description=f"Scanned {len(parsed_files)} files")

    total_funcs = 0
    documented_funcs = 0
    by_folder: dict[str, tuple[int, int]] = {}

    for pf in parsed_files:
        folder = os.path.dirname(pf.path)
        all_funcs = [f for f in pf.functions if f.name != "<anonymous>"]
        for cls in pf.classes:
            all_funcs.extend(m for m in cls.methods if m.name != "<anonymous>")
        for func in all_funcs:
            total_funcs += 1
            t, d = by_folder.get(folder, (0, 0))
            by_folder[folder] = (t + 1, d)
            if func.existing_docstring:
                documented_funcs += 1
                by_folder[folder] = (t + 1, d + 1)

    overall_pct = (documented_funcs / total_funcs * 100) if total_funcs else 100.0

    table = Table(title=f"Documentation Coverage — {path_abs}")
    table.add_column("Folder", style="cyan")
    table.add_column("Functions", justify="right")
    table.add_column("Documented", justify="right")
    table.add_column("Coverage", justify="right")

    for folder, (total, doc) in sorted(by_folder.items()):
        pct = doc / total * 100 if total else 100.0
        color = "green" if pct >= config.coverage_threshold * 100 else "red"
        rel_folder = os.path.relpath(folder, path_abs) or "."
        table.add_row(rel_folder, str(total), str(doc), f"[{color}]{pct:.1f}%[/{color}]")

    table.add_row(
        "[bold]TOTAL[/bold]",
        f"[bold]{total_funcs}[/bold]",
        f"[bold]{documented_funcs}[/bold]",
        f"[bold]{overall_pct:.1f}%[/bold]",
        style="bold",
    )

    console.print(table)

    if output:
        report = {
            "overall_pct": overall_pct,
            "total": total_funcs,
            "documented": documented_funcs,
            "files": len(parsed_files),
            "by_folder": {k: {"total": v[0], "documented": v[1]} for k, v in by_folder.items()},
        }
        with open(output, "w") as f:
            json.dump(report, f, indent=2)
        console.print(f"Report written to {output}")

    if overall_pct < config.coverage_threshold * 100:
        console.print(
            f"\n[red]Coverage {overall_pct:.1f}% is below threshold {config.coverage_threshold * 100:.0f}%[/red]"
        )
        raise typer.Exit(1)


@app.command()
def drift(
    path: str = typer.Argument(".", help="Repository root"),
    fix: bool = typer.Option(
        False,
        "--fix",
        help="Auto-regenerate drifted docstrings (does not add docs to undocumented functions)",
    ),
    output: Optional[str] = typer.Option(None, "--output", help="Write JSON report to file"),
    auto_pr: bool = typer.Option(False, "--auto-pr", help="Open GitHub PR with fixes"),
    file: Optional[str] = typer.Option(
        None,
        "--file",
        help="Check a single file only (fast; used by the VS Code extension on save)",
    ),
) -> None:
    """
    Checks all functions in a repository for documentation drift and optionally auto-fixes or reports issues.

    Scans the given repository root for Python functions whose docstrings are missing or have drifted out of sync with the current implementation. Results are summarised in the console and optionally written to a JSON report file. When --fix is provided, drifted and undocumented functions are regenerated concurrently via an LLM gateway and injected back into their source files. When --auto-pr is provided (without --fix), a GitHub Pull Request is opened with the list of functions that need attention.

    Args:
        path (str): Filesystem path to the repository root to scan. Defaults to the current working directory ('.').
        fix (bool): When True, automatically regenerates docstrings for all drifted and undocumented functions using an LLM gateway and injects them into the source files. Defaults to False.
        output (Optional[str]): Optional file path to write a JSON report containing counts of total, drifted, undocumented, and up-to-date functions. If None, no file is written.
        auto_pr (bool): When True, opens a GitHub Pull Request containing the list of functions with documentation drift. Only has an effect when --fix is not used. Defaults to False.
        file (Optional[str]): If provided, checks only this single file instead of scanning the whole repository (fast path used by the VS Code extension on save). Defaults to None.

    Returns:
        None: This function does not return a value; all output is written to the console, optionally to a JSON file, or committed via a GitHub PR.

    Example:
        ```
        # Check for drift and write a JSON report, then auto-fix all issues:
        # $ wright drift ./my_project --fix --output report.json

        # Programmatic invocation via Typer test runner:
        from typer.testing import CliRunner
        from cli.main import app
        runner = CliRunner()
        result = runner.invoke(app, ['drift', './my_project', '--output', 'drift_report.json'])
        print(result.output)
        ```
    """
    from core.drift.drift_detector import DriftDetector

    path_abs = _resolve_workspace(os.path.abspath(path))
    cache = _get_cache(path_abs)
    detector = DriftDetector()

    # Use LLM path when either Anthropic or Gemini key is present; structural-only otherwise.
    # This allows the extension subprocess (which may not inherit .env) to still run.
    # When only GEMINI_API_KEY is set, LLMGateway receives an empty anthropic_key and
    # its internal fallback routes all calls to Gemini after the first 401.
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY")

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as progress:
        t = progress.add_task("Checking drift...", total=None)
        if anthropic_key or gemini_key:
            from core.llm.gateway import LLMGateway

            gateway = LLMGateway(
                anthropic_key=anthropic_key,
                gemini_key=gemini_key,
            )
            if file:
                file_abs = os.path.abspath(file)
                sem = asyncio.Semaphore(5)
                results = asyncio.run(detector.check_file_async(file_abs, cache, gateway, sem))
            else:
                results = asyncio.run(detector.check_directory_async(path_abs, cache, gateway))
        else:
            if file:
                file_abs = os.path.abspath(file)
                results = detector.check_file(file_abs, cache)
            else:
                results = detector.check_directory(path_abs, cache)
        progress.update(t, completed=True)

    # Push baselines + drift results to Supabase so the dashboard reflects this
    # CLI run without needing the VS Code extension to be active.
    _sync_baselines_to_api(cache, results, path_abs)
    _sync_results_to_api(results, path_abs)

    total = len(results)
    drifted_res = [r for r in results if r.status == "drifted"]
    undoc_res = [r for r in results if r.status == "undocumented"]
    up_to_date = total - len(drifted_res) - len(undoc_res)

    console.print(
        f"[bold]Checked:[/bold] {total}  "
        f"[red]Drifted:[/red] {len(drifted_res)}  "
        f"[yellow]Undocumented:[/yellow] {len(undoc_res)}  "
        f"[green]Up to date:[/green] {up_to_date}"
    )

    if output:
        import json as _json

        with open(output, "w") as _f:
            _json.dump(
                {
                    "total": total,
                    "drifted": len(drifted_res),
                    "undocumented": len(undoc_res),
                    "up_to_date": up_to_date,
                    "results": [
                        {
                            "function_name": r.function_name,
                            "file_path": r.file_path,
                            "status": r.status,
                            "reason": r.reason,
                            "old_signature": r.old_signature,
                            "new_signature": r.new_signature,
                            "line": r.line,
                            "src_hash": r.src_hash,
                            "doc_hash": r.doc_hash,
                        }
                        for r in results
                    ],
                },
                _f,
            )

    needs_attention = drifted_res + undoc_res
    if not needs_attention:
        console.print("[green]All documentation is up to date![/green]")
        return

    if fix:
        # Only fix drifted functions — undocumented functions are left for the user to generate
        fix_targets = drifted_res
        if not fix_targets:
            console.print(
                "[green]No drifted functions to fix. Use [bold]wright generate[/bold] to document undocumented functions.[/green]"
            )
            return

        from core.config import load_config
        from core.llm.prompts import LANGUAGE_DEFAULT_STYLE
        from core.output.injector import DocstringInjector
        from core.parser.dep_graph import DependencyGraph
        from core.parser.tree_sitter_parser import CodeParser
        from core.retrieval.hybrid_retriever import HybridRetriever

        config = load_config(path_abs)
        gateway = _build_gateway()
        parser = CodeParser()
        injector = DocstringInjector()

        # Group by file
        from collections import defaultdict

        by_file: dict = defaultdict(list)
        for r in fix_targets:
            by_file[r.file_path].append(r.function_name)

        # Build retriever for context — best-effort, skip if embeddings unavailable
        retriever = None
        with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as prog:
            t = prog.add_task("Building context index…", total=None)
            try:
                embedder = _build_embedder()
                chroma = _get_chroma(path_abs)
                dep_graph = DependencyGraph()
                dep_graph.build(parser.parse_directory(path_abs))
                retriever = HybridRetriever(chroma, dep_graph, embedder)
            except Exception:
                pass  # proceed without retrieval context
            prog.update(t, completed=True)

        async def _fix_all() -> int:
            # Generate all docstrings concurrently (LLM calls are independent)
            # but inject them file-by-file sequentially to avoid write conflicts.

            async def _generate_one(file_path: str, func) -> tuple:
                lang = func.language if hasattr(func, "language") else None
                doc_style = LANGUAGE_DEFAULT_STYLE.get(lang, config.style) if lang else config.style
                try:
                    context = retriever.retrieve_for_function(func) if retriever else []
                    doc, _llm = await gateway.generate_docstring(func, context, doc_style)
                    return (file_path, func, doc, doc_style, None)
                except Exception as e:
                    return (file_path, func, None, doc_style, str(e))

            # Collect all (file_path, func) pairs — include class methods
            work = []
            for file_path, func_names in by_file.items():
                pf = parser.parse_file(file_path)
                candidates = {f.name: f for f in pf.functions if f.name != "<anonymous>"}
                for cls in pf.classes:
                    for m in cls.methods:
                        if m.name != "<anonymous>":
                            candidates[f"{cls.name}.{m.name}"] = m
                for qname in func_names:
                    if qname in candidates:
                        work.append((file_path, candidates[qname]))

            console.print(
                f"Regenerating docs for [bold]{len(work)}[/bold] drifted functions (max 5 concurrent LLM calls)…"
            )

            # Generate concurrently with rate-limit cap
            sem = asyncio.Semaphore(5)

            async def _guarded(fp, fn):
                async with sem:
                    return await _generate_one(fp, fn)

            generated = await asyncio.gather(*[_guarded(fp, fn) for fp, fn in work])

            # Group results by file and inject sequentially per file to avoid write conflicts
            from collections import defaultdict

            by_file_results: dict = defaultdict(list)
            for item in generated:
                if item[2] is not None:  # doc is not None
                    by_file_results[item[0]].append(item)
                else:
                    console.print(f"[red]✕[/red] {item[1].name}: {item[4]}")

            fixed = 0
            for file_path, items in by_file_results.items():
                # Inject bottom-to-top so earlier insertions don't shift byte
                # offsets for functions that appear later in the file.
                sorted_items = sorted(items, key=lambda x: x[1].start_byte, reverse=True)
                for _, func, doc, doc_style, _ in sorted_items:
                    result = injector.inject(file_path, func, doc, doc_style, dry_run=False)
                    if result.success:
                        fixed += 1
                    else:
                        console.print(f"[red]✕[/red] {func.name}: inject failed")

            return fixed

        fixed = asyncio.run(_fix_all())
        console.print(f"[green]Fixed {fixed} / {len(fix_targets)} drifted functions.[/green]")
        return

    table = Table(title="Documentation Drift")
    table.add_column("Function", style="cyan")
    table.add_column("File", style="dim")
    table.add_column("Status", style="yellow")
    table.add_column("Reason")

    for r in needs_attention:
        status_str = (
            "[red]drifted[/red]" if r.status == "drifted" else "[yellow]undocumented[/yellow]"
        )
        table.add_row(r.function_name, os.path.basename(r.file_path), status_str, r.reason or "")

    console.print(table)
    if drifted_res:
        console.print(
            f"\n[dim]Run with [bold]--fix[/bold] to auto-regenerate {len(drifted_res)} drifted function(s). Use [bold]wright generate[/bold] to document undocumented ones.[/dim]"
        )

    if auto_pr:
        _open_drift_pr(path_abs, needs_attention)


def _open_drift_pr(repo_root: str, drifted: list) -> None:
    """
    Placeholder for opening a GitHub pull request listing drifted/undocumented functions.

    Called by the drift() command when --auto-pr is set. Currently only checks
    for the GITHUB_TOKEN environment variable and prints a status message — it
    does not push changes or create a pull request yet.

    Args:
        repo_root (str): Root directory of the repository the PR would be opened against.
        drifted (list): DriftResult items (drifted and/or undocumented functions) that
            would be summarized in the pull request description.

    Returns:
        None: This function does not return a value.
    """
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        console.print("[red]GITHUB_TOKEN not set — cannot open PR[/red]")
        return

    console.print("[yellow]Auto-PR requires pushing changes. Feature coming soon.[/yellow]")


@app.command()
def chat(path: str = typer.Argument(".", help="Repository root")) -> None:
    """
    Starts an interactive command-line chat session that answers natural-language questions about a codebase using hybrid retrieval and an LLM gateway.

    Resolves the repository root, builds the dependency graph via CodeParser and DependencyGraph, connects to the ChromaDB vector store, and enters a read-eval-print loop where the user can ask questions about the codebase. Each question is answered by retrieving the top-5 relevant code contexts through HybridRetriever (combining vector similarity and PageRank scores) and then querying the configured LLM gateway. If the vector index is empty, a tip is printed advising the user to run `wright init` first. The loop exits on 'exit', 'quit', 'q', EOF, or KeyboardInterrupt.

    Args:
        path (str): Filesystem path to the repository root. Defaults to the current working directory ('.'). Resolved to an absolute path before use.

    Returns:
        None: This function does not return a value; it drives an interactive REPL loop until the user exits.

    Raises:
        SystemExit: Raised by Typer if invalid CLI arguments are provided.

    Example:
        ```
        # From the terminal:
        # wright chat /home/user/my_project

        # Or programmatically via Typer test runner:
        from typer.testing import CliRunner
        from cli.main import app

        runner = CliRunner()
        result = runner.invoke(app, ['chat', '/home/user/my_project'], input='What does main.py do?\nexit\n')
        print(result.output)
        ```
    """
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    path_abs = _resolve_workspace(os.path.abspath(path))
    console.print(f"[bold green]Wright Codebase Chat[/bold green] — {path_abs}")
    console.print("Type your question, or 'exit' to quit.\n")

    gateway = _build_gateway()
    embedder = _build_embedder()
    chroma = _get_chroma(path_abs)

    # Build the dependency graph so PageRank scores are available for retrieval.
    with console.status("Indexing repository..."):
        parser = CodeParser()
        parsed_files = parser.parse_directory(path_abs)
        dep_graph = DependencyGraph()
        dep_graph.build(parsed_files)

    # Warn if the vector index is empty — retrieval will fall back to PageRank only.
    if chroma.count() == 0:
        console.print(
            "[yellow]Tip: run [bold]wright init .[/bold] first to index your codebase "
            "for better search results.[/yellow]\n"
        )

    retriever = HybridRetriever(chroma, dep_graph, embedder)

    async def _run() -> None:
        while True:
            try:
                question = typer.prompt("You")
            except (KeyboardInterrupt, EOFError):
                break
            if question.lower() in ("exit", "quit", "q"):
                break

            with console.status("Thinking..."):
                try:
                    contexts = retriever.retrieve_for_query(question, n=5)
                    answer, citations = await gateway.chat(question, contexts)
                except Exception as e:
                    console.print(f"[red]Error: {e}[/red]")
                    continue

            console.print(f"\n[bold cyan]Wright:[/bold cyan] {answer}")
            if citations:
                console.print(f"[dim]Sources: {', '.join(citations)}[/dim]")
            console.print()

    asyncio.run(_run())


@app.command()
def llms_txt(path: str = typer.Argument(".", help="Repository root")) -> None:
    """
    Generates or updates an llms.txt file in the specified repository root by parsing the codebase and writing structured LLM-friendly content.

    This CLI command resolves the target repository path, parses all source files using a tree-sitter-based code parser, and asynchronously generates an llms.txt file via LLMSTxtWriter. Progress is displayed in the terminal using a spinner. The resulting file is written directly to the repository root directory.

    Args:
        path (str): Path to the repository root directory. Defaults to the current working directory ('.'). Resolved to an absolute path before processing.

    Returns:
        None: This function does not return a value. It writes the generated llms.txt file to disk as a side effect.

    Example:
        ```
        # From the command line:
        # wright llms-txt /path/to/my-repo

        # Or using the default current directory:
        # wright llms-txt

        # Programmatically (if invoking directly):
        llms_txt(path="/home/user/projects/my-repo")
        ```
    """
    from core.output.llms_txt import LLMSTxtWriter
    from core.parser.tree_sitter_parser import CodeParser

    path_abs = _resolve_workspace(os.path.abspath(path))
    parser = CodeParser()
    gateway = _build_gateway()

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as progress:
        t = progress.add_task("Parsing repository...", total=None)
        parsed_files = parser.parse_directory(path_abs)
        progress.update(t, description="Generating llms.txt...")
        repo_name = os.path.basename(path_abs)
        writer = LLMSTxtWriter()

        async def _run() -> None:
            content = await writer.generate(path_abs, parsed_files, repo_name, gateway)
            writer.write(content, path_abs)

        try:
            asyncio.run(_run())
        except Exception as e:
            progress.update(t, completed=True)
            console.print(f"[red]Error generating llms.txt: {e}[/red]")
            raise typer.Exit(1)
        progress.update(t, completed=True)

    console.print(f"[green]llms.txt written to {path_abs}/llms.txt[/green]")


if __name__ == "__main__":
    app()
