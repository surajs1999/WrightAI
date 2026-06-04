from __future__ import annotations

import asyncio
import os

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/coverage", tags=["coverage"], dependencies=[Depends(verify_api_key)])


class UndocumentedFunction(BaseModel):
    function_name: str
    file_path: str
    line: int


class CoverageResponse(BaseModel):
    overall_pct: float
    total: int
    documented: int
    undocumented: list[UndocumentedFunction]
    by_file: dict[str, float]
    by_folder: dict[str, float]


@router.get("", response_model=CoverageResponse)
async def get_coverage(
    repo_root: str = Query(..., description="Repository root path"),
    http_request: Request = None,
) -> CoverageResponse:
    """
    Scans all Python files under a repository root and returns documentation coverage statistics at the overall, per-file, and per-folder levels.

    Loads repository configuration via load_config to determine exclude paths, then uses CodeParser to parse every Python file under repo_root. For each parsed file, named functions are counted and checked for existing docstrings to compute total and documented function counts. Undocumented functions are collected with their file path and line number. Coverage percentages are calculated overall, per file, and per folder. If an HTTP request object is provided and contains an X-Wright-API-Key header, the scan event is recorded in the usage store.

    Args:
        repo_root (str): Absolute or relative path to the repository root directory to scan for Python files and analyze documentation coverage.
        http_request (Request): The incoming FastAPI/Starlette HTTP request object used to extract the X-Wright-API-Key header for usage tracking. Defaults to None if not provided.

    Returns:
        CoverageResponse: A CoverageResponse containing: overall_pct (float, overall documentation coverage percentage), total (int, total function count), documented (int, count of documented functions), undocumented (list of UndocumentedFunction with function_name, file_path, and line), by_file (dict mapping file path to coverage percentage), and by_folder (dict mapping folder path to coverage percentage).

    Example:
        ```
        coverage = await get_coverage(repo_root="/home/user/projects/my_python_app")
        ```

    Complexity: O(n*m) time where n is the number of Python files and m is the average number of functions per file; O(n*m) space for storing parsed function data across all files.
    """
    from core.config import load_config
    from core.parser.tree_sitter_parser import CodeParser

    loop = asyncio.get_event_loop()
    config = await loop.run_in_executor(None, load_config, repo_root)
    parser = CodeParser()
    parsed_files = await loop.run_in_executor(
        None, parser.parse_directory, repo_root, config.exclude
    )

    total = 0
    documented = 0
    undoc_list: list[UndocumentedFunction] = []
    by_file: dict[str, float] = {}
    by_folder: dict[str, tuple[int, int]] = {}

    for pf in parsed_files:
        funcs = [f for f in pf.functions if f.name != "<anonymous>"]
        file_total = len(funcs)
        file_doc = sum(1 for f in funcs if f.existing_docstring)
        total += file_total
        documented += file_doc

        if file_total > 0:
            by_file[pf.path] = file_doc / file_total * 100

        folder = os.path.dirname(pf.path)
        t, d = by_folder.get(folder, (0, 0))
        by_folder[folder] = (t + file_total, d + file_doc)

        for func in funcs:
            if not func.existing_docstring:
                undoc_list.append(
                    UndocumentedFunction(
                        function_name=func.name,
                        file_path=pf.path,
                        line=func.start_line + 1,
                    )
                )

    overall_pct = (documented / total * 100) if total else 100.0
    folder_pct = {folder: (d / t * 100 if t > 0 else 100.0) for folder, (t, d) in by_folder.items()}

    if http_request:
        from api.usage_store import record_event

        asyncio.create_task(
            asyncio.to_thread(
                record_event,
                http_request.headers.get("X-Wright-API-Key", ""),
                "coverage_scans",
                repo_name=os.path.basename(repo_root),
            )
        )

    return CoverageResponse(
        overall_pct=overall_pct,
        total=total,
        documented=documented,
        undocumented=undoc_list,
        by_file=by_file,
        by_folder=folder_pct,
    )
