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
    """Walk up from path to find the directory containing .wright.json."""
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
    Retrieves a required environment variable value or exits the application if it is not set.

    This function attempts to read an environment variable by key. If the variable is not set or empty, it prints a red error message to the console instructing the user to add it to their .env file and exits the application with code 1.

    Args:
        key (str): The name of the environment variable to retrieve.

    Returns:
        str: The value of the environment variable.

    Raises:
        typer.Exit: When the environment variable is not set or is empty.

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
    Builds and returns an LLMGateway instance configured with API keys from environment variables.

    Creates an LLMGateway object by reading the Anthropic API key (required) and OpenAI API key (optional) from environment variables. The Anthropic key must be present or an exception will be raised.

    Returns:
        LLMGateway: A configured LLMGateway instance with Anthropic and OpenAI API keys.

    Raises:
        KeyError: When the ANTHROPIC_API_KEY environment variable is not set.

    Example:
        ```
        gateway = _build_gateway()
        ```
    """
    from core.llm.gateway import LLMGateway

    return LLMGateway(
        anthropic_key=_require_env("ANTHROPIC_API_KEY"),
        openai_key=os.getenv("OPENAI_API_KEY"),
    )


def _build_embedder() -> "VoyageEmbedder":
    """
    Builds and returns a VoyageEmbedder instance configured with the API key from environment variables.

    Creates a VoyageEmbedder object by retrieving the VOYAGE_API_KEY from the environment. If the environment variable is not set, an empty string is used as the API key.

    Returns:
        VoyageEmbedder: A configured VoyageEmbedder instance initialized with the API key from the VOYAGE_API_KEY environment variable.

    Example:
        ```
        embedder = _build_embedder()
        ```
    """
    from core.embeddings.voyage_embeddings import VoyageEmbedder

    voyage_key = os.getenv("VOYAGE_API_KEY", "")
    return VoyageEmbedder(api_key=voyage_key)


def _get_cache(repo_root: str) -> "ASTCache":
    """
    Retrieves or initializes an ASTCache instance for the specified repository root.

    Creates an ASTCache instance using a cache database path determined by the SQLITE_CACHE_PATH environment variable or a default path within the .wright directory. Ensures the cache directory exists before instantiating the cache.

    Args:
        repo_root (str): The root directory path of the repository where the cache should be stored.

    Returns:
        ASTCache: An initialized ASTCache instance configured with the determined cache database path.

    Raises:
        OSError: When the cache directory cannot be created due to permission issues or invalid path.

    Example:
        ```
        cache = _get_cache('/path/to/repo')
        ```
    """
    from core.parser.cache import ASTCache

    cache_path = os.getenv("SQLITE_CACHE_PATH", os.path.join(repo_root, ".wright", "ast_cache.db"))
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    return ASTCache(cache_path)


def _get_chroma(repo_root: str) -> "ChromaStore":
    """
    Initializes and returns a ChromaStore instance for vector embeddings storage.

    Creates a ChromaStore object using either the CHROMA_PATH environment variable or a default path within the repository's .wright directory. This function serves as a factory method for obtaining a configured ChromaStore instance.

    Args:
        repo_root (str): The root directory path of the repository where the Chroma database will be stored.

    Returns:
        ChromaStore: A configured ChromaStore instance with the persistence path set to either the environment variable CHROMA_PATH or the default .wright/chroma directory.

    Example:
        ```
        chroma_store = _get_chroma('/path/to/repo')
        ```
    """
    from core.embeddings.chroma_store import ChromaStore

    chroma_path = os.getenv("CHROMA_PATH", os.path.join(repo_root, ".wright", "chroma"))
    return ChromaStore(persist_path=chroma_path, repo_root=repo_root)


@app.command()
def init(repo: str = typer.Argument(".", help="Repository root")) -> None:
    """Initialize Wright for a repository."""
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

    named_funcs = [f for pf in parsed_files for f in pf.functions if f.name != "<anonymous>"]
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
    undoc = [f for pf in parsed_files for f in pf.functions if not f.existing_docstring][:3]
    if undoc:
        console.print("\n[bold]Sample undocumented functions:[/bold]")
        for f in undoc:
            console.print(f"  • [cyan]{f.name}[/cyan] in {f.file_path}:{f.start_line + 1}")

    confirm = typer.confirm("\nWrite .wright.json configuration?", default=True)
    if confirm:
        config = WrightConfig(languages=[detected_lang])
        save_config(config, repo_path)
        console.print("[green]Created .wright.json[/green]")


@app.command()
def generate(
    path: str = typer.Argument(".", help="File or directory to document"),
    style: Optional[str] = typer.Option(
        None, help="Override doc style (google/numpy/jsdoc/epytext/rust)"
    ),
    verbosity: str = typer.Option("standard", "--verbosity", help="concise/standard/detailed"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview without writing"),
    watch: bool = typer.Option(False, "--watch", help="Watch for changes"),
) -> None:
    """Generate docstrings for all undocumented functions."""
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
    _get_cache(repo_root)
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

    undoc_funcs = [
        (pf, f)
        for pf in parsed_files
        for f in pf.functions
        if not f.existing_docstring and f.name != "<anonymous>"
    ]

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
                                func = next(
                                    (f for f in fresh_parsed.functions if f.name == func.name),
                                    func,
                                )

                            effective_style = (
                                doc_style
                                if style
                                else LANGUAGE_DEFAULT_STYLE.get(func.language, doc_style)
                            )
                            context = retriever.retrieve_for_function(func)
                            doc = await gateway.generate_docstring(
                                func, context, effective_style, verbosity=verbosity
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
    """Show documentation coverage."""
    from core.config import load_config
    from core.parser.tree_sitter_parser import CodeParser

    path_abs = _resolve_workspace(os.path.abspath(path))
    config = load_config(path_abs)
    parser = CodeParser()
    parsed_files = parser.parse_directory(path_abs)

    total_funcs = 0
    documented_funcs = 0
    by_folder: dict[str, tuple[int, int]] = {}

    for pf in parsed_files:
        folder = os.path.dirname(pf.path)
        for func in pf.functions:
            if func.name == "<anonymous>":
                continue
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
    since: str = typer.Option("HEAD~1", "--since", help="Git ref to compare against"),
    auto_pr: bool = typer.Option(False, "--auto-pr", help="Open GitHub PR with fixes"),
) -> None:
    """Check for documentation drift since a git ref."""
    from core.drift.drift_detector import DriftDetector

    path_abs = _resolve_workspace(os.path.abspath(path))
    cache = _get_cache(path_abs)
    detector = DriftDetector()

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as progress:
        t = progress.add_task("Checking drift...", total=None)
        try:
            results = detector.check_git_diff(path_abs, base_ref=since)
        except Exception:
            results = detector.check_directory(path_abs, cache)
        progress.update(t, completed=True)

    drifted = [r for r in results if r.status in ("drifted", "undocumented")]

    if not drifted:
        console.print("[green]No drift detected — all documentation is up to date![/green]")
        return

    table = Table(title="Documentation Drift")
    table.add_column("Function", style="cyan")
    table.add_column("File", style="dim")
    table.add_column("Status", style="yellow")
    table.add_column("Reason")

    for r in drifted:
        status_str = (
            "[red]drifted[/red]" if r.status == "drifted" else "[yellow]undocumented[/yellow]"
        )
        table.add_row(r.function_name, os.path.basename(r.file_path), status_str, r.reason or "")

    console.print(table)

    if auto_pr:
        _open_drift_pr(path_abs, drifted)


def _open_drift_pr(repo_root: str, drifted: list) -> None:
    """
    Attempts to open a GitHub pull request for drifted infrastructure resources, currently a placeholder feature.

    Checks for the presence of a GITHUB_TOKEN environment variable and notifies the user that automatic PR creation functionality is not yet implemented. This function is intended to automate the process of creating pull requests when infrastructure drift is detected.

    Args:
        repo_root (str): The root directory path of the repository where the PR would be created.
        drifted (list): A list of drifted resources or configurations that would be included in the PR description.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        _open_drift_pr('/path/to/repo', ['resource1', 'resource2'])
        ```
    """
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        console.print("[red]GITHUB_TOKEN not set — cannot open PR[/red]")
        return

    console.print("[yellow]Auto-PR requires pushing changes. Feature coming soon.[/yellow]")


@app.command()
def chat(path: str = typer.Argument(".", help="Repository root")) -> None:
    """Start an interactive codebase chat session."""
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
                contexts = retriever.retrieve_for_query(question, n=5)
                answer, citations = await gateway.chat(question, contexts)

            console.print(f"\n[bold cyan]Wright:[/bold cyan] {answer}")
            if citations:
                console.print(f"[dim]Sources: {', '.join(citations)}[/dim]")
            console.print()

    asyncio.run(_run())


@app.command()
def llms_txt(path: str = typer.Argument(".", help="Repository root")) -> None:
    """Generate or update llms.txt in the repository root."""
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

        asyncio.run(_run())
        progress.update(t, completed=True)

    console.print(f"[green]llms.txt written to {path_abs}/llms.txt[/green]")


if __name__ == "__main__":
    app()
