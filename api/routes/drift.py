from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from api.auth import verify_api_key
from api.quota import check_feature_flag

router = APIRouter(prefix="/drift-check", tags=["drift"], dependencies=[Depends(verify_api_key)])

# ── Async Redis helper (function index — per-user, per-repo) ──────────────────

_aredis: object = None  # None = not tried; False = unavailable; Redis = connected
_REPO_INDEX_TTL = 7 * 86400  # 7 days, refreshed on every write


async def _get_aredis() -> "aioredis.Redis | None":
    global _aredis
    if _aredis is None:
        url = os.getenv("REDIS_URL")
        if url:
            try:
                c = aioredis.Redis.from_url(url, socket_connect_timeout=1, decode_responses=True)
                await c.ping()
                _aredis = c
            except Exception:
                _aredis = False
        else:
            _aredis = False
    return _aredis if _aredis is not False else None


async def _write_func_index(user_id: str, repo_name: str, results: list[dict]) -> None:
    """Write per-function drift results to the Redis user-scoped repo index."""
    r = await _get_aredis()
    if not r or not results:
        return
    key = f"wright:repo:v1:{user_id}:{repo_name}"
    now = datetime.now(timezone.utc).isoformat()
    mapping = {
        f"{item['file_path']}:{item['func_name']}": json.dumps(
            {
                "status": item["status"],
                "reason": item.get("reason"),
                "checked_at": now,
            }
        )
        for item in results
    }
    try:
        await r.hset(key, mapping=mapping)
        await r.expire(key, _REPO_INDEX_TTL)
    except Exception:
        pass


class DriftCheckRequest(BaseModel):
    repo_root: str
    auto_fix: bool = False
    file_path: str | None = None  # If set, check only this file (fast; for on-save use)


class DriftResultItem(BaseModel):
    function_name: str
    file_path: str
    status: str
    reason: str | None
    old_signature: str | None
    new_signature: str | None
    line: int | None = None
    fixed_docstring: str | None = None


class DriftCheckResponse(BaseModel):
    total_checked: int
    drifted: int
    undocumented: int
    up_to_date: int
    results: list[DriftResultItem]


# ── on-save endpoint: accepts raw file content, no local filesystem access needed ──


class DriftCheckFileRequest(BaseModel):
    file_content: str
    file_path: str  # logical path used for display / result matching only
    language: str = "python"


class DriftCheckFileResponse(BaseModel):
    results: list[DriftResultItem]


_LANG_SUFFIX: dict[str, str] = {
    "python": ".py",
    "javascript": ".js",
    "javascriptreact": ".jsx",
    "typescript": ".ts",
    "typescriptreact": ".tsx",
    "java": ".java",
    "go": ".go",
    "rust": ".rs",
}


