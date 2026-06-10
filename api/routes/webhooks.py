from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

_logger = logging.getLogger("wright.webhooks")

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Repos live on local NVMe under REPOS_TMP_PATH — same as repos.py _REPOS_BASE
_REPOS_BASE = Path(os.getenv("REPOS_TMP_PATH", "/tmp/repos"))


def _verify_signature(body: bytes, signature_header: str | None, secret: str) -> bool:
    """
    Verifies a GitHub webhook HMAC-SHA256 signature against the raw request body and shared secret using constant-time comparison.

    Computes the expected HMAC-SHA256 digest of the raw request body using the provided secret, then performs a constant-time comparison against the supplied signature header to prevent timing attacks. Returns False immediately if the header is missing or does not begin with the required 'sha256=' prefix. Called by github_webhook() to authenticate incoming webhook requests from GitHub.

    Args:
        body (bytes): The raw bytes of the incoming webhook request body to be verified.
        signature_header (str | None): The value of the 'X-Hub-Signature-256' header from the GitHub webhook request, expected in the format 'sha256=<hex_digest>'. If None or missing the 'sha256=' prefix, verification fails immediately.
        secret (str): The shared webhook secret configured in both GitHub and the application, used as the HMAC key to compute the expected signature.

    Returns:
        bool: True if the computed HMAC-SHA256 digest of the body matches the provided signature header; False if the header is missing, malformed, or the digests do not match.

    Example:
        ```
        is_valid = _verify_signature(b'{"action": "opened"}', 'sha256=abc123def456...', 'my_webhook_secret')
        ```
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@router.post("/github")
async def github_webhook(
    request: Request,
    token: str = Query(..., description="Your WrightAI API key"),
) -> JSONResponse:
    """
    Handles incoming GitHub push webhooks by verifying the request signature, pulling the latest code via git, and scheduling an asynchronous re-indexing task.

    This async FastAPI route endpoint listens for GitHub webhook events sent via POST to '/github'. It optionally verifies the request signature using a shared HMAC secret (GITHUB_WEBHOOK_SECRET), short-circuits on ping and non-push events, validates the WrightAI API key, runs a fast-forward 'git pull' on the locally cloned repository, and schedules an asynchronous re-indexing task via asyncio.create_task. Returns a JSON response indicating the outcome of the sync operation.

    Args:
        request (Request): The incoming FastAPI/Starlette HTTP request object, used to read the raw body, headers (X-Hub-Signature-256, X-GitHub-Event), and JSON payload from the GitHub webhook.
        token (str): The WrightAI API key provided as a query parameter, used to authenticate the user and resolve their associated repository storage path on disk.

    Returns:
        JSONResponse: A JSON response with one of the following shapes: {'pong': True} for ping events; {'ignored': True, 'event': <event>} for non-push events; {'synced': False, 'reason': <reason>} if the repo is not connected, git pull fails, or times out; or {'synced': True, 'repo': <repo_name>} on successful sync and re-index scheduling.

    Raises:
        HTTPException: Raised with status 401 if the HMAC webhook signature verification fails when GITHUB_WEBHOOK_SECRET is set in the environment.
        HTTPException: Raised with status 401 if the provided API key token does not correspond to a valid user as determined by get_user_by_api_key.
        HTTPException: Raised with status 400 if the request body cannot be parsed as valid JSON.
        HTTPException: Raised with status 400 if the repository name cannot be determined from the 'repository.name' field in the webhook payload.

    Example:
        ```
        # Triggered automatically by GitHub; manual curl example:
        # curl -X POST 'https://api.wrightai.com/webhooks/github?token=myapikey123' \
        #   -H 'X-GitHub-Event: push' \
        #   -H 'X-Hub-Signature-256: sha256=<hmac_hex>' \
        #   -H 'Content-Type: application/json' \
        #   -d '{"repository": {"name": "my-repo"}, "ref": "refs/heads/main"}'
        # Expected response: {"synced": true, "repo": "my-repo"}
        ```
    """
    body = await request.body()

    # Optional extra verification via a shared webhook secret
    webhook_secret = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    if webhook_secret:
        sig = request.headers.get("X-Hub-Signature-256")
        if not _verify_signature(body, sig, webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")
    if event == "ping":
        return JSONResponse({"pong": True})
    if event != "push":
        return JSONResponse({"ignored": True, "event": event})

    # Validate the API key token
    from api.user_store import get_user_by_api_key

    user = get_user_by_api_key(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    repo_name = payload.get("repository", {}).get("name", "")
    if not repo_name:
        raise HTTPException(status_code=400, detail="Cannot determine repository name from payload")

    user_id = token[-12:].replace("/", "_").replace(".", "_")
    repo_path = _REPOS_BASE / user_id / repo_name

    if not repo_path.exists():
        _logger.warning("Webhook for unknown repo %s (user %s)", repo_name, user_id)
        return JSONResponse({"synced": False, "reason": "repo not connected"})

    git_env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"}
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            ["git", "-C", str(repo_path), "pull", "--ff-only"],
            capture_output=True,
            timeout=120,
            env=git_env,
        )
        if result.returncode != 0:
            stderr = result.stderr.decode()
            _logger.error("git pull failed for %s: %s", repo_name, stderr)
            return JSONResponse({"synced": False, "reason": stderr})
    except subprocess.TimeoutExpired:
        return JSONResponse({"synced": False, "reason": "git pull timed out"})

    _logger.info("Synced %s for user %s via webhook", repo_name, user_id)

    from api.routes.repos import _backup_to_gcs, _index_repo

    asyncio.create_task(_index_repo(str(repo_path)))
    asyncio.create_task(asyncio.to_thread(_backup_to_gcs, user_id, repo_name))

    return JSONResponse({"synced": True, "repo": repo_name})
