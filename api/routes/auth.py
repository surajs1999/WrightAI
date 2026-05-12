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
    """
    Retrieves or initializes a singleton WorkOSClient instance using environment variables for authentication.

    This function implements a lazy initialization pattern for the global WorkOSClient. It checks if the client has been initialized, and if not, retrieves the API key and client ID from environment variables (WORKOS_API_KEY and WORKOS_CLIENT_ID), validates their presence, and creates a new WorkOSClient instance. Subsequent calls return the cached instance.

    Returns:
        WorkOSClient: The singleton WorkOSClient instance configured with API credentials from environment variables.

    Raises:
        HTTPException: When WORKOS_API_KEY or WORKOS_CLIENT_ID environment variables are not set or are empty (status_code=503).

    Example:
        ```
        workos_client = _get_workos()
        ```
    """
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
    """
    Initiates the OAuth login flow by redirecting the user to the authentication provider's authorization URL.

    This endpoint starts the OAuth authentication process using WorkOS user management. It constructs an authorization URL with the specified provider and redirect URI, then returns a redirect response to send the user to the provider's login page.

    Args:
        provider (str): The OAuth provider to use for authentication (default: 'GoogleOAuth').
        redirect_uri (str | None): The URI to redirect to after authentication; defaults to '{FRONTEND_URL}/auth/callback' if not provided.

    Returns:
        RedirectResponse: A redirect response that sends the user to the OAuth provider's authorization URL.

    Example:
        ```
        response = await login(provider='GoogleOAuth', redirect_uri='https://example.com/callback')
        ```
    """
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
    """
    Handles OAuth callback by authenticating the user with WorkOS authorization code and returning API credentials.

    Processes the OAuth callback request by exchanging the authorization code for user authentication data via WorkOS, creates or retrieves the user from the local database, and returns the user's API key along with basic profile information.

    Args:
        body (CallbackRequest): Request body containing the authorization code from the OAuth flow.
        redirect_uri (str | None): Optional redirect URI parameter (currently unused in the function logic).

    Returns:
        dict: Dictionary containing the user's API key and user information including id, email, and first_name.

    Raises:
        HTTPException: When authentication with WorkOS fails or any error occurs during user creation/retrieval, returns 401 status code with error details.

    Example:
        ```
        response = await callback(CallbackRequest(code='auth_code_123'))
        ```
    """
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
    """
    Handles the OAuth callback GET request by delegating to the callback handler with the authorization code.

    This endpoint receives the OAuth authorization code from the OAuth provider's redirect and processes it by creating a CallbackRequest object and invoking the main callback handler function. It serves as a GET endpoint wrapper around the POST callback logic.

    Args:
        code (str): The authorization code received from the OAuth provider after user authentication.
        redirect_uri (str | None): Optional redirect URI to validate against the one used in the authorization request. Defaults to None.

    Returns:
        dict: A dictionary containing the authentication result, typically including access tokens and user information.

    Example:
        ```
        result = await callback_get(code="AUTH_CODE_123", redirect_uri="https://example.com/callback")
        ```
    """
    return await callback(CallbackRequest(code=code), redirect_uri=redirect_uri)


# ── GitHub OAuth for private repo access ─────────────────────────────────────

_REPOS_BASE = Path(os.getenv("REPOS_PATH", "/data/repos"))
_GH_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
_GH_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")


def _user_dir_from_key(api_key: str) -> Path:
    """
    Generates a user-specific directory path by extracting and sanitizing the last 12 characters of an API key.

    Creates a Path object for a user directory by taking the last 12 characters of the provided API key, replacing forward slashes and dots with underscores to ensure filesystem compatibility, and appending it to the base repositories directory.

    Args:
        api_key (str): The API key from which to derive the user directory path. The last 12 characters are used as the user identifier.

    Returns:
        Path: A Path object representing the user-specific directory under the base repositories path.

    Example:
        ```
        user_path = _user_dir_from_key('abc123xyz456789qwerty')
        ```

    Complexity: O(1) time, O(1) space
    """
    user_id = api_key[-12:].replace("/", "_").replace(".", "_")
    return _REPOS_BASE / user_id


