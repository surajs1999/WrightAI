from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from api.auth import verify_api_key
from api.quota import check_quota

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
async def generate_docstring(
    request: GenerateRequest, http_request: Request, response: Response
) -> GenerateResponse:
    """
    Generates an AI-powered docstring for a specified Python function by parsing the source file, building a dependency graph, retrieving hybrid context, and injecting the result via an LLM gateway.

    This async POST endpoint supports both batch and synchronous docstring generation. In batch mode, a Celery task is queued via generate_file_docs.delay() and a job_id is returned immediately. In synchronous mode, the endpoint parses the target file (or a temporary file created from a raw code snippet), builds a dependency graph, retrieves hybrid context combining embeddings and the dependency graph, calls an LLM gateway to produce the docstring, and returns a dry-run preview of the injected documentation. Usage events including token estimates are recorded on success using the X-Wright-API-Key header.

    Args:
        request (GenerateRequest): Request payload containing file_path (path to the target Python file), optional function_name (name of the function to document), repo_root (root directory of the repository), style (docstring style preference), batch flag (whether to enqueue a Celery task instead of processing synchronously), optional snippet (raw code string that overrides file reading), verbosity (level of detail in the generated docstring), and dry_run flag (whether to preview without writing to disk).
        http_request (Request): The raw FastAPI/Starlette HTTP request object, used to extract the X-Wright-API-Key header for usage event recording.

    Returns:
        GenerateResponse: Response object containing success (bool), function_name (name of the documented function), preview (string preview of the file with the injected docstring), injected_at_line (line number where the docstring was inserted), error (error message string if generation failed, otherwise null), job_id (Celery task ID for batch requests, otherwise null), and token_usage (currently always null).

    Raises:
        HTTPException: Raised with status 400 when the resolved file_path points to a directory instead of a file.
        HTTPException: Raised with status 400 when the CodeParser fails to parse the target file.
        HTTPException: Raised with status 404 when the specified function_name is not found among the parsed functions in the file.
        HTTPException: Raised with status 400 when no functions are found in the parsed file and no function_name was specified.

    Example:
        ```
        response = await generate_docstring(
            request=GenerateRequest(
                file_path='core/parser/tree_sitter_parser.py',
                function_name='parse_file',
                repo_root='/project',
                style='google',
                batch=False,
                dry_run=True,
                verbosity='detailed'
            ),
            http_request=request
        )
        ```
    """
    api_key = http_request.headers.get("X-Wright-API-Key", "")
    quota = check_quota(api_key, "docs_generated", raise_on_blocked=True)
    if quota.warning:
        response.headers["X-Wright-Quota-Warning"] = "true"
        response.headers["X-Wright-Usage-Pct"] = str(quota.pct)

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
    doc, tokens_used = await gateway.generate_docstring(
        func, context, doc_style, verbosity=request.verbosity
    )
    result = injector.inject(func.file_path, func, doc, doc_style, dry_run=True)

    if _tmp_path:
        os.unlink(_tmp_path)

    if result.success:
        from api.usage_store import record_event

        record_event(
            http_request.headers.get("X-Wright-API-Key", ""),
            "docs_generated",
            tokens=tokens_used,
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
    Retrieves the current status, progress, result, and error information for a Celery background job by its unique job ID.

    Queries the Celery task result backend using the provided job ID to determine the current state of an asynchronous task. Maps Celery status values to a standardized response format, calculating progress percentages (0.0 to 1.0) for running tasks and extracting results or error messages for completed or failed tasks. The 'progress' state is normalized to 'started' with a computed progress fraction.

    Args:
        job_id (str): The unique identifier (UUID string) of the Celery task to query.

    Returns:
        JobStatusResponse: A response object containing the job ID, normalized status ('pending', 'started', 'success', 'failure', etc.), optional progress value (0.0 to 1.0), the task result if the job succeeded, and an error message string if the job failed.

    Example:
        ```
        status = await get_job_status('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        # Returns: JobStatusResponse(job_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890', status='success', progress=1.0, result={...}, error=None)
        ```

    Complexity: O(1) time — performs a single lookup in the Celery result backend.
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
