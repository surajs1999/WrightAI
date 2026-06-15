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
    snippet: str | None = None  # raw code; if set, written to a temp file before parsing


class GenerateResponse(BaseModel):
    success: bool
    function_name: str | None
    preview: str | None
    injected_at_line: int | None
    error: str | None
    token_usage: dict | None = None


@router.post("", response_model=GenerateResponse)
async def generate_docstring(
    request: GenerateRequest, http_request: Request, response: Response
) -> GenerateResponse:
    """
    Generates an AI-powered docstring for a specified Python function by parsing the source file, building a dependency graph, retrieving hybrid context, and injecting the result via an LLM gateway.

    This async POST endpoint parses the target file (or a temporary file created from a raw code snippet), builds a dependency graph, retrieves hybrid context combining embeddings and the dependency graph, calls an LLM gateway to produce the docstring, and injects it — previewing only when dry_run is set, otherwise writing the result to disk. The target function may be a top-level function or a class method. Usage events including token estimates are recorded on success using the X-Wright-API-Key header.

    Args:
        request (GenerateRequest): Request payload containing file_path (path to the target Python file), optional function_name (name of the function or class method to document), repo_root (root directory of the repository), style (docstring style preference), optional snippet (raw code string that overrides file reading), verbosity (level of detail in the generated docstring), and dry_run flag (whether to preview without writing to disk).
        http_request (Request): The raw FastAPI/Starlette HTTP request object, used to extract the X-Wright-API-Key header for usage event recording.

    Returns:
        GenerateResponse: Response object containing success (bool), function_name (name of the documented function), preview (string preview of the injected docstring), injected_at_line (line number where the docstring was inserted), error (error message string if generation failed, otherwise null), and token_usage (dict with tokens, model, is_fallback, retry_count, duration_ms, and cache_read_tokens on success, otherwise null).

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

    from api.chroma_cache import get as get_chroma
    from api.embedder import get_embedder
    from api.routes.repos import ensure_repo_local, get_vector_store
    from core.config import load_config
    from api.embedder import get_gateway
    from core.llm.prompts import DocStyle
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    await ensure_repo_local(request.repo_root)
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

    all_funcs = list(parsed_file.functions)
    for cls in parsed_file.classes:
        all_funcs.extend(cls.methods)

    func = None
    if request.function_name:
        for f in all_funcs:
            if f.name == request.function_name:
                func = f
                break
        if func is None:
            if _tmp_path:
                os.unlink(_tmp_path)
            raise HTTPException(
                status_code=404, detail=f"Function '{request.function_name}' not found"
            )
    elif all_funcs:
        func = all_funcs[0]
    else:
        if _tmp_path:
            os.unlink(_tmp_path)
        raise HTTPException(status_code=400, detail="No functions found in file")

    gateway = get_gateway()
    embedder = get_embedder()
    chroma_path = os.getenv("CHROMA_PATH", os.path.join(request.repo_root, ".wright", "chroma"))
    chroma = get_vector_store(request.repo_root, get_chroma(chroma_path, request.repo_root))
    dep_graph = DependencyGraph()
    dep_graph.build([parsed_file])
    retriever = HybridRetriever(chroma, dep_graph, embedder)
    injector = DocstringInjector()

    doc_style = DocStyle(request.style)
    context = retriever.retrieve_for_function(func)
    doc, llm_result = await gateway.generate_docstring(
        func, context, doc_style, verbosity=request.verbosity
    )
    result = injector.inject(func.file_path, func, doc, doc_style, dry_run=request.dry_run)

    if _tmp_path:
        os.unlink(_tmp_path)

    if result.success:
        from api.usage_store import record_event

        record_event(
            http_request.headers.get("X-Wright-API-Key", ""),
            "docs_generated",
            tokens=llm_result.tokens,
            repo_name=os.path.basename(request.repo_root),
            language=func.language if hasattr(func, "language") else None,
            model=llm_result.model,
            is_fallback=llm_result.is_fallback,
            retry_count=llm_result.retry_count,
            duration_ms=llm_result.duration_ms,
            cache_read_tokens=llm_result.cache_read_tokens,
            context_chunks=len(context),
            doc_style=request.style,
        )

    token_usage = (
        {
            "tokens": llm_result.tokens,
            "model": llm_result.model,
            "is_fallback": llm_result.is_fallback,
            "retry_count": llm_result.retry_count,
            "duration_ms": llm_result.duration_ms,
            "cache_read_tokens": llm_result.cache_read_tokens,
        }
        if result.success
        else None
    )

    return GenerateResponse(
        success=result.success,
        function_name=func.name,
        preview=result.preview,
        injected_at_line=result.injected_at_line,
        error=result.error,
        token_usage=token_usage,
    )