def _save_github_token(api_key: str, token: str) -> None:
    """
    Saves a GitHub OAuth token to a JSON file associated with the user's API key.

    Creates a user directory based on the API key if it doesn't exist, loads existing tokens from a .tokens.json file (if present), adds or updates the GitHub OAuth token, and writes the updated data back to the file.

    Args:
        api_key (str): The API key used to identify the user and determine the storage directory.
        token (str): The GitHub OAuth access token to be saved.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        _save_github_token(api_key='user_api_key_123', token='gho_abc123def456')
        ```
    """
    user_dir = _user_dir_from_key(api_key)
    user_dir.mkdir(parents=True, exist_ok=True)
    token_file = user_dir / ".tokens.json"
    data: dict = {}
    if token_file.exists():
        try:
            """
            Handles the GitHub OAuth callback by exchanging an authorization code for an access token and saving it.

            This endpoint is called by GitHub after the user authorizes the application. It exchanges the authorization code for an access token, optionally decodes the API key from the state parameter, saves the GitHub token associated with the API key, and redirects the user to the dashboard with a success indicator.

            Args:
                code (str): Authorization code returned by GitHub after user authorization.
                state (str): Base64-encoded API key passed through the OAuth flow for associating the GitHub token with a user. Defaults to empty string.

            Returns:
                RedirectResponse: Redirect response to the frontend dashboard with a 'github=connected' query parameter.

            Raises:
                HTTPException: When GitHub OAuth credentials are not configured (status 503).
                HTTPException: When GitHub fails to return an access token (status 400).

            Example:
                ```
                response = await github_callback(code='abc123', state='ZXhhbXBsZV9hcGlfa2V5')
                ```
            """
            data = json.loads(token_file.read_text())
        except Exception:
            pass
    data["_github_oauth"] = token
    token_file.write_text(json.dumps(data))


@router.get("/github")
async def github_login(request: Request) -> RedirectResponse:
    """
    Initiates the GitHub OAuth login flow by redirecting the user to GitHub's authorization page with the appropriate parameters.

    Constructs a GitHub OAuth authorization URL with the client ID, repository scope, API key encoded as state, and callback redirect URI. The API key is extracted from request headers and base64-encoded to preserve it through the OAuth flow. If GitHub OAuth is not configured (missing client ID), raises an HTTP 503 error.

    Args:
        request (Request): The incoming HTTP request object containing headers with optional X-Wright-API-Key for state preservation.

    Returns:
        RedirectResponse: A redirect response to GitHub's OAuth authorization URL with client_id, scope (repo), encoded state, and redirect_uri parameters.

    Raises:
        HTTPException: When GitHub OAuth is not configured (status_code=503) due to missing _GH_CLIENT_ID.

    Example:
        ```
        response = await github_login(request)
        ```
    """
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
    """
    Handles the GitHub OAuth callback by exchanging the authorization code for an access token and redirecting to the dashboard.

    This endpoint receives the OAuth callback from GitHub after user authorization. It exchanges the authorization code for an access token, optionally decodes the state parameter to retrieve an API key, saves the GitHub token if an API key is present, and redirects the user to the frontend dashboard with a success indicator.

    Args:
        code (str): The authorization code returned by GitHub OAuth flow.
        state (str): Optional base64-encoded API key passed through the OAuth flow for associating the GitHub token with a user account.

    Returns:
        RedirectResponse: A redirect response to the frontend dashboard with a 'github=connected' query parameter.

    Raises:
        HTTPException: When GitHub OAuth is not configured (status 503) or when GitHub fails to return an access token (status 400).

    Example:
        ```
        response = await github_callback(code='gho_abc123xyz', state='YXBpX2tleV8xMjM=')
        ```
    """
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
    """
    Fetches all GitHub repositories for the authenticated user via the GitHub API.

    Retrieves the user's GitHub OAuth token from their local token file, then paginates through the GitHub API to fetch all repositories (both owned and collaborated) sorted by update time. Returns repository metadata including full name, privacy status, and clone URL.

    Args:
        request (Request): FastAPI request object containing the X-Wright-API-Key header for user authentication.

    Returns:
        dict: Dictionary containing 'repos' key with a list of repository objects (each with 'full_name', 'private', and 'clone_url' fields), or 'error' key if GitHub is not connected.

    Example:
        ```
        result = await github_repos(request)
        # Returns: {'repos': [{'full_name': 'user/repo', 'private': False, 'clone_url': 'https://github.com/user/repo.git'}]}
        ```

    Complexity: O(n) time where n is the total number of repositories, O(n) space for storing repository list
    """
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
    """
    Checks whether a GitHub OAuth connection exists for the authenticated user.

    Retrieves the user's API key from request headers, locates their token file, and checks if a GitHub OAuth token is present in the stored data.

    Args:
        request (Request): The incoming HTTP request containing the X-Wright-API-Key header for user authentication.

    Returns:
        dict: A dictionary with a 'connected' key indicating True if GitHub OAuth token exists, False otherwise.

    Example:
        ```
        status = await github_status(request)
        ```
    """
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
