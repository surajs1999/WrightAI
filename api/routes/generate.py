from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/generate", tags=["generate"], dependencies=[Depends(verify_api_key)])


class GenerateRequest(BaseModel):
    file_path: str
    function_name: str | None = None
    repo_root: str
    style: str = "google"
    verbosity: str = "standard"
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
async def generate_docstring(request: GenerateRequest, http_request: Request) -> GenerateResponse:
    """
    Generates a docstring for a specified function in a Python file using AI and contextual code analysis.

    This endpoint accepts a request to generate documentation for a Python function. It supports both batch processing (via Celery task queue) and synchronous generation. For synchronous requests, it parses the target file, retrieves relevant context using hybrid retrieval (embeddings + dependency graph), generates a docstring using an LLM gateway, and returns a preview of the injected documentation. Handles both file paths and raw code snippets by creating temporary files when needed.

    Args:
        request (GenerateRequest): Request object containing file_path, optional function_name, repo_root, style preferences, batch flag, optional snippet, and dry_run flag.

    Returns:
        GenerateResponse: Response object containing success status, function name, docstring preview, injection line number, any error message, and optional job_id for batch requests.

    Raises:
        HTTPException: When file_path is a directory (status 400).
        HTTPException: When file parsing fails (status 400).
        HTTPException: When the specified function_name is not found in the file (status 404).
        HTTPException: When no functions are found in the file (status 400).

    Example:
        ```
        response = await generate_docstring(GenerateRequest(file_path='core/parser.py', function_name='parse_file', repo_root='/project', style='google', batch=False))
        ```
    """
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

    load_config(request.repo_root)
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
            raise HTTPException(
                status_code=404, detail=f"Function '{request.function_name}' not found"
            )
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
    doc = await gateway.generate_docstring(func, context, doc_style, verbosity=request.verbosity)
    result = injector.inject(func.file_path, func, doc, doc_style, dry_run=True)

    if _tmp_path:
        os.unlink(_tmp_path)

    if result.success:
        from api.usage_store import record_event

        # Estimate tokens: input (function source) + output (generated docstring)
        tokens = (len(func.source_code or "") + len(doc.docstring or "")) // 4
        record_event(
            http_request.headers.get("X-Wright-API-Key", ""),
            "docs_generated",
            tokens=tokens,
            repo_name=os.path.basename(request.repo_root),
            language=func.language if hasattr(func, "language") else None,
        )

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
    """
    Retrieves the status, progress, result, and error information for a Celery background job.

    Queries the Celery task result backend using the provided job ID to determine the current state of an asynchronous task. Maps Celery status values to a standardized response format, calculating progress percentages for running tasks and extracting results or error messages for completed tasks.

    Args:
        job_id (str): The unique identifier of the Celery task to query.

    Returns:
        JobStatusResponse: A response object containing the job ID, normalized status ('pending', 'started', 'success', 'failure', etc.), optional progress value (0.0 to 1.0), task result if successful, and error message if failed.

    Example:
        ```
        status = await get_job_status('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        ```

    Complexity: O(1) time - single lookup in Celery result backend
    """
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
