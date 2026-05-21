from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path

import httpx
from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

_API_KEY_HEADER = APIKeyHeader(name="X-Wright-API-Key", auto_error=False)
_BEARER = HTTPBearer(auto_error=False)
_KEY_FILE = Path(os.getenv("WRIGHT_KEY_FILE", Path.home() / ".wright" / "api.key"))

WORKOS_CLIENT_ID = os.getenv("WORKOS_CLIENT_ID", "")
WORKOS_API_KEY = os.getenv("WORKOS_API_KEY", "")


def _load_or_generate_key() -> str:
    """
    Loads or generates a WrightAI API key by checking the environment variable, an existing key file, or creating a new cryptographically secure random key.

    Attempts to retrieve the API key in the following priority order: (1) from the WRIGHT_API_KEY environment variable, (2) from an existing key file at the path defined by _KEY_FILE, or (3) generates a new cryptographically secure random key using secrets.token_urlsafe(32), saves it to the key file with restricted permissions (0o600), creates parent directories with mode 0o700 if needed, and prints a notification message to stderr on first run.

    Returns:
        str: The WrightAI API key as a URL-safe string, sourced from the WRIGHT_API_KEY environment variable, an existing key file, or a newly generated secure random token.

    Example:
        ```
        api_key = _load_or_generate_key()
        print(api_key)  # e.g., 'aB3dEfGhIjKlMnOpQrStUvWxYz0123456789-_Ab'
        ```
    """
    env_key = os.getenv("WRIGHT_API_KEY", "")
    if env_key:
        return env_key
    if _KEY_FILE.exists():
        return _KEY_FILE.read_text().strip()
    _KEY_FILE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    key = secrets.token_urlsafe(32)
    _KEY_FILE.write_text(key)
    _KEY_FILE.chmod(0o600)
    print(
        f"\n WrightAI API key generated (first run).\n"
        f"  Saved to: {_KEY_FILE}\n"
        f"  Read it with: cat {_KEY_FILE}\n",
        file=sys.stderr,
    )
    return key


_WRIGHT_API_KEY = _load_or_generate_key()


def _verify_workos_token(token: str) -> dict:
    """
    Validates a WorkOS access token by calling the WorkOS JWKS userinfo endpoint and returning the parsed JSON response.

    Sends a synchronous GET request to the WorkOS user management JWKS endpoint with the provided Bearer token. If the endpoint returns a non-200 status code, an HTTP 401 exception is raised indicating an invalid token. On success, the decoded JSON payload (typically containing user identity claims) is returned as a dictionary. This function is called internally by verify_api_key() and is not intended for direct external use.

    Args:
        token (str): The WorkOS access token to validate, passed as a Bearer token in the Authorization header.

    Returns:
        dict: A dictionary containing the parsed JSON response from the WorkOS JWKS userinfo endpoint, typically including user identity and claims data.

    Raises:
        HTTPException: Raised with HTTP status code 401 and detail 'Invalid WorkOS token' when the WorkOS endpoint returns a non-200 status code.

    Example:
        ```
        user_info = _verify_workos_token('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...')
        print(user_info['sub'])  # prints the user's subject identifier
        ```
    """
    resp = httpx.get(
        "https://api.workos.com/user_management/jwks/client_01KPEHF4MX8EVWZ2Z3C7JGETRB",
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid WorkOS token")
    return resp.json()


async def verify_api_key(
    request: Request,
    api_key: str | None = Security(_API_KEY_HEADER),
    bearer: HTTPAuthorizationCredentials | None = Security(_BEARER),
) -> None:
    """
    Verifies incoming API authentication credentials against user-issued API keys, a server-level static key, or WorkOS bearer tokens, raising HTTP 401 on any failure.

    Authenticates requests via one of three ordered methods: (1) user-issued API keys prefixed with 'wai_' are looked up in the Supabase user store via get_user_by_api_key(); (2) a server-level static key is accepted directly for CLI, GitHub Actions, or MCP integrations; (3) a WorkOS bearer token is verified by calling _verify_workos_token(). The function returns silently on the first successful match. If no method succeeds or no credentials are supplied at all, an HTTP 401 exception is raised.

    Args:
        request (Request): The incoming FastAPI/Starlette HTTP request object, injected by the dependency injection system.
        api_key (str | None): Optional API key extracted from the request headers. Accepts either a user-issued key (prefixed with 'wai_') validated against Supabase, or a server-level static key for CLI/GitHub Actions/MCP.
        bearer (HTTPAuthorizationCredentials | None): Optional bearer token credentials extracted from the Authorization header, used for WorkOS token authentication.

    Returns:
        None: Returns None implicitly on successful authentication; no value is produced.

    Raises:
        HTTPException: Raised with status 401 when an API key with the 'wai_' prefix is not found in the Supabase user store.
        HTTPException: Raised with status 401 when WorkOS bearer token verification fails via _verify_workos_token().
        HTTPException: Raised with status 401 when no valid credentials are provided or all authentication methods fail.

    Example:
        ```
        await verify_api_key(request, api_key='wai_abc123def456', bearer=None)
        ```
    """
    # Accept user API keys issued via WorkOS + Supabase (wai_ prefix)
    if api_key and api_key.startswith("wai_"):
        from api.user_store import get_user_by_api_key

        if get_user_by_api_key(api_key):
            return
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Accept server-level static key (CLI / GitHub Action / MCP)
    if api_key and api_key == _WRIGHT_API_KEY:
        return

    # Accept WorkOS Bearer token directly
    if bearer and bearer.credentials:
        try:
            _verify_workos_token(bearer.credentials)
            return
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid WorkOS token")

    raise HTTPException(status_code=401, detail="Invalid or missing credentials")