@router.post("/file", response_model=DriftCheckFileResponse)
async def check_drift_file(
    request: DriftCheckFileRequest, http_request: Request
) -> DriftCheckFileResponse:
    """Check drift for a single file given its raw content.

    Accepts the file's text content directly from the editor — no local path
    access required. The server writes the content to a temp file, parses it,
    runs LLM drift checks on every documented function using the server-side
    ANTHROPIC_API_KEY, then returns per-function results.
    """
    # Semantic (LLM) drift is a Pro feature; structural drift still runs for everyone
    api_key = http_request.headers.get("X-Wright-API-Key", "")
    check_feature_flag(api_key, "semantic_drift", raise_on_blocked=True)

    import asyncio as _asyncio
    import tempfile
    from core.drift.drift_detector import _collect_all_funcs, _signature_str
    from core.llm.gateway import LLMGateway
    from core.parser.tree_sitter_parser import CodeParser

    suffix = _LANG_SUFFIX.get(request.language, ".py")

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False, encoding="utf-8")
    tmp.write(request.file_content)
    tmp.close()
    tmp_path = tmp.name

    try:
        parser = CodeParser()
        parsed_file = parser.parse_file(tmp_path)
        all_funcs = _collect_all_funcs(parsed_file)

        gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
        # Semaphore=2 to avoid hammering Anthropic rate limits with concurrent requests
        sem = _asyncio.Semaphore(2)

        token_totals: list[int] = []

        async def _check(func_name: str, func) -> DriftResultItem:  # type: ignore[type-arg]
            if func.existing_docstring is None:
                return DriftResultItem(
                    function_name=func_name,
                    file_path=request.file_path,
                    status="undocumented",
                    reason=None,
                    old_signature=None,
                    new_signature=_signature_str(func),
                    line=func.start_line,
                )
            async with sem:
                is_drifted, reason, tokens = await gateway.check_drift(
                    func, func.existing_docstring
                )
            token_totals.append(tokens)
            # Let exceptions propagate — a failed LLM call should not be silently
            # treated as up_to_date (which would hide real drift)
            return DriftResultItem(
                function_name=func_name,
                file_path=request.file_path,
                status="drifted" if is_drifted else "up_to_date",
                reason=reason if is_drifted else None,
                old_signature=None,
                new_signature=_signature_str(func),
                line=func.start_line,
            )

        # return_exceptions=True so one failed LLM call doesn't discard all results
        raw = await _asyncio.gather(
            *[_check(n, f) for n, f in all_funcs.items()],
            return_exceptions=True,
        )
        items = [r for r in raw if isinstance(r, DriftResultItem)]
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    from api.usage_store import record_event

    record_event(
        http_request.headers.get("X-Wright-API-Key", ""),
        "drift_checks_run",
        tokens=sum(token_totals),
    )

    return DriftCheckFileResponse(results=items)


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
    # Semantic (LLM) drift requires Pro; structural drift runs for all plans
    _api_key = http_request.headers.get("X-Wright-API-Key", "")
    _semantic_ok = check_feature_flag(_api_key, "semantic_drift", raise_on_blocked=False)

    import asyncio as _asyncio
    from core.drift.drift_detector import DriftDetector
    from core.parser.cache import ASTCache

    cache_path = os.getenv(
        "SQLITE_CACHE_PATH", os.path.join(request.repo_root, ".wright", "ast_cache.db")
    )
    cache = ASTCache(cache_path)
    detector = DriftDetector()

    # Use async LLM path when API key is present AND user plan allows semantic drift.
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and _semantic_ok:
        from core.llm.gateway import LLMGateway

        gateway = LLMGateway(anthropic_key=anthropic_key)
        sem = _asyncio.Semaphore(5)
        if request.file_path and os.path.exists(request.file_path):
            raw_results = await detector.check_file_async(request.file_path, cache, gateway, sem)
        else:
            raw_results = await detector.check_directory_async(request.repo_root, cache, gateway)
    else:
        if request.file_path and os.path.exists(request.file_path):
            raw_results = detector.check_file(request.file_path, cache)
        else:
            raw_results = detector.check_directory(request.repo_root, cache)

    items: list[DriftResultItem] = []

    for r in raw_results:
        items.append(
            DriftResultItem(
                function_name=r.function_name,
                file_path=r.file_path,
                status=r.status,
                reason=r.reason,
                old_signature=r.old_signature,
                new_signature=r.new_signature,
                line=r.line,
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


# ── Redis function index: sync + read ─────────────────────────────────────────


class DriftSyncItem(BaseModel):
    file_path: str
    func_name: str
    status: str  # 'drifted' | 'up_to_date' | 'undocumented'
    reason: str | None = None


class DriftSyncRequest(BaseModel):
    repo_name: str
    results: list[DriftSyncItem]


@router.post("/sync")
async def sync_drift_results(request: DriftSyncRequest, http_request: Request) -> dict:
    """Receive drift results from the VS Code extension and write them to the Redis function index.

    Called fire-and-forget by the extension after each local CLI drift run so the
    dashboard can read results without triggering a second LLM pass.
    """
    from api.usage_store import _resolve_user

    api_key = http_request.headers.get("X-Wright-API-Key", "")
    resolved = _resolve_user(api_key)
    if not resolved:
        return {"ok": False, "error": "unresolvable api key"}
    user_id, _ = resolved

    await _write_func_index(
        user_id,
        request.repo_name,
        [
            {
                "file_path": r.file_path,
                "func_name": r.func_name,
                "status": r.status,
                "reason": r.reason,
            }
            for r in request.results
        ],
    )
    return {"ok": True}


@router.get("/results/{repo_name:path}")
async def get_drift_results(repo_name: str, http_request: Request) -> dict:
    """Return the latest per-function drift statuses for a repo from the Redis function index.

    Used by the dashboard to display drift state without re-running LLM checks.
    Returns an empty list if Redis is unavailable or no results have been synced yet.
    """
    from api.usage_store import _resolve_user

    api_key = http_request.headers.get("X-Wright-API-Key", "")
    resolved = _resolve_user(api_key)
    if not resolved:
        return {"results": []}
    user_id, _ = resolved

    r = await _get_aredis()
    if not r:
        return {"results": []}

    key = f"wright:repo:v1:{user_id}:{repo_name}"
    try:
        raw = await r.hgetall(key)
    except Exception:
        return {"results": []}

    results = []
    for field, value in raw.items():
        # field = "{file_path}:{func_name}" — rpartition splits on last ':'
        file_part, _, func_name = field.rpartition(":")
        entry = json.loads(value)
        results.append(
            {
                "file_path": file_part,
                "func_name": func_name,
                "status": entry["status"],
                "reason": entry.get("reason"),
                "checked_at": entry.get("checked_at"),
            }
        )

    return {"results": results}
