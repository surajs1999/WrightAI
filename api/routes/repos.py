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
    """
    Saves an authentication token for a repository to a JSON file in the user directory.

    Reads existing tokens from .tokens.json if present, updates the token for the given repository slug, and writes the updated token mapping back to the file. If the file does not exist or cannot be read, it creates a new token mapping.

    Args:
        user_dir (Path): The user's directory path where the .tokens.json file is stored.
        repo_slug (str): The repository identifier (slug) to associate with the token.
        token (str): The authentication token to save for the repository.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        _save_token(Path('/home/user/.wright'), 'owner/repo', 'ghp_abc123def456')
        ```
    """
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
    """
    Loads an authentication token for a specific repository from the user's tokens file.

    Reads the .tokens.json file from the user directory and retrieves the token associated with the given repository slug. Returns None if the file doesn't exist, the repository slug is not found, or any error occurs during reading or parsing.

    Args:
        user_dir (Path): The directory path where the user's .tokens.json file is stored.
        repo_slug (str): The repository identifier used as the key to look up the token in the tokens file.

    Returns:
        str | None: The authentication token string for the specified repository, or None if the token file doesn't exist, the repository slug is not found, or an error occurs.

    Example:
        ```
        token = load_token(Path('/home/user'), 'owner/repo-name')
        ```
    """
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
    """
    Connects a Git repository by cloning or updating it locally for a specific user.

    Clones a new repository or updates an existing one using git pull. Handles GitHub authentication by injecting tokens into the clone URL for private repositories. Automatically detects the default branch and saves authentication credentials for future use.

    Args:
        body (ConnectRepoRequest): Request payload containing the git_url (repository URL), optional branch name, and optional github_token for authentication.
        request (Request): FastAPI request object used to extract the user ID from the request context.

    Returns:
        RepoInfo: Information about the connected repository including its ID, name, git URL, local file system path, and the active branch name.

    Raises:
        HTTPException: With status 500 when git pull fails to update an existing repository.
        HTTPException: With status 400 when authentication fails, repository is not found, or is private without proper credentials.
        HTTPException: With status 400 when git clone fails for any other reason.

    Example:
        ```
        repo_info = await connect_repo(ConnectRepoRequest(git_url='https://github.com/user/repo', github_token='ghp_token123'), request)
        ```
    """
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
    """
    Lists all Git repositories for the authenticated user from the local file system.

    Retrieves the user ID from the request, scans the user's repository directory for Git repositories, extracts repository metadata including the remote origin URL, and returns a list of repository information objects. If the user directory does not exist, returns an empty list.

    Args:
        request (Request): The incoming HTTP request containing user authentication information.

    Returns:
        list[RepoInfo]: A list of RepoInfo objects containing metadata for each Git repository found in the user's directory, including repository ID, name, Git URL, local path, and branch information.

    Example:
        ```
        repos = await list_repos(request)
        ```

    Complexity: O(n) time where n is the number of directories in the user's repository folder, O(n) space for storing repository information
    """
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
    """
    Deletes a repository for the authenticated user by removing its directory from the filesystem.

    This endpoint removes the repository directory and all its contents from the user's repository storage. The user is identified from the request, and the repository path is constructed using the user ID and repository name.

    Args:
        repo_name (str): The name of the repository to delete.
        request (Request): The FastAPI request object used to extract the authenticated user's ID.

    Returns:
        dict: A dictionary containing the deleted repository name with key 'deleted'.

    Raises:
        HTTPException: When the repository is not found (status code 404).

    Example:
        ```
        result = await delete_repo('my-project', request)
        # Returns: {'deleted': 'my-project'}
        ```
    """
    user_id = _user_id_from_request(request)
    repo_path = _REPOS_BASE / user_id / repo_name
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found")
    shutil.rmtree(repo_path)
    return {"deleted": repo_name}
