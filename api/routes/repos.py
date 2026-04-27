from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import verify_api_key


def _save_token(user_dir: Path, repo_slug: str, token: str) -> None:
    token_file = user_dir / ".tokens.json"
    data: dict = {}
    if token_file.exists():
        try:
            data = json.loads(token_file.read_text())
        except Exception:
            pass
    data[repo_slug] = token
    token_file.write_text(json.dumps(data))


def load_token(user_dir: Path, repo_slug: str) -> str | None:
    token_file = user_dir / ".tokens.json"
    if not token_file.exists():
        return None
    try:
        data = json.loads(token_file.read_text())
        return data.get(repo_slug)
    except Exception:
        return None


router = APIRouter(prefix="/repos", tags=["repos"], dependencies=[Depends(verify_api_key)])

_REPOS_BASE = Path(os.getenv("REPOS_PATH", "/data/repos"))


def _user_id_from_request(request: Request) -> str:
    """Extract user identifier from the request (API key header)."""
    key = request.headers.get("X-Wright-API-Key", "anonymous")
    # Use last 12 chars of the key as a safe directory name
    return key[-12:].replace("/", "_").replace(".", "_")


class ConnectRepoRequest(BaseModel):
    git_url: str
    github_token: str | None = None
    branch: str = "main"


class RepoInfo(BaseModel):
    id: str
    name: str
    git_url: str
    local_path: str
    branch: str


@router.post("/connect", response_model=RepoInfo)
async def connect_repo(body: ConnectRepoRequest, request: Request) -> RepoInfo:
    user_id = _user_id_from_request(request)
    user_dir = _REPOS_BASE / user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    # Derive a safe repo name from the URL
    repo_slug = body.git_url.rstrip("/").split("/")[-1].removesuffix(".git")
    repo_path = user_dir / repo_slug

    # Resolve GitHub token: explicit > OAuth token saved for this user
    github_token = body.github_token or load_token(user_dir, "_github_oauth") or ""

    # Inject token for private repos
    clone_url = body.git_url
    if not clone_url.startswith("https://"):
        clone_url = f"https://github.com/{clone_url.rstrip('/').split('github.com/')[-1]}"
    if github_token and "github.com/" in clone_url and "@github.com" not in clone_url:
        clone_url = clone_url.replace("https://github.com/", f"https://{github_token}@github.com/")

    # Prevent git from hanging trying to prompt for credentials in a subprocess
    git_env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"}

    if repo_path.exists():
        # Reset remote URL first so any previously-embedded bad token is cleared
        subprocess.run(
            ["git", "-C", str(repo_path), "remote", "set-url", "origin", clone_url],
            capture_output=True,
            timeout=10,
            env=git_env,
        )
        try:
            subprocess.run(
                ["git", "-C", str(repo_path), "pull", "--ff-only"],
                check=True,
                capture_output=True,
                timeout=120,
                env=git_env,
            )
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"git pull failed: {e.stderr.decode()}")
    else:
        # Clone without --branch so git uses the remote HEAD (works for main/master/any default)
        try:
            subprocess.run(
                ["git", "clone", "--depth=1", clone_url, str(repo_path)],
                check=True,
                capture_output=True,
                timeout=180,
                env=git_env,
            )
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode()
            if (
                "Authentication failed" in stderr
                or "could not read Username" in stderr
                or "Repository not found" in stderr
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Repository not found or is private. Connect GitHub first.",
                )
            raise HTTPException(status_code=400, detail=f"git clone failed: {stderr}")

    # Detect the actual branch that was checked out
    branch_result = subprocess.run(
        ["git", "-C", str(repo_path), "branch", "--show-current"],
        capture_output=True,
        text=True,
        timeout=5,
        env=git_env,
    )
    actual_branch = branch_result.stdout.strip() or body.branch

    if github_token:
        _save_token(user_dir, repo_slug, github_token)

    repo_id = f"{user_id}/{repo_slug}"
    return RepoInfo(
        id=repo_id,
        name=repo_slug,
        git_url=body.git_url,
        local_path=str(repo_path),
        branch=actual_branch,
    )


@router.get("", response_model=list[RepoInfo])
async def list_repos(request: Request) -> list[RepoInfo]:
    user_id = _user_id_from_request(request)
    user_dir = _REPOS_BASE / user_id
    if not user_dir.exists():
        return []
    repos = []
    for repo_path in user_dir.iterdir():
        if repo_path.is_dir() and (repo_path / ".git").exists():
            # Read remote URL
            try:
                result = subprocess.run(
                    ["git", "-C", str(repo_path), "remote", "get-url", "origin"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                git_url = result.stdout.strip()
            except Exception:
                git_url = ""
            repos.append(
                RepoInfo(
                    id=f"{user_id}/{repo_path.name}",
                    name=repo_path.name,
                    git_url=git_url,
                    local_path=str(repo_path),
                    branch="main",
                )
            )
    return repos


@router.delete("/{repo_name}")
async def delete_repo(repo_name: str, request: Request) -> dict:
    user_id = _user_id_from_request(request)
    repo_path = _REPOS_BASE / user_id / repo_name
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found")
    shutil.rmtree(repo_path)
    return {"deleted": repo_name}
