#!/usr/bin/env python3
"""
Smoke test for WrightAI API endpoints.
Usage:
  python smoke_test.py                          # tests production
  python smoke_test.py http://localhost:8765    # tests local
  python smoke_test.py <url> <api_key>          # with explicit key
"""

from __future__ import annotations

import sys
import httpx

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else "https://wrightai-api.fly.dev").rstrip("/")
API_KEY = sys.argv[2] if len(sys.argv) > 2 else "wright-local-dev"

HEADERS = {"X-Wright-API-Key": API_KEY, "Content-Type": "application/json"}

PASS = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"
SKIP = "\033[33m~\033[0m"

results: list[tuple[str, bool, str]] = []


def check(
    label: str,
    method: str,
    path: str,
    *,
    body: dict | None = None,
    expect: int = 200,
    skip_on_auth: bool = False,
):
    """
    Performs an HTTP request to test an API endpoint and appends the result to a global results list.

    Makes an HTTP request using the specified method and path, validates the response status code against the expected value, and stores the test result (label, success status, and optional error detail) in a global results list. Optionally skips authentication-related failures.

    Args:
        label (str): Descriptive label for this test case, used to identify the result.
        method (str): HTTP method to use for the request (e.g., 'GET', 'POST', 'PUT', 'DELETE').
        path (str): API endpoint path to append to the base URL.
        body (dict | None): Optional JSON body to send with the request. Defaults to None.
        expect (int): Expected HTTP status code for a successful test. Defaults to 200.
        skip_on_auth (bool): If True, skips the test and marks it as skipped when a 401 status is received. Defaults to False.

    Returns:
        None: No value is returned; results are appended to a global results list.

    Example:
        ```
        check('Get users endpoint', 'GET', '/api/users', expect=200)
        ```
    """
    url = f"{BASE_URL}{path}"
    try:
        r = httpx.request(method, url, headers=HEADERS, json=body, timeout=15)
        if skip_on_auth and r.status_code == 401:
            results.append((label, None, "skipped (auth)"))
            return
        ok = r.status_code == expect
        detail = r.text[:120] if not ok else ""
        results.append((label, ok, detail))
    except Exception as e:
        results.append((label, False, str(e)[:120]))


# ── Health (no auth needed) ──────────────────────────────────────────────────
r = httpx.get(f"{BASE_URL}/health", timeout=10)
results.append(
    ("GET /health", r.status_code == 200, r.text[:80] if r.status_code != 200 else r.text.strip())
)

# ── Auth ─────────────────────────────────────────────────────────────────────
check("GET /auth/login (redirect)", "GET", "/auth/login", expect=307)

# ── Repos ────────────────────────────────────────────────────────────────────
check("GET /repos", "GET", "/repos", skip_on_auth=True)

# ── Coverage (needs a real repo path on server) ───────────────────────────────
check("GET /coverage (missing param → 422)", "GET", "/coverage", expect=422, skip_on_auth=True)

# ── Generate (missing body → 422) ────────────────────────────────────────────
check(
    "POST /generate (missing body → 422)",
    "POST",
    "/generate",
    body={},
    expect=422,
    skip_on_auth=True,
)

# ── Drift (missing body → 422) ───────────────────────────────────────────────
check(
    "POST /drift-check (missing body → 422)",
    "POST",
    "/drift-check",
    body={},
    expect=422,
    skip_on_auth=True,
)

# ── Chat (missing body → 422) ────────────────────────────────────────────────
check("POST /chat (missing body → 422)", "POST", "/chat", body={}, expect=422, skip_on_auth=True)

# ── llms-txt (repo not found → 404) ──────────────────────────────────────────
check(
    "POST /llms-txt (bad path → 404)",
    "POST",
    "/llms-txt",
    body={"repo_root": "/nonexistent/path"},
    expect=404,
    skip_on_auth=True,
)

# ── fix-pr (bad path → 404) ──────────────────────────────────────────────────
check(
    "POST /fix-pr (bad path → 404)",
    "POST",
    "/fix-pr",
    body={"repo_root": "/nonexistent", "functions": [{"file_path": "/nonexistent/f.py"}]},
    expect=404,
    skip_on_auth=True,
)

# ── Print summary ─────────────────────────────────────────────────────────────
print(f"\n  WrightAI smoke test → {BASE_URL}\n")
passed = failed = skipped = 0
for label, ok, detail in results:
    if ok is None:
        icon, skipped = SKIP, skipped + 1
    elif ok:
        icon, passed = PASS, passed + 1
    else:
        icon, failed = FAIL, failed + 1
    suffix = f"  \033[2m{detail}\033[0m" if detail else ""
    print(f"  {icon}  {label}{suffix}")

print(f"\n  {passed} passed · {failed} failed · {skipped} skipped\n")
sys.exit(0 if failed == 0 else 1)
