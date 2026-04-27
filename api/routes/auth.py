from __future__ import annotations

import base64
import json
import os
from pathlib import Path

import httpx
from workos import WorkOSClient
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

_workos_client: WorkOSClient | None = None


def _get_workos() -> WorkOSClient:
    global _workos_client
    if _workos_client is None:
        api_key = os.getenv("WORKOS_API_KEY", "")
        client_id = os.getenv("WORKOS_CLIENT_ID", "")
        if not api_key or not client_id:
            raise HTTPException(status_code=503, detail="WorkOS not configured")
        _workos_client = WorkOSClient(api_key=api_key, client_id=client_id)
    return _workos_client


FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.get("/login")
async def login(provider: str = "GoogleOAuth", redirect_uri: str | None = None) -> RedirectResponse:
    uri = redirect_uri or f"{FRONTEND_URL}/auth/callback"
    url = _get_workos().user_management.get_authorization_url(
        provider=provider,
        redirect_uri=uri,
    )
    return RedirectResponse(url)


class CallbackRequest(BaseModel):
    code: str


@router.post("/callback")
async def callback(body: CallbackRequest, redirect_uri: str | None = None) -> dict:
    try:
        from api.user_store import get_or_create_user

        auth = _get_workos().user_management.authenticate_with_code(
            code=body.code,
        )
        user = get_or_create_user(
            workos_user_id=auth.user.id,
            email=auth.user.email,
        )
        return {
            "api_key": user.api_key,
            "user": {
                "id": auth.user.id,
                "email": auth.user.email,
                "first_name": auth.user.first_name,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/callback")
async def callback_get(code: str, redirect_uri: str | None = None) -> dict:
    return await callback(CallbackRequest(code=code), redirect_uri=redirect_uri)


# ── GitHub OAuth for private repo access ─────────────────────────────────────

_REPOS_BASE = Path(os.getenv("REPOS_PATH", "/data/repos"))
_GH_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
_GH_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")


def _user_dir_from_key(api_key: str) -> Path:
    user_id = api_key[-12:].replace("/", "_").replace(".", "_")
    return _REPOS_BASE / user_id


def _save_github_token(api_key: str, token: str) -> None:
    user_dir = _user_dir_from_key(api_key)
    user_dir.mkdir(parents=True, exist_ok=True)
    token_file = user_dir / ".tokens.json"
    data: dict = {}
    if token_file.exists():
        try:
            data = json.loads(token_file.read_text())
        except Exception:
            pass
    data["_github_oauth"] = token
    token_file.write_text(json.dumps(data))


@router.get("/github")
async def github_login(request: Request) -> RedirectResponse:
    if not _GH_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")
    api_key = request.headers.get("X-Wright-API-Key", "")
    state = base64.urlsafe_b64encode(api_key.encode()).decode()
    backend_url = os.getenv("BACKEND_URL", "https://wrightai-api.fly.dev")
    redirect_uri = f"{backend_url}/auth/github/callback"
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={_GH_CLIENT_ID}"
        f"&scope=repo"
        f"&state={state}"
        f"&redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url)


@router.get("/github/callback")
async def github_callback(code: str, state: str = "") -> RedirectResponse:
    if not _GH_CLIENT_ID or not _GH_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={
                "client_id": _GH_CLIENT_ID,
                "client_secret": _GH_CLIENT_SECRET,
                "code": code,
            },
            timeout=15,
        )

    data = resp.json()
    token = data.get("access_token", "")
    if not token:
        raise HTTPException(
            status_code=400, detail=f"GitHub OAuth failed: {data.get('error_description', data)}"
        )

    try:
        api_key = base64.urlsafe_b64decode(state.encode()).decode()
    except Exception:
        api_key = ""

    if api_key:
        _save_github_token(api_key, token)

    return RedirectResponse(f"{FRONTEND_URL}/dashboard?github=connected")


@router.get("/github/repos")
async def github_repos(request: Request) -> dict:
    api_key = request.headers.get("X-Wright-API-Key", "")
    user_dir = _user_dir_from_key(api_key)
    token_file = user_dir / ".tokens.json"
    token = ""
    if token_file.exists():
        try:
            data = json.loads(token_file.read_text())
            token = data.get("_github_oauth", "")
        except Exception:
            pass
    if not token:
        return {"repos": [], "error": "GitHub not connected"}

    all_repos = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github.v3+json",
                },
                params={
                    "per_page": 100,
                    "page": page,
                    "sort": "updated",
                    "affiliation": "owner,collaborator",
                },
                timeout=15,
            )
            if resp.status_code != 200:
                break
            batch = resp.json()
            if not batch:
                break
            all_repos.extend(
                {"full_name": r["full_name"], "private": r["private"], "clone_url": r["clone_url"]}
                for r in batch
            )
            if len(batch) < 100:
                break
            page += 1

    return {"repos": all_repos}


@router.get("/github/status")
async def github_status(request: Request) -> dict:
    api_key = request.headers.get("X-Wright-API-Key", "")
    user_dir = _user_dir_from_key(api_key)
    token_file = user_dir / ".tokens.json"
    if token_file.exists():
        try:
            data = json.loads(token_file.read_text())
            if data.get("_github_oauth"):
                return {"connected": True}
        except Exception:
            pass
    return {"connected": False}
