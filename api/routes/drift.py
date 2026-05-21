from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/drift-check", tags=["drift"], dependencies=[Depends(verify_api_key)])


class DriftCheckRequest(BaseModel):
    repo_root: str
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
async def check_drift(request: DriftCheckRequest, http_request: Request) -> DriftCheckResponse:
    """
    Analyzes a Python codebase for documentation drift by comparing function signatures against their docstrings and returns a structured summary of drifted, undocumented, and up-to-date functions.

    Accepts a Git repository root path and scans all Python files using DriftDetector.check_directory() to identify functions whose signatures have changed without corresponding docstring updates. When auto_fix is enabled, the function reserves a placeholder for LLM-based docstring generation for drifted or undocumented functions. After aggregating per-function results into DriftResultItem objects, it records the drift check event via record_event() using the API key from the 'X-Wright-API-Key' header, then returns a DriftCheckResponse with total counts and detailed per-function results.

    Args:
        request (DriftCheckRequest): Request payload containing repo_root (absolute path to the repository root), since (base git reference for diffing, e.g. 'main'), and auto_fix (boolean flag enabling automatic docstring generation for drifted or undocumented functions).
        http_request (Request): The raw FastAPI/Starlette HTTP request object used to extract the 'X-Wright-API-Key' header for usage tracking via record_event().

    Returns:
        DriftCheckResponse: Response object containing total_checked (total functions analyzed), drifted (count with outdated docstrings), undocumented (count with no docstrings), up_to_date (count with current docstrings), and results (list of DriftResultItem objects with per-function details including file_path, status, reason, old_signature, new_signature, and fixed_docstring).

    Raises:
        Exception: Propagates any unhandled exception raised by DriftDetector.check_directory() or ASTCache initialization, such as invalid repo_root paths or database errors.

    Example:
        ```
        response = await check_drift(
            request=DriftCheckRequest(repo_root='/home/user/my_project', since='main', auto_fix=False),
            http_request=request
        )
        print(response.total_checked, response.drifted, response.undocumented, response.up_to_date)
        ```

    Complexity: O(n) time where n is the number of Python functions in the scanned files, O(n) space for storing per-function drift result items
    """
    from core.drift.drift_detector import DriftDetector
    from core.parser.cache import ASTCache

    cache_path = os.getenv(
        "SQLITE_CACHE_PATH", os.path.join(request.repo_root, ".wright", "ast_cache.db")
    )
    cache = ASTCache(cache_path)
    detector = DriftDetector()

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

    from api.usage_store import record_event
    import os as _os

    record_event(
        http_request.headers.get("X-Wright-API-Key", ""),
        "drift_checks_run",
        repo_name=_os.path.basename(request.repo_root),
    )

    return DriftCheckResponse(
        total_checked=len(raw_results),
        drifted=drifted_count,
        undocumented=undoc_count,
        up_to_date=up_to_date_count,
        results=items,
    )
