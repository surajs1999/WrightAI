from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import verify_api_key
from api.quota import check_quota

_logger = logging.getLogger("wright.repos")

# Tracks repos currently being indexed so we don't double-index
_indexing: set[str] = set()


def _chroma_for(repo_root: str):
    """
    Creates and returns a ChromaStore instance configured for the given repository root.

    Resolves the Chroma persistence path from the CHROMA_PATH environment variable, falling back to a default path of '<repo_root>/.wright/chroma', then instantiates and returns a ChromaStore with that path and the provided repository root. This factory helper is used by both _index_repo() and index_status() to obtain a consistent ChromaStore for a given repository.

    Args:
        repo_root (str): Absolute or relative path to the root directory of the repository for which the ChromaStore should be created.

    Returns:
        ChromaStore: A ChromaStore instance persisted at the resolved Chroma path and scoped to the given repository root.

    Example:
        ```
        store = _chroma_for('/home/user/my_project')
        ```
    """
    from core.embeddings.chroma_store import ChromaStore

    chroma_path = os.getenv("CHROMA_PATH", os.path.join(repo_root, ".wright", "chroma"))
    return ChromaStore(persist_path=chroma_path, repo_root=repo_root)


async def _index_repo(repo_root: str) -> None:
    """
    Indexes an entire repository by parsing source files, generating vector embeddings, and upserting them into a ChromaDB collection in a fire-and-forget async pattern.

    Checks whether indexing is already in progress for the given repository root to prevent duplicate concurrent runs. If the VOYAGE_API_KEY environment variable is set, offloads CPU-bound directory parsing (via CodeParser and ASTChunker) to a thread pool executor to avoid blocking the asyncio event loop, then generates embeddings with VoyageEmbedder and stores the resulting chunks in a ChromaDB collection scoped to the repository. Any exception during parsing, embedding, or upserting is caught and logged without re-raising, and the repository root is always removed from the in-progress tracking set upon completion.

    Args:
        repo_root (str): Absolute or relative filesystem path to the root directory of the repository to be indexed.

    Returns:
        None: This coroutine returns nothing; it is designed to be called in a fire-and-forget manner via asyncio.create_task().

    Raises:
        Exception: Any unexpected error during parsing, embedding, or upserting is caught internally, logged via the module logger, and not re-raised.

    Example:
        ```
        asyncio.create_task(_index_repo('/workspace/my_project'))
        ```
    """
    if repo_root in _indexing:
        return
    _indexing.add(repo_root)
    try:
        from core.embeddings.voyage_embeddings import VoyageEmbedder
        from core.parser.ast_chunker import ASTChunker
        from core.parser.tree_sitter_parser import CodeParser

        voyage_key = os.getenv("VOYAGE_API_KEY", "")
        if not voyage_key:
            _logger.warning("VOYAGE_API_KEY not set — skipping repo indexing for %s", repo_root)
            return

        _logger.info("Indexing repo: %s", repo_root)
        loop = asyncio.get_event_loop()

        # Run CPU-bound parsing in a thread pool to avoid blocking the event loop
        parsed = await loop.run_in_executor(None, CodeParser().parse_directory, repo_root)
        chunks = await loop.run_in_executor(None, ASTChunker().chunk_directory, parsed)
        if not chunks:
            _logger.info("No chunks to index for %s", repo_root)
            return

        embedder = VoyageEmbedder(api_key=voyage_key)
        embeddings = await loop.run_in_executor(None, embedder.embed_chunks, chunks)

        chroma = _chroma_for(repo_root)
        await loop.run_in_executor(None, chroma.upsert_chunks, chunks, embeddings)
        _logger.info("Indexed %d chunks for %s", len(chunks), repo_root)
    except Exception as e:
        _logger.error("Indexing failed for %s: %s", repo_root, e)
    finally:
        _indexing.discard(repo_root)


