from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from api.auth import verify_api_key
from api.quota import check_quota
from api.rate_limit import limiter
from core.parser.cache import (
    ASTCache,
    _hash,
    flush_baselines,
    flush_function_results,
    prefetch_baselines,
    prefetch_function_results,
)

_logger = logging.getLogger("wright.drift")

# Shared LLM result cache — keyed by file_path+func_name+source+docstring hash.
# Backed by SQLite (L1) and Supabase (L2), avoids redundant Haiku calls on re-saves.
_drift_cache = ASTCache(os.getenv("SQLITE_CACHE_PATH", "/tmp/ast_cache.db"))

router = APIRouter(prefix="/drift-check", tags=["drift"], dependencies=[Depends(verify_api_key)])


def _db():
    from api.user_store import _db as _get_db

    return _get_db()


def _save_drift_results(user_id: str, repo_name: str, results: list[dict]) -> None:
    """Batch upsert per-function drift results for (user_id, repo_name)."""
    if not results:
        return
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "user_id": user_id,
            "repo_name": repo_name,
            "file_path": item["file_path"],
            "func_name": item["func_name"],
            "status": item["status"],
            "reason": item.get("reason"),
            "checked_at": now,
        }
        for item in results
    ]
    try:
        _db().table("drift_results").upsert(
            rows, on_conflict="user_id,repo_name,file_path,func_name"
        ).execute()
    except Exception:
        _logger.exception(
            "Failed to save drift results for user_id=%s repo_name=%s", user_id, repo_name
        )


