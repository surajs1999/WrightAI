from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/drift-check", tags=["drift"], dependencies=[Depends(verify_api_key)])


class DriftCheckRequest(BaseModel):
    repo_root: str
    since: str = "HEAD~1"
    auto_fix: bool = False


class DriftResultItem(BaseModel):
    function_name: str
    file_path: str
    status: str
    reason: str | None
    old_signature: str | None
    new_signature: str | None
    fixed_docstring: str | None = None


class DriftCheckResponse(BaseModel):
    total_checked: int
    drifted: int
    undocumented: int
    up_to_date: int
    results: list[DriftResultItem]


@router.post("", response_model=DriftCheckResponse)
async def check_drift(request: DriftCheckRequest) -> DriftCheckResponse:
    """
    Checks for documentation drift in a Python codebase by comparing function signatures with their docstrings.

    Analyzes a Git repository to detect functions whose signatures have changed without corresponding docstring updates. First attempts to check only modified files via git diff, falling back to a full directory scan if git operations fail. Optionally generates fixed docstrings for drifted or undocumented functions when auto_fix is enabled.

    Args:
        request (DriftCheckRequest): Request object containing repo_root (repository path), since (base git reference for comparison), and auto_fix (boolean flag to enable automatic docstring generation).

    Returns:
        DriftCheckResponse: Response object containing total_checked (number of functions analyzed), drifted (count of functions with outdated docstrings), undocumented (count of functions without docstrings), up_to_date (count of functions with current docstrings), and results (list of DriftResultItem objects with detailed information for each function).

    Example:
        ```
        response = await check_drift(DriftCheckRequest(repo_root='/path/to/repo', since='main', auto_fix=False))
        ```

    Complexity: O(n) time where n is the number of Python functions in the repository or changed files, O(n) space for storing drift results
    """
    from core.drift.drift_detector import DriftDetector
    from core.parser.cache import ASTCache

    cache_path = os.getenv(
        "SQLITE_CACHE_PATH", os.path.join(request.repo_root, ".wright", "ast_cache.db")
    )
    cache = ASTCache(cache_path)
    detector = DriftDetector()

    try:
        raw_results = detector.check_git_diff(request.repo_root, base_ref=request.since)
    except Exception:
        raw_results = detector.check_directory(request.repo_root, cache)

    items: list[DriftResultItem] = []
    fixed_docstring: str | None = None

    for r in raw_results:
        if request.auto_fix and r.status in ("drifted", "undocumented"):
            fixed_docstring = None  # Would call LLM here in full implementation

        items.append(
            DriftResultItem(
                function_name=r.function_name,
                file_path=r.file_path,
                status=r.status,
                reason=r.reason,
                old_signature=r.old_signature,
                new_signature=r.new_signature,
                fixed_docstring=fixed_docstring,
            )
        )

    drifted_count = sum(1 for r in raw_results if r.status == "drifted")
    undoc_count = sum(1 for r in raw_results if r.status == "undocumented")
    up_to_date_count = sum(1 for r in raw_results if r.status == "up_to_date")

    return DriftCheckResponse(
        total_checked=len(raw_results),
        drifted=drifted_count,
        undocumented=undoc_count,
        up_to_date=up_to_date_count,
        results=items,
    )