def _save_token(user_dir: Path, repo_slug: str, token: str) -> None:
    """
    Persists an authentication token for a repository slug to a JSON file in the specified user directory.

    Reads the existing token mapping from `.tokens.json` in the user directory if the file exists, updates or inserts the token for the provided repository slug, and writes the updated mapping back to disk. If the file is missing or its contents cannot be parsed as valid JSON, a fresh mapping is created containing only the new entry. This function is called by `connect_repo()` to store tokens after a successful repository connection.

    Args:
        user_dir (Path): The filesystem path to the user's directory where the `.tokens.json` file is stored or will be created.
        repo_slug (str): The repository identifier (e.g., 'owner/repo') used as the key in the token mapping.
        token (str): The authentication token to associate with and persist for the given repository slug.

    Returns:
        None: This function does not return a value; it writes the token to disk as a side effect.

    Example:
        ```
        _save_token(Path('/home/user/.wright'), 'octocat/hello-world', 'ghp_abc123def456')
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
    Loads an authentication token for a specific repository from the user's .tokens.json file.

    Reads the .tokens.json file located in the given user directory and retrieves the token associated with the provided repository slug. Returns None if the file does not exist, the slug is not present, or any error occurs during file reading or JSON parsing. Called by fix_and_pr() and connect_repo() to retrieve stored credentials.

    Args:
        user_dir (Path): The directory path where the user's .tokens.json file is stored.
        repo_slug (str): The repository identifier (e.g., 'owner/repo-name') used as the key to look up the token in the tokens file.

    Returns:
        str | None: The authentication token string for the specified repository, or None if the token file does not exist, the repository slug is not found, or an error occurs during reading or parsing.

    Example:
        ```
        token = load_token(Path('/home/user/.wright'), 'octocat/hello-world')
        if token:
            print(f'Token found: {token}')
        else:
            print('No token available for this repository.')
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
_API_URL = os.getenv("WRIGHT_API_URL", "https://api.wrightai.live")


def _register_github_webhook(github_token: str, git_url: str, api_key: str) -> None:
    """
    Registers a GitHub push webhook for the specified repository, skipping registration if the webhook already exists or silently suppressing any failure.

    Parses the GitHub repository owner and name from the provided Git URL, then queries the GitHub API to check whether a matching webhook is already registered. If no duplicate is found, it creates a new push webhook pointing to the internal API endpoint authenticated via the provided API key. All network and parsing errors are caught and either logged as warnings or silently ignored, ensuring this function never raises to its caller.

    Args:
        github_token (str): A GitHub personal access token or OAuth token with 'admin:repo_hook' permission used to authenticate requests to the GitHub API.
        git_url (str): The HTTPS or SSH URL of the GitHub repository (e.g. 'https://github.com/owner/repo.git') from which the owner and repo name are extracted.
        api_key (str): The internal API key appended as a query parameter to the webhook callback URL so that incoming webhook payloads can be authenticated.

    Returns:
        None: This function does not return a value; it performs a side effect of registering a webhook on GitHub.

    Example:
        ```
        _register_github_webhook(
            github_token='ghp_abc123XYZ',
            git_url='https://github.com/acme/my-service.git',
            api_key='internal-secret-key'
        )
        ```
    """
    import urllib.request
    import urllib.error
    import json as _json

    # Extract owner/repo from URL (handles https://github.com/owner/repo[.git])
    match = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$", git_url)
    if not match:
        return
    owner, repo = match.group(1), match.group(2)

    webhook_url = f"{_API_URL}/webhooks/github?token={api_key}"
    payload = _json.dumps(
        {
            "name": "web",
            "active": True,
            "events": ["push"],
            "config": {"url": webhook_url, "content_type": "json", "insecure_ssl": "0"},
        }
    ).encode()

    # Check if our webhook already exists to avoid duplicates
    list_req = urllib.request.Request(
        f"https://api.github.com/repos/{owner}/{repo}/hooks",
        headers={"Authorization": f"token {github_token}", "Accept": "application/vnd.github+json"},
    )
    try:
        with urllib.request.urlopen(list_req, timeout=10) as resp:
            existing = _json.loads(resp.read())
        if any(
            h.get("config", {}).get("url", "").startswith(f"{_API_URL}/webhooks/github")
            for h in existing
        ):
            return  # already registered
    except Exception:
        pass  # can't list — try to create anyway

    create_req = urllib.request.Request(
        f"https://api.github.com/repos/{owner}/{repo}/hooks",
        data=payload,
        headers={
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(create_req, timeout=10)
        _logger.info("Registered GitHub webhook for %s/%s", owner, repo)
    except Exception as e:
        _logger.warning("Could not register webhook for %s/%s: %s", owner, repo, e)


def _user_id_from_request(request: Request) -> str:
    """
    Extracts a stable user identifier from the incoming request by reading the last 12 characters of the X-Wright-API-Key header.

    Reads the X-Wright-API-Key HTTP header from the request and uses its last 12 characters as a safe, filesystem-friendly user identifier. Forward slashes and dots are replaced with underscores to prevent path-traversal issues. Falls back to the string 'anonymous' if the header is absent. Called by route handlers such as connect_repo(), list_repos(), delete_repo(), index_status(), and sync_repo() to scope repository data to the authenticated caller.

    Args:
        request (Request): FastAPI Request object from which the X-Wright-API-Key header is extracted to derive the user identifier.

    Returns:
        str: A sanitized 12-character (or shorter) string derived from the tail of the API key, with '/' and '.' replaced by '_', or 'anonymous' if the header is missing.

    Example:
        ```
        user_id = _user_id_from_request(request)  # e.g. 'abc123xyz789' when X-Wright-API-Key is 'ghp_someverylongtoken_abc123xyz789'
        ```
    """
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
    Connects a Git repository for a specific user by cloning it fresh or pulling the latest changes into an existing local copy.

    Derives a safe repository slug from the provided URL and resolves a GitHub token from the request body or a previously saved OAuth token. Injects the token into the clone URL for private repositories and disables interactive git credential prompts. If the repository already exists locally, it attempts a fast-forward pull; on failure it falls back to a shallow fetch and hard reset to FETCH_HEAD. For new repositories, it performs a shallow clone. After syncing, the active branch is detected automatically, the token is persisted for future use, a GitHub webhook is registered asynchronously, and background indexing is kicked off via asyncio.create_task.

    Args:
        body (ConnectRepoRequest): Request payload containing git_url (the repository URL to connect), an optional branch name, and an optional github_token for authenticating against private repositories.
        request (Request): FastAPI Request object used to extract the authenticated user's ID from the request context and to retrieve the X-Wright-API-Key header for webhook registration.

    Returns:
        RepoInfo: A RepoInfo object containing the repository's composite ID (user_id/repo_slug), human-readable name, sanitized git URL (with any embedded tokens removed), absolute local filesystem path, and the currently active branch name.

    Raises:
        HTTPException: Status 400 when git clone times out, when authentication fails, when the repository is not found, when the repository is private and no credentials are supplied, or when git clone fails for any other reason.
        HTTPException: Status 400 when the fallback git fetch times out or when git fetch/reset fails during an attempted re-sync of an existing repository.

    Example:
        ```
        repo_info = await connect_repo(
            body=ConnectRepoRequest(
                git_url='https://github.com/octocat/Hello-World',
                github_token='ghp_abc123secrettoken'
            ),
            request=request
        )
        ```
    """
    api_key = request.headers.get("X-Wright-API-Key", "")
    check_quota(api_key, "repo_connect", raise_on_blocked=True)

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
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            # Fast-forward failed (e.g. force-push, shallow history diverged, or timeout).
            # Re-sync by fetching the latest shallow tip and hard-resetting to it.
            try:
                subprocess.run(
                    ["git", "-C", str(repo_path), "fetch", "--depth=1", "origin"],
                    check=True,
                    capture_output=True,
                    timeout=120,
                    env=git_env,
                )
                subprocess.run(
                    ["git", "-C", str(repo_path), "reset", "--hard", "FETCH_HEAD"],
                    check=True,
                    capture_output=True,
                    timeout=30,
                    env=git_env,
                )
            except subprocess.TimeoutExpired:
                raise HTTPException(status_code=400, detail="git fetch timed out — try again.")
            except subprocess.CalledProcessError as e2:
                raise HTTPException(
                    status_code=400, detail=f"Could not sync repo: {e2.stderr.decode()}"
                )
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
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=400, detail="git clone timed out — check the URL and try again."
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
        # Auto-register webhook so every push triggers a sync — fire-and-forget
        api_key = request.headers.get("X-Wright-API-Key", "")
        clean_url = re.sub(r"https://[^@]+@", "https://", body.git_url)
        _register_github_webhook(github_token, clean_url, api_key)

    # Kick off indexing in the background — chat will be ready by the time
    # the user navigates there. Does nothing if VOYAGE_API_KEY is not set.
    asyncio.create_task(_index_repo(str(repo_path)))

    from api.usage_store import record_event
    record_event(request.headers.get("X-Wright-API-Key", ""), "repo_connect", repo_name=repo_slug)

    repo_id = f"{user_id}/{repo_slug}"
    return RepoInfo(
        id=repo_id,
        name=repo_slug,
        git_url=re.sub(r"https://[^@]+@", "https://", body.git_url),
        local_path=str(repo_path),
        branch=actual_branch,
    )