def _load_drift_results(user_id: str, repo_name: str) -> list[dict]:
    """Return per-function drift results for (user_id, repo_name), [] on error/empty."""
    try:
        result = (
            _db()
            .table("drift_results")
            .select("file_path, func_name, status, reason, checked_at")
            .eq("user_id", user_id)
            .eq("repo_name", repo_name)
            .execute()
        )
        return result.data or []
    except Exception:
        _logger.exception(
            "Failed to load drift results for user_id=%s repo_name=%s", user_id, repo_name
        )
        return []


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
@limiter.limit("30/minute")
async def check_drift_file(body: DriftCheckFileRequest, request: Request) -> DriftCheckFileResponse:
    """Check drift for a single file given its raw content.

    Accepts the file's text content directly from the editor — no local path
    access required. The server writes the content to a temp file, parses it,
    runs LLM drift checks on every documented function using the server-side
    ANTHROPIC_API_KEY, then returns per-function results.
    """
    check_quota(
        request.headers.get("X-Wright-API-Key", ""), "drift_checks_run", raise_on_blocked=True
    )

    import asyncio as _asyncio
    import tempfile
    from core.drift.drift_detector import _collect_all_funcs, _signature_str
    from core.llm.gateway import LLMGateway
    from core.parser.tree_sitter_parser import CodeParser

    suffix = _LANG_SUFFIX.get(body.language, ".py")

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False, encoding="utf-8")
    tmp.write(body.file_content)
    tmp.close()
    tmp_path = tmp.name

    try:
        parser = CodeParser()
        parsed_file = parser.parse_file(tmp_path)
        all_funcs = _collect_all_funcs(parsed_file)

        # Prefetch all L2 (Supabase) verdicts for this file in one query, and
        # collect new verdicts to flush in one batch after the gather below.
        prefetch_pairs = [
            (_hash(f.source), _hash(f.existing_docstring))
            for f in all_funcs.values()
            if f.existing_docstring is not None
        ]
        l2_cache = prefetch_function_results(prefetch_pairs)
        l2_pending: list[dict] = []

        gateway = LLMGateway(
            anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""),
            gemini_key=os.getenv("GEMINI_API_KEY"),
        )
        # Semaphore=2 to avoid hammering Anthropic rate limits with concurrent requests
        sem = _asyncio.Semaphore(2)

        token_totals: list[int] = []
        models_used: list[str] = []
        fallbacks_used: list[bool] = []
        retry_counts: list[int] = []
        duration_ms_list: list[int] = []

        async def _check(func_name: str, func) -> DriftResultItem:  # type: ignore[type-arg]
            if func.existing_docstring is None:
                return DriftResultItem(
                    function_name=func_name,
                    file_path=body.file_path,
                    status="undocumented",
                    reason=None,
                    old_signature=None,
                    new_signature=_signature_str(func),
                    line=func.start_line,
                )
            # Check LLM result cache — avoids re-calling Haiku when source+docstring unchanged
            cached = _drift_cache.get_function_result(
                body.file_path,
                func_name,
                func.source,
                func.existing_docstring,
                l2_cache=l2_cache,
            )
            if cached is not None:
                status, reason = cached
                return DriftResultItem(
                    function_name=func_name,
                    file_path=body.file_path,
                    status=status,
                    reason=reason,
                    old_signature=None,
                    new_signature=_signature_str(func),
                    line=func.start_line,
                )
            async with sem:
                is_drifted, reason, llm_result = await gateway.check_drift(
                    func, func.existing_docstring, parsed_file.imports
                )
            token_totals.append(llm_result.tokens)
            models_used.append(llm_result.model)
            fallbacks_used.append(llm_result.is_fallback)
            retry_counts.append(llm_result.retry_count)
            duration_ms_list.append(llm_result.duration_ms)
            status = "drifted" if is_drifted else "up_to_date"
            _drift_cache.set_function_result(
                body.file_path,
                func_name,
                func.source,
                func.existing_docstring,
                status,
                reason if is_drifted else None,
                l2_pending=l2_pending,
            )
            # Let exceptions propagate — a failed LLM call should not be silently
            # treated as up_to_date (which would hide real drift)
            return DriftResultItem(
                function_name=func_name,
                file_path=body.file_path,
                status=status,
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
        flush_function_results(l2_pending)
        items = [r for r in raw if isinstance(r, DriftResultItem)]
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    from api.usage_store import record_event

    record_event(
        request.headers.get("X-Wright-API-Key", ""),
        "drift_checks_run",
        tokens=sum(token_totals),
        model=models_used[0] if models_used else None,
        is_fallback=any(fallbacks_used),
        cache_hit=len(token_totals) == 0 and bool(items),
        retry_count=sum(retry_counts),
        duration_ms=sum(duration_ms_list),
    )

    return DriftCheckFileResponse(results=items)


@router.post("", response_model=DriftCheckResponse)
@limiter.limit("10/minute")
async def check_drift(body: DriftCheckRequest, request: Request) -> DriftCheckResponse:
    """
    Analyzes a Python codebase for documentation drift by comparing function signatures against their docstrings and returns a structured summary of drifted, undocumented, and up-to-date functions.

    Accepts a Git repository root path and scans all Python files using DriftDetector.check_directory() (or DriftDetector.check_file() when request.file_path is set) to identify functions whose signatures have changed without corresponding docstring updates. When auto_fix is enabled, the function reserves a placeholder for LLM-based docstring generation for drifted or undocumented functions. After aggregating per-function results into DriftResultItem objects, it records the drift check event via record_event() using the API key from the 'X-Wright-API-Key' header, then returns a DriftCheckResponse with total counts and detailed per-function results.

    Args:
        request (DriftCheckRequest): Request payload containing repo_root (absolute path to the repository root), auto_fix (boolean flag enabling automatic docstring generation for drifted or undocumented functions), and file_path (optional path to a single file — if set and it exists on disk, only that file is checked instead of the whole repo_root).
        http_request (Request): The raw FastAPI/Starlette HTTP request object used to extract the 'X-Wright-API-Key' header for usage tracking via record_event().

    Returns:
        DriftCheckResponse: Response object containing total_checked (total functions analyzed), drifted (count with outdated docstrings), undocumented (count with no docstrings), up_to_date (count with current docstrings), and results (list of DriftResultItem objects with per-function details including file_path, status, reason, old_signature, new_signature, and fixed_docstring).

    Raises:
        Exception: Propagates any unhandled exception raised by DriftDetector.check_directory() or ASTCache initialization, such as invalid repo_root paths or database errors.

    Example:
        ```
        response = await check_drift(
            request=DriftCheckRequest(repo_root='/home/user/my_project', auto_fix=False),
            http_request=request
        )
        print(response.total_checked, response.drifted, response.undocumented, response.up_to_date)
        ```

    Complexity: O(n) time where n is the number of Python functions in the scanned files, O(n) space for storing per-function drift result items
    """
    _api_key = request.headers.get("X-Wright-API-Key", "")
    check_quota(_api_key, "drift_checks_run", raise_on_blocked=True)

    import asyncio as _asyncio
    from api.routes.repos import ensure_repo_local
    from core.drift.drift_detector import DriftDetector
    from core.parser.cache import ASTCache

    await ensure_repo_local(body.repo_root)

    cache_path = os.getenv(
        "SQLITE_CACHE_PATH", os.path.join(body.repo_root, ".wright", "ast_cache.db")
    )
    cache = ASTCache(cache_path)
    detector = DriftDetector()

    # Resolve the Supabase user up front so the AST baseline can be
    # read-through from (and written back to) ast_baseline — keeps the
    # drift baseline alive across Cloud Run cold starts, which wipe /tmp.
    from api.usage_store import _resolve_user_id

    user_id = _resolve_user_id(_api_key)
    repo_name = os.path.basename(body.repo_root)
    remote_baselines = prefetch_baselines(user_id, repo_name) if user_id else {}
    baseline_pending: list[dict] = []

    # Use async LLM path whenever the server has an API key — semantic drift detection
    # works without a prior baseline (LLM evaluates current source vs current docstring),
    # so gating it behind _semantic_ok would produce zero results on every first scan.
    # _semantic_ok is still used for record_event (cost attribution) and the per-file
    # on-save endpoint (check_drift_file) which raises on blocked.
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY")
    if anthropic_key or gemini_key:
        from core.llm.gateway import LLMGateway

        gateway = LLMGateway(
            anthropic_key=anthropic_key,
            gemini_key=gemini_key,
        )
        sem = _asyncio.Semaphore(5)
        if body.file_path and os.path.exists(body.file_path):
            raw_results = await detector.check_file_async(
                body.file_path,
                cache,
                gateway,
                sem,
                remote_baselines=remote_baselines,
                baseline_pending=baseline_pending,
                repo_root=body.repo_root,
            )
        else:
            raw_results = await detector.check_directory_async(
                body.repo_root,
                cache,
                gateway,
                remote_baselines=remote_baselines,
                baseline_pending=baseline_pending,
                repo_root=body.repo_root,
            )
    else:
        if body.file_path and os.path.exists(body.file_path):
            raw_results = detector.check_file(
                body.file_path,
                cache,
                remote_baselines=remote_baselines,
                baseline_pending=baseline_pending,
                repo_root=body.repo_root,
            )
        else:
            raw_results = detector.check_directory(
                body.repo_root,
                cache,
                remote_baselines=remote_baselines,
                baseline_pending=baseline_pending,
                repo_root=body.repo_root,
            )

    # Persist any advanced baselines to Supabase so the next cold-started
    # container picks them up via prefetch_baselines() above.
    if user_id and baseline_pending:
        flush_baselines(
            [{**row, "user_id": user_id, "repo_name": repo_name} for row in baseline_pending]
        )

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

    from core.llm.gateway import LLMGateway as _LLMGateway

    _tokens_sum = sum(r.tokens for r in raw_results)
    _llm_active = bool(anthropic_key or gemini_key)
    record_event(
        request.headers.get("X-Wright-API-Key", ""),
        "drift_checks_run",
        tokens=_tokens_sum,
        repo_name=repo_name,
        model=_LLMGateway.DRIFT_MODEL
        if anthropic_key
        else (_LLMGateway.DRIFT_FALLBACK_MODEL if gemini_key else None),
        cache_hit=_llm_active and _tokens_sum == 0 and bool(raw_results),
    )

    # Mirror results into the Supabase drift_results table so the dashboard
    # reflects this run immediately, even if the VS Code extension never syncs.
    if user_id:
        _save_drift_results(
            user_id,
            repo_name,
            [
                {
                    "file_path": _os.path.relpath(r.file_path, body.repo_root),
                    "func_name": r.function_name,
                    "status": r.status,
                    "reason": r.reason,
                }
                for r in raw_results
            ],
        )

    return DriftCheckResponse(
        total_checked=len(raw_results),
        drifted=drifted_count,
        undocumented=undoc_count,
        up_to_date=up_to_date_count,
        results=items,
    )


# ── Drift results: sync + read ──────────────────────────────────────────────


class DriftSyncItem(BaseModel):
    file_path: str
    func_name: str
    status: str  # 'drifted' | 'up_to_date' | 'undocumented'
    reason: str | None = None
    # Present only for results backed by an LLM verdict (fresh or cached) —
    # lets sync_drift_results also mirror the verdict into drift_llm_cache.
    src_hash: str | None = None
    doc_hash: str | None = None


class DriftSyncRequest(BaseModel):
    repo_name: str
    results: list[DriftSyncItem]


class BaselineFileItem(BaseModel):
    file_path: str
    parsed_json: str


class BaselineSyncRequest(BaseModel):
    repo_name: str
    files: list[BaselineFileItem]


@router.post("/sync-baseline")
async def sync_baseline(request: BaselineSyncRequest, http_request: Request) -> dict:
    """Receive AST baseline snapshots from the local CLI and write them to ast_baseline.

    Called after each local `wright drift` run so the server-side drift detector
    can read a real, history-based baseline on cold start instead of resetting
    to 'first run = everything up to date'.
    """
    from api.usage_store import _resolve_user

    api_key = http_request.headers.get("X-Wright-API-Key", "")
    resolved = _resolve_user(api_key)
    if not resolved:
        return {"ok": False, "error": "unresolvable api key"}
    user_id, _ = resolved

    now = datetime.now(timezone.utc).isoformat()
    flush_baselines(
        [
            {
                "user_id": user_id,
                "repo_name": request.repo_name,
                "file_path": f.file_path,
                "parsed_json": f.parsed_json,
                "updated_at": now,
            }
            for f in request.files
        ]
    )
    return {"ok": True}


@router.post("/sync")
async def sync_drift_results(request: DriftSyncRequest, http_request: Request) -> dict:
    """Receive drift results from the VS Code extension and write them to drift_results.

    Called fire-and-forget by the extension after each local CLI drift run so the
    dashboard can read results without triggering a second LLM pass.
    """
    from api.usage_store import _resolve_user

    api_key = http_request.headers.get("X-Wright-API-Key", "")
    resolved = _resolve_user(api_key)
    if not resolved:
        return {"ok": False, "error": "unresolvable api key"}
    user_id, _ = resolved

    _save_drift_results(
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

    # Mirror LLM verdicts (computed locally, e.g. via the VS Code extension's
    # on-save check) into the shared L2 cache so cold-start containers and
    # other users skip a redundant LLM call for the same source+docstring.
    now = datetime.now(timezone.utc).isoformat()
    l2_rows = [
        {
            "src_hash": r.src_hash,
            "doc_hash": r.doc_hash,
            "status": r.status,
            "reason": r.reason,
            "updated_at": now,
        }
        for r in request.results
        if r.src_hash and r.doc_hash and r.status in ("drifted", "up_to_date")
    ]
    flush_function_results(l2_rows)

    return {"ok": True}


@router.get("/results/{repo_name:path}")
async def get_drift_results(repo_name: str, http_request: Request) -> dict:
    """Return the latest per-function drift statuses for a repo from drift_results.

    Used by the dashboard to display drift state without re-running LLM checks.
    Returns an empty list if no results have been synced yet.
    """
    from api.usage_store import _resolve_user

    api_key = http_request.headers.get("X-Wright-API-Key", "")
    resolved = _resolve_user(api_key)
    if not resolved:
        return {"results": []}
    user_id, _ = resolved

    rows = _load_drift_results(user_id, repo_name)
    results = [
        {
            "file_path": row["file_path"],
            "func_name": row["func_name"],
            "status": row["status"],
            "reason": row.get("reason"),
            "checked_at": row.get("checked_at"),
        }
        for row in rows
    ]
    return {"results": results}
