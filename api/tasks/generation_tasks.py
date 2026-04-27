from __future__ import annotations

import asyncio
import os

from api.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="api.tasks.generation_tasks.generate_file_docs")
def generate_file_docs(self, file_path: str, repo_root: str, style: str, dry_run: bool) -> dict:
    from core.config import load_config
    from core.embeddings.chroma_store import ChromaStore
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    from core.llm.gateway import LLMGateway
    from core.llm.prompts import DocStyle
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    config = load_config(repo_root)
    parser = CodeParser()
    gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
    embedder = VoyageEmbedder(api_key=os.getenv("VOYAGE_API_KEY", ""))
    chroma_path = os.getenv("CHROMA_PATH", os.path.join(repo_root, ".wright", "chroma"))
    chroma = ChromaStore(persist_path=chroma_path, repo_root=repo_root)
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
            doc = await gateway.generate_docstring(func, context, doc_style)
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