@router.get("", response_model=list[RepoInfo])
async def list_repos(request: Request) -> list[RepoInfo]:
    """
    Lists all Git repositories for the authenticated user by scanning their local repository directory and returning metadata for each discovered repo.

    Retrieves the user ID from the incoming HTTP request, constructs the user-specific repository base path, and iterates over subdirectories to find valid Git repositories (identified by the presence of a .git folder). For each repository, it invokes a subprocess call to extract the remote origin URL and strips any embedded OAuth tokens before assembling a RepoInfo object. Returns an empty list if the user directory does not exist.

    Args:
        request (Request): The incoming HTTP request object containing user authentication information used to derive the user ID via _user_id_from_request().

    Returns:
        list[RepoInfo]: A list of RepoInfo objects, each containing the repository's composite ID (user_id/repo_name), name, sanitized remote Git URL, absolute local path, and default branch name ('main'). Returns an empty list if no repositories are found or the user directory does not exist.

    Example:
        ```
        repos = await list_repos(request)
        for repo in repos:
            print(repo.name, repo.git_url)
        ```

    Complexity: O(n) time where n is the number of directories in the user's repository folder; O(n) space for storing the resulting RepoInfo list.
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
                # Strip embedded OAuth token (https://token@github.com/...)
                git_url = re.sub(r"https://[^@]+@", "https://", result.stdout.strip())
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
    Deletes a repository and all its contents from the filesystem for the authenticated user.

    This async DELETE endpoint constructs the repository path from the authenticated user's ID and the provided repository name, verifies the path exists, and recursively removes the directory and all its contents using shutil.rmtree. The user identity is extracted from the incoming request via _user_id_from_request().

    Args:
        repo_name (str): The name of the repository to delete, used to locate the directory under the user's repository storage.
        request (Request): The FastAPI Request object from which the authenticated user's ID is extracted to construct the repository path.

    Returns:
        dict: A dictionary with a single key 'deleted' whose value is the name of the repository that was removed, e.g. {'deleted': 'my-project'}.

    Raises:
        HTTPException: Raised with HTTP status code 404 and detail 'Repo not found' when the specified repository directory does not exist on the filesystem.

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


@router.get("/{repo_name}/index-status")
async def index_status(repo_name: str, request: Request) -> dict:
    """
    Returns the indexing status of a named repository, including whether it has been indexed and if indexing is currently in progress.

    This async GET endpoint resolves the authenticated user's repository by name, checks whether the repository path exists on disk, queries the associated ChromaDB collection for the current chunk count, and returns a status payload indicating whether indexing has completed, how many chunks are stored, and whether indexing is actively running.

    Args:
        repo_name (str): The name of the repository whose index status is being queried.
        request (Request): The incoming HTTP request object, used to extract the authenticated user's ID via _user_id_from_request.

    Returns:
        dict: A dictionary with three keys: 'indexed' (bool) indicating whether at least one chunk exists, 'chunk_count' (int) with the total number of indexed chunks, and 'indexing' (bool) indicating whether indexing is currently in progress for this repository.

    Raises:
        HTTPException: Raised with status code 404 and detail 'Repo not found' when the resolved repository path does not exist on the filesystem.

    Example:
        ```
        # GET /my-project/index-status
        response = await client.get('/my-project/index-status')
        # Example response: {"indexed": True, "chunk_count": 42, "indexing": False}
        ```
    """
    user_id = _user_id_from_request(request)
    repo_path = _REPOS_BASE / user_id / repo_name
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found")

    repo_root = str(repo_path)
    indexing = repo_root in _indexing

    try:
        chroma = _chroma_for(repo_root)
        count = chroma.count()
    except Exception:
        count = 0

    return {"indexed": count > 0, "chunk_count": count, "indexing": indexing}


@router.post("/{repo_name}/sync")
async def sync_repo(repo_name: str, request: Request) -> dict:
    """
    Pulls the latest commits for a connected repository via fast-forward merge and re-indexes it asynchronously.

    Handles a POST request to sync a user-owned Git repository by running 'git pull --ff-only' in a subprocess with a 120-second timeout, then schedules a background re-indexing task. The operation is idempotent and can be triggered manually or via automation. Interactive Git prompts are suppressed to prevent hanging in headless environments.

    Args:
        repo_name (str): The name of the repository to sync, used as a path segment under the user's base directory.
        request (Request): The incoming FastAPI/Starlette HTTP request object, used to extract the authenticated user's ID.

    Returns:
        dict: A dictionary confirming the sync was initiated, e.g. {'synced': True, 'repo': 'my-repo'}.

    Raises:
        HTTPException(404): When the specified repository path does not exist on disk for the authenticated user.
        HTTPException(500): When 'git pull --ff-only' exits with a non-zero return code, indicating a pull failure (e.g. non-fast-forward update or remote error).
        HTTPException(504): When the 'git pull' subprocess exceeds the 120-second timeout.

    Example:
        ```
        # Via HTTP client:
        # POST /my-project/sync
        # Response: {"synced": true, "repo": "my-project"}

        response = await client.post("/my-project/sync", headers={"Authorization": "Bearer <token>"})
        assert response.json() == {"synced": True, "repo": "my-project"}
        ```
    """
    user_id = _user_id_from_request(request)
    repo_path = _REPOS_BASE / user_id / repo_name
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found")

    git_env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"}
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_path), "pull", "--ff-only"],
            capture_output=True,
            timeout=120,
            env=git_env,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500, detail=f"git pull failed: {result.stderr.decode()}"
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="git pull timed out")

    asyncio.create_task(_index_repo(str(repo_path)))
    from api.usage_store import record_event
    record_event(request.headers.get("X-Wright-API-Key", ""), "repo_sync", repo_name=repo_name)
    return {"synced": True, "repo": repo_name}


@router.post("/{repo_name}/index")
async def trigger_index(repo_name: str, request: Request) -> dict:
    """
    Triggers background indexing for a specified repository, returning immediately and skipping if indexing is already in progress.

    This is an idempotent POST endpoint that initiates an asynchronous indexing task for the given repository. It resolves the repository path from the authenticated user's base directory, raises a 404 if the repository does not exist, and spawns a background task via asyncio only if indexing is not already running. The response indicates whether a new indexing task was started.

    Args:
        repo_name (str): The name of the repository to index, used to locate the repo under the authenticated user's base directory.
        request (Request): The incoming HTTP request object, used to extract the authenticated user's ID via _user_id_from_request().

    Returns:
        dict: A dictionary with two keys: 'started' (bool) indicating whether a new indexing task was launched in this call, and 'indexing' (bool) which is always True to confirm indexing is active.

    Raises:
        HTTPException: Raised with status code 404 when the specified repository path does not exist for the authenticated user.

    Example:
        ```
        # POST /my-project/index
        response = await client.post('/my-project/index', headers={'Authorization': 'Bearer token123'})
        # Example response: {'started': True, 'indexing': True}
        ```
    """
    user_id = _user_id_from_request(request)
    repo_path = _REPOS_BASE / user_id / repo_name
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found")

    repo_root = str(repo_path)
    already = repo_root in _indexing
    if not already:
        asyncio.create_task(_index_repo(repo_root))

    from api.usage_store import record_event
    record_event(request.headers.get("X-Wright-API-Key", ""), "repo_index", repo_name=repo_name)
    return {"started": not already, "indexing": True}
