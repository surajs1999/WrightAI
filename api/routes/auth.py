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
    Retrieves or initializes a module-level singleton WorkOSClient instance using API credentials from environment variables.

    Implements a lazy initialization pattern for a module-level WorkOSClient singleton. On the first call, reads WORKOS_API_KEY and WORKOS_CLIENT_ID from environment variables, validates that both are non-empty, and constructs the client. All subsequent calls return the already-initialized cached instance without re-reading environment variables. Called internally by the login() and callback() route handlers.

    Returns:
        WorkOSClient: The singleton WorkOSClient instance configured with the API key and client ID sourced from the WORKOS_API_KEY and WORKOS_CLIENT_ID environment variables.

    Raises:
        HTTPException: Raised with status_code=503 when either WORKOS_API_KEY or WORKOS_CLIENT_ID environment variables are not set or are empty strings.

    Example:
        ```
        workos_client = _get_workos()
        authorization_url = workos_client.sso.get_authorization_url(domain='example.com')
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

    This async endpoint starts the OAuth authentication process using WorkOS user management. It constructs an authorization URL with the specified provider and redirect URI, then returns a RedirectResponse to send the user to the provider's login page. If no redirect URI is provided, it defaults to '{FRONTEND_URL}/auth/callback'.

    Args:
        provider (str): The OAuth provider to use for authentication. Defaults to 'GoogleOAuth'.
        redirect_uri (str | None): The URI to redirect to after successful authentication. If not provided, defaults to '{FRONTEND_URL}/auth/callback'.

    Returns:
        RedirectResponse: A redirect response that sends the user's browser to the OAuth provider's authorization URL to complete the login process.

    Example:
        ```
        response = await login(provider='GoogleOAuth', redirect_uri='https://example.com/auth/callback')
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
    Handles OAuth callback by exchanging a WorkOS authorization code for user credentials and returning an API key with profile information.

    Processes the OAuth callback request by exchanging the authorization code for user authentication data via WorkOS, creates or retrieves the user from the local database, and returns the user's API key along with basic profile information. If any step in the authentication or user lookup/creation process fails, a 401 HTTP exception is raised.

    Args:
        body (CallbackRequest): Request body containing the authorization code received from the OAuth flow to be exchanged for user authentication data.
        redirect_uri (str | None): Optional redirect URI parameter passed as a query argument; currently unused in the function logic.

    Returns:
        dict: A dictionary containing 'api_key' (the user's API key string) and 'user' (a nested dict with 'id', 'email', and 'first_name' fields from the authenticated WorkOS user).

    Raises:
        HTTPException: Raised with a 401 status code when WorkOS authentication fails, the authorization code is invalid or expired, or an error occurs during user creation or retrieval.

    Example:
        ```
        response = await callback(body=CallbackRequest(code='auth_code_abc123'), redirect_uri=None)
        # Returns: {'api_key': 'usr_key_xyz', 'user': {'id': 'user_01ABC', 'email': 'jane@example.com', 'first_name': 'Jane'}}
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

    This endpoint receives the OAuth authorization code from the OAuth provider's redirect and processes it by creating a CallbackRequest object and invoking the main callback handler function. It serves as a GET endpoint wrapper around the POST callback logic, allowing OAuth providers that use GET redirects to be handled seamlessly.

    Args:
        code (str): The authorization code received from the OAuth provider after successful user authentication.
        redirect_uri (str | None): Optional redirect URI to validate against the one used in the original authorization request. Defaults to None.

    Returns:
        dict: A dictionary containing the authentication result, typically including access tokens and user information returned by the OAuth provider.

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
    Derives a filesystem-safe, user-specific directory path from the last 12 characters of the provided API key.

    Extracts the trailing 12 characters of the given API key, replaces forward slashes and dots with underscores to ensure filesystem compatibility, and appends the resulting identifier to the base repositories directory (_REPOS_BASE). Used internally by _save_github_token(), github_repos(), and github_status() to resolve per-user storage locations.

    Args:
        api_key (str): The API key from which to derive the user directory. Only the last 12 characters are used as the unique user identifier.

    Returns:
        Path: A Path object representing the user-specific directory under the base repositories path (_REPOS_BASE), constructed from the sanitized last 12 characters of the API key.

    Example:
        ```
        user_path = _user_dir_from_key('abc123xyz456789qwerty')  # Returns _REPOS_BASE / '789qwerty'
        ```
    """
    user_id = api_key[-12:].replace("/", "_").replace(".", "_")
    return _REPOS_BASE / user_id


def _save_github_token(api_key: str, token: str) -> None:
    """
    Saves a GitHub OAuth access token to a JSON file within the user's directory identified by the given API key.

    Creates the user directory derived from the API key if it does not already exist, loads any previously stored token data from a `.tokens.json` file in that directory, inserts or updates the `_github_oauth` key with the provided token, and writes the updated JSON back to disk. Any read errors on the existing token file are silently ignored, resulting in a fresh data object.

    Args:
        api_key (str): The API key used to identify the user and determine the target storage directory via `_user_dir_from_key`.
        token (str): The GitHub OAuth access token to be stored under the `_github_oauth` key in the user's `.tokens.json` file.

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

    Constructs a GitHub OAuth authorization URL with the client ID, repository scope, API key encoded as state, and callback redirect URI. The API key is extracted from the X-Wright-API-Key request header and base64-encoded to preserve it through the OAuth flow. Raises an HTTP 503 error if GitHub OAuth is not configured due to a missing client ID.

    Args:
        request (Request): The incoming HTTP request object containing headers with an optional X-Wright-API-Key value used as state in the OAuth flow.

    Returns:
        RedirectResponse: A redirect response pointing to GitHub's OAuth authorization URL, including client_id, scope (repo), base64-encoded state, and redirect_uri query parameters.

    Raises:
        HTTPException: Raised with status_code=503 when GitHub OAuth is not configured due to a missing _GH_CLIENT_ID environment variable.

    Example:
        ```
        response = await github_login(request)  # Redirects to https://github.com/login/oauth/authorize?client_id=...&scope=repo&state=...&redirect_uri=...
        ```
    """
    if not _GH_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")
    api_key = request.headers.get("X-Wright-API-Key", "")
    state = base64.urlsafe_b64encode(api_key.encode()).decode()
    backend_url = os.getenv("BACKEND_URL", "https://api.wrightai.live")
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
    Handles the GitHub OAuth callback by exchanging an authorization code for an access token and redirecting the user to the frontend dashboard.

    This async endpoint is invoked by GitHub after the user completes OAuth authorization. It posts the received authorization code to GitHub's token endpoint to obtain an access token, optionally decodes the base64-encoded state parameter to extract an API key for associating the token with a user account, persists the token if an API key is present via _save_github_token, and finally issues a redirect to the frontend dashboard with a 'github=connected' query parameter.

    Args:
        code (str): The short-lived authorization code returned by GitHub after the user grants OAuth permission.
        state (str): Optional base64-encoded API key passed through the OAuth flow; used to associate the resulting GitHub access token with the correct user account. Defaults to an empty string.

    Returns:
        RedirectResponse: An HTTP redirect response pointing to the frontend dashboard URL with the query parameter 'github=connected' appended.

    Raises:
        HTTPException: Raised with status 503 when GitHub OAuth is not configured (i.e., _GH_CLIENT_ID or _GH_CLIENT_SECRET are unset).
        HTTPException: Raised with status 400 when GitHub's token endpoint does not return a valid access token, including the error description from GitHub in the detail message.

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
    Fetches all GitHub repositories for the authenticated user by paginating through the GitHub API using the stored OAuth token.

    Retrieves the GitHub OAuth token from the user's local token file (identified via the X-Wright-API-Key header), then iterates through paginated GitHub API responses to collect all repositories where the user is an owner or collaborator. Each repository entry includes its full name, privacy status, and clone URL. Returns an error indicator if no valid GitHub token is found.

    Args:
        request (Request): FastAPI Request object used to extract the X-Wright-API-Key header for identifying and authenticating the current user.

    Returns:
        dict: A dictionary with a 'repos' key mapping to a list of repository objects, each containing 'full_name' (str), 'private' (bool), and 'clone_url' (str). If GitHub is not connected or no token is found, also includes an 'error' key with the message 'GitHub not connected' and an empty 'repos' list.

    Example:
        ```
        result = await github_repos(request)
        # Returns: {'repos': [{'full_name': 'octocat/Hello-World', 'private': False, 'clone_url': 'https://github.com/octocat/Hello-World.git'}]}
        # If GitHub not connected: {'repos': [], 'error': 'GitHub not connected'}
        ```

    Complexity: O(n) time where n is the total number of repositories across all pages, O(n) space to store the aggregated repository list
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
    Checks whether a GitHub OAuth connection exists for the authenticated user by inspecting their stored token file.

    Retrieves the user's API key from the X-Wright-API-Key request header, resolves the corresponding user directory via _user_dir_from_key, and reads the .tokens.json file to determine if a GitHub OAuth token is present. Returns a dictionary indicating the connection status.

    Args:
        request (Request): The incoming HTTP request object containing the X-Wright-API-Key header used to identify and authenticate the user.

    Returns:
        dict: A dictionary with a single key 'connected' whose value is True if a valid GitHub OAuth token exists in the user's token file, or False if the token file is absent, unreadable, or does not contain a GitHub OAuth token.

    Example:
        ```
        status = await github_status(request)
        # Returns: {'connected': True} if GitHub is linked, {'connected': False} otherwise
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
