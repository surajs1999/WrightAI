from __future__ import annotations

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
    Analyzes a repository to calculate documentation coverage statistics for all Python functions.

    Parses all Python files in the specified repository root directory, excluding configured paths, and computes overall documentation coverage percentage, per-file coverage, per-folder coverage, and identifies all undocumented functions with their locations.

    Args:
        repo_root (str): Absolute or relative path to the repository root directory to analyze for documentation coverage.

    Returns:
        CoverageResponse: Coverage statistics including overall percentage, total and documented function counts, list of undocumented functions with file paths and line numbers, coverage percentages by file, and coverage percentages by folder.

    Example:
        ```
        coverage = await get_coverage(repo_root="/path/to/my/project")
        ```

    Complexity: O(n*m) time where n is the number of files and m is the average number of functions per file, O(n*m) space for storing parsed function data
    """
    from core.config import load_config
    from core.parser.tree_sitter_parser import CodeParser

    config = load_config(repo_root)
    parser = CodeParser()
    parsed_files = parser.parse_directory(repo_root, exclude=config.exclude)

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

        record_event(http_request.headers.get("X-Wright-API-Key", ""), "coverage_scans")

    return CoverageResponse(
        overall_pct=overall_pct,
        total=total,
        documented=documented,
        undocumented=undoc_list,
        by_file=by_file,
        by_folder=folder_pct,
    )
