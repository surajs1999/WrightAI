from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/llms-txt", tags=["llms-txt"], dependencies=[Depends(verify_api_key)])


class LlmsTxtRequest(BaseModel):
    repo_root: str


@router.post("")
async def generate_llms_txt(body: LlmsTxtRequest, http_request: Request) -> dict:
    """
    Generates an llms.txt for a repository using the same LLM-authored pipeline as `wright llms-txt`.

    Parses the repository with tree-sitter, builds a dependency graph to rank
    functions by PageRank, and asks Claude to write the llms.txt content
    (Overview / Architecture / Entry points / Key functions / Do not modify
    sections) via `LLMSTxtWriter.generate`. This mirrors the CLI's `llms_txt`
    command rather than mechanically dumping function signatures and docstrings.

    Args:
        body (LlmsTxtRequest): Request payload containing repo_root, the path to
            the repository on the server (a local clone managed by `ensure_repo_local`).
        http_request (Request): The incoming HTTP request, used to read the
            X-Wright-API-Key header for usage tracking.

    Returns:
        dict: Dictionary with 'content' (the generated llms.txt markdown),
            'file_count' (number of source files parsed), 'function_count'
            (total functions plus class methods across those files), and
            'token_estimate' (content length divided by 4).

    Raises:
        HTTPException: status_code=404 if body.repo_root does not exist on the server.
    """
    from api.embedder import get_gateway
    from api.routes.repos import ensure_repo_local
    from core.output.llms_txt import LLMSTxtWriter
    from core.parser.tree_sitter_parser import CodeParser

    await ensure_repo_local(body.repo_root)

    repo_path = Path(body.repo_root)
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found on server.")

    repo_name = repo_path.name
    parser = CodeParser()
    parsed_files = parser.parse_directory(str(repo_path))

    gateway = get_gateway()
    content = await LLMSTxtWriter().generate(str(repo_path), parsed_files, repo_name, gateway)

    total_fns = sum(
        len(pf.functions) + sum(len(c.methods) for c in pf.classes) for pf in parsed_files
    )
    token_estimate = len(content) // 4

    from api.usage_store import record_event

    record_event(
        http_request.headers.get("X-Wright-API-Key", ""),
        "llms_txt_generated",
        repo_name=repo_name,
    )

    return {
        "content": content,
        "file_count": len(parsed_files),
        "function_count": total_fns,
        "token_estimate": token_estimate,
    }
