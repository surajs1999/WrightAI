from __future__ import annotations

import asyncio
import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/generate", tags=["generate"], dependencies=[Depends(verify_api_key)])


class GenerateRequest(BaseModel):
    file_path: str
    function_name: str | None = None
    repo_root: str
    style: str = "google"
    dry_run: bool = False
    batch: bool = False
    snippet: str | None = None  # raw code; if set, written to a temp file before parsing


class GenerateResponse(BaseModel):
    success: bool
    function_name: str | None
    preview: str | None
    injected_at_line: int | None
    error: str | None
    job_id: str | None = None
    token_usage: dict | None = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float | None
    result: dict | None
    error: str | None


@router.post("", response_model=GenerateResponse)
async def generate_docstring(request: GenerateRequest) -> GenerateResponse:
    if request.batch:
        from api.tasks.generation_tasks import generate_file_docs
        task = generate_file_docs.delay(
            file_path=request.file_path,
            repo_root=request.repo_root,
            style=request.style,
            dry_run=request.dry_run,
        )
        return GenerateResponse(
            success=True,
            function_name=None,
            preview=None,
            injected_at_line=None,
            error=None,
            job_id=task.id,
        )

    from core.config import load_config
    from core.embeddings.chroma_store import ChromaStore
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    from core.llm.gateway import LLMGateway
    from core.llm.prompts import DocStyle
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    config = load_config(request.repo_root)
    parser = CodeParser()

    # If raw code was sent, write it to a temp file so the parser can read it
    _tmp_path: str | None = None
    file_path = request.file_path
    if request.snippet:
        suffix = os.path.splitext(request.file_path)[1] or ".py"
        _tmp = tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False)
        _tmp.write(request.snippet)
        _tmp.close()
        _tmp_path = _tmp.name
        file_path = _tmp_path

    import pathlib
    if pathlib.Path(file_path).is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"'{file_path}' is a directory, not a file. Enter a full file path, e.g. core/embeddings/voyage_embeddings.py",
        )

    try:
        parsed_file = parser.parse_file(file_path)
    except Exception as e:
        if _tmp_path:
            os.unlink(_tmp_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    func = None
    if request.function_name:
        for f in parsed_file.functions:
            if f.name == request.function_name:
                func = f
                break
        if func is None:
            if _tmp_path:
                os.unlink(_tmp_path)
            raise HTTPException(status_code=404, detail=f"Function '{request.function_name}' not found")
    elif parsed_file.functions:
        func = parsed_file.functions[0]
    else:
        if _tmp_path:
            os.unlink(_tmp_path)
        raise HTTPException(status_code=400, detail="No functions found in file")

    gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
    embedder = VoyageEmbedder(api_key=os.getenv("VOYAGE_API_KEY", ""))
    chroma_path = os.getenv("CHROMA_PATH", os.path.join(request.repo_root, ".wright", "chroma"))
    chroma = ChromaStore(persist_path=chroma_path, repo_root=request.repo_root)
    dep_graph = DependencyGraph()
    dep_graph.build([parsed_file])
    retriever = HybridRetriever(chroma, dep_graph, embedder)
    injector = DocstringInjector()

    doc_style = DocStyle(request.style)
    context = retriever.retrieve_for_function(func)
    doc = await gateway.generate_docstring(func, context, doc_style)
    result = injector.inject(func.file_path, func, doc, doc_style, dry_run=True)

    if _tmp_path:
        os.unlink(_tmp_path)

    return GenerateResponse(
        success=result.success,
        function_name=func.name,
        preview=result.preview,
        injected_at_line=result.injected_at_line,
        error=result.error,
        token_usage=None,
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    from api.tasks.celery_app import celery_app
    from celery.result import AsyncResult

    result = AsyncResult(job_id, app=celery_app)
    status = result.status.lower()
    progress = None
    task_result = None
    error = None

    if status == "progress":
        meta = result.info or {}
        current = meta.get("current", 0)
        total = meta.get("total", 1)
        progress = current / total if total > 0 else 0.0
        status = "started"
    elif status == "success":
        task_result = result.result
        progress = 1.0
    elif status == "failure":
        error = str(result.result)

    return JobStatusResponse(
        job_id=job_id,
        status=status,
        progress=progress,
        result=task_result,
        error=error,
    )
