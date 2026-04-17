from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

load_dotenv()

app = typer.Typer(name="wright", help="AI-powered code documentation", add_completion=False)
console = Console()


def _require_env(key: str) -> str:
    val = os.getenv(key)
    if not val:
        console.print(f"[red]Error: {key} is not set. Add it to your .env file.[/red]")
        raise typer.Exit(1)
    return val


def _build_gateway() -> "LLMGateway":
    from core.llm.gateway import LLMGateway
    return LLMGateway(
        anthropic_key=_require_env("ANTHROPIC_API_KEY"),
        openai_key=os.getenv("OPENAI_API_KEY"),
    )


def _build_embedder() -> "VoyageEmbedder":
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    voyage_key = os.getenv("VOYAGE_API_KEY", "")
    return VoyageEmbedder(api_key=voyage_key)


def _get_cache(repo_root: str) -> "ASTCache":
    from core.parser.cache import ASTCache
    cache_path = os.getenv("SQLITE_CACHE_PATH", os.path.join(repo_root, ".wright", "ast_cache.db"))
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    return ASTCache(cache_path)


def _get_chroma(repo_root: str) -> "ChromaStore":
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

    total_funcs = sum(len(pf.functions) for pf in parsed_files)
    documented = sum(
        1 for pf in parsed_files for f in pf.functions if f.existing_docstring
    )
    console.print(f"\n[bold]Scan results:[/bold]")
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
    style: Optional[str] = typer.Option(None, help="Override doc style (google/numpy/jsdoc/epytext/rust)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview without writing"),
    watch: bool = typer.Option(False, "--watch", help="Watch for changes"),
) -> None:
    """Generate docstrings for all undocumented functions."""
    from core.config import load_config
    from core.llm.prompts import DocStyle
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    path_abs = os.path.abspath(path)
    repo_root = path_abs if os.path.isdir(path_abs) else os.path.dirname(path_abs)
    config = load_config(repo_root)
    doc_style = DocStyle(style) if style else config.style

    gateway = _build_gateway()
    embedder = _build_embedder()
    cache = _get_cache(repo_root)
    chroma = _get_chroma(repo_root)
    parser = CodeParser()
    injector = DocstringInjector()

    if os.path.isfile(path_abs):
        parsed_files = [parser.parse_file(path_abs)]
    else:
        parsed_files = parser.parse_directory(path_abs, exclude=config.exclude)

    dep_graph = DependencyGraph()
    dep_graph.build(parsed_files)
    retriever = HybridRetriever(chroma, dep_graph, embedder)

    undoc_funcs = [
        (pf, f)
        for pf in parsed_files
        for f in pf.functions
        if not f.existing_docstring
    ]

    if not undoc_funcs:
        console.print("[green]All functions are already documented![/green]")
        return

    console.print(f"\nGenerating docs for [bold]{len(undoc_funcs)}[/bold] undocumented functions...")
    if dry_run:
        console.print("[yellow](Dry run — no files will be modified)[/yellow]")

    results_table = Table(title="Generation Results")
    results_table.add_column("Function", style="cyan")
    results_table.add_column("File", style="dim")
    results_table.add_column("Status", style="green")

    async def _run() -> None:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console,
        ) as progress:
            task = progress.add_task("Generating...", total=len(undoc_funcs))

            for pf, func in undoc_funcs:
                progress.update(task, description=f"[cyan]{func.name}[/cyan]")
                try:
                    context = retriever.retrieve_for_function(func)
                    doc = await gateway.generate_docstring(func, context, doc_style)
                    result = injector.inject(func.file_path, func, doc, doc_style, dry_run=dry_run)
                    status = "✓ preview" if dry_run else ("✓ injected" if result.success else f"✗ {result.error}")
                    results_table.add_row(func.name, os.path.basename(func.file_path), status)
                except Exception as e:
                    results_table.add_row(func.name, os.path.basename(func.file_path), f"[red]Error: {e}[/red]")
                progress.advance(task)

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

    path_abs = os.path.abspath(path)
    config = load_config(path_abs)
    parser = CodeParser()
    parsed_files = parser.parse_directory(path_abs, exclude=config.exclude)

    total_funcs = 0
    documented_funcs = 0
    by_folder: dict[str, tuple[int, int]] = {}

    for pf in parsed_files:
        folder = os.path.dirname(pf.path)
        for func in pf.functions:
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
            "by_folder": {k: {"total": v[0], "documented": v[1]} for k, v in by_folder.items()},
        }
        with open(output, "w") as f:
            json.dump(report, f, indent=2)
        console.print(f"Report written to {output}")

    if overall_pct < config.coverage_threshold * 100:
        console.print(f"\n[red]Coverage {overall_pct:.1f}% is below threshold {config.coverage_threshold * 100:.0f}%[/red]")
        raise typer.Exit(1)


@app.command()
def drift(
    path: str = typer.Argument(".", help="Repository root"),
    since: str = typer.Option("HEAD~1", "--since", help="Git ref to compare against"),
    auto_pr: bool = typer.Option(False, "--auto-pr", help="Open GitHub PR with fixes"),
) -> None:
    """Check for documentation drift since a git ref."""
    from core.drift.drift_detector import DriftDetector

    path_abs = os.path.abspath(path)
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
        status_str = "[red]drifted[/red]" if r.status == "drifted" else "[yellow]undocumented[/yellow]"
        table.add_row(r.function_name, os.path.basename(r.file_path), status_str, r.reason or "")

    console.print(table)

    if auto_pr:
        _open_drift_pr(path_abs, drifted)


def _open_drift_pr(repo_root: str, drifted: list) -> None:
    import httpx
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        console.print("[red]GITHUB_TOKEN not set — cannot open PR[/red]")
        return

    console.print("[yellow]Auto-PR requires pushing changes. Feature coming soon.[/yellow]")


@app.command()
def chat(path: str = typer.Argument(".", help="Repository root")) -> None:
    """Start an interactive codebase chat session."""
    from core.embeddings.chroma_store import ChromaStore
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    path_abs = os.path.abspath(path)
    console.print(f"[bold green]Wright Codebase Chat[/bold green] — {path_abs}")
    console.print("Type your question, or 'exit' to quit.\n")

    gateway = _build_gateway()
    embedder = _build_embedder()
    chroma = _get_chroma(path_abs)
    dep_graph = DependencyGraph()
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
    from core.config import load_config
    from core.output.llms_txt import LLMSTxtWriter
    from core.parser.tree_sitter_parser import CodeParser

    path_abs = os.path.abspath(path)
    config = load_config(path_abs)
    parser = CodeParser()
    gateway = _build_gateway()

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as progress:
        t = progress.add_task("Parsing repository...", total=None)
        parsed_files = parser.parse_directory(path_abs, exclude=config.exclude)
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
