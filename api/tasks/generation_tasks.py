from __future__ import annotations

import asyncio
import os

from api.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="api.tasks.generation_tasks.generate_file_docs")
def generate_file_docs(self, file_path: str, repo_root: str, style: str, dry_run: bool) -> dict:
    """
    Generates and injects AI-produced docstrings for all undocumented functions in a Python file or directory as a Celery background task.

    This Celery task orchestrates the full documentation generation pipeline: it parses Python source files to extract functions, builds a dependency graph, retrieves relevant context via hybrid retrieval (vector + graph), generates docstrings using an LLM gateway, and optionally injects the generated documentation back into the source files. Progress is reported via Celery state updates throughout processing, and a summary of results is returned for each processed function.

    Args:
        file_path (str): Path to a single Python file or a directory containing Python files to document.
        repo_root (str): Root directory of the repository, used for configuration loading and relative path resolution.
        style (str): Documentation style to use (e.g., 'google', 'numpy'); if empty, falls back to the style defined in the loaded config.
        dry_run (bool): If True, generates docstring previews without modifying source files; if False, injects the generated docstrings directly into the source files.

    Returns:
        dict: A dictionary with two keys: 'results' (a list of dicts each containing 'function', 'file', 'success', 'preview', and 'error' for every processed function) and 'total' (the integer count of undocumented functions processed).

    Example:
        ```
        result = generate_file_docs.delay('src/my_module.py', '/path/to/repo', 'google', True)
        output = result.get()
        # output => {'results': [{'function': 'my_func', 'file': 'src/my_module.py', 'success': True, 'preview': '...', 'error': None}], 'total': 1}
        ```

    Complexity: O(n*m) where n is the number of undocumented functions and m is the average time for LLM generation and hybrid retrieval per function.
    """
    from api.chroma_cache import get as get_chroma
    from api.embedder import get_embedder
    from core.config import load_config
    from api.embedder import get_gateway
    from core.llm.prompts import DocStyle
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    config = load_config(repo_root)
    parser = CodeParser()
    gateway = get_gateway()
    embedder = get_embedder()
    chroma_path = os.getenv("CHROMA_PATH", os.path.join(repo_root, ".wright", "chroma"))
    chroma = get_chroma(chroma_path, repo_root)
    dep_graph = DependencyGraph()
    injector = DocstringInjector()
    doc_style = DocStyle(style) if style else config.style

    if os.path.isfile(file_path):
        parsed_files = [parser.parse_file(file_path)]
    else:
        parsed_files = parser.parse_directory(file_path, exclude=config.exclude)

    dep_graph.build(parsed_files)
    retriever = HybridRetriever(chroma, dep_graph, embedder)

    undoc_funcs = [(pf, f) for pf in parsed_files for f in pf.functions if not f.existing_docstring]

    results = []
    total = len(undoc_funcs)

    async def _process() -> None:
        for i, (pf, func) in enumerate(undoc_funcs):
            self.update_state(
                state="PROGRESS",
                meta={"current": i, "total": total, "function": func.name},
            )
            context = retriever.retrieve_for_function(func)
            doc, _tokens = await gateway.generate_docstring(func, context, doc_style)
            result = injector.inject(func.file_path, func, doc, doc_style, dry_run=dry_run)
            results.append(
                {
                    "function": func.name,
                    "file": func.file_path,
                    "success": result.success,
                    "preview": result.preview,
                    "error": result.error,
                }
            )

    asyncio.get_event_loop().run_until_complete(_process())
    return {"results": results, "total": total}
