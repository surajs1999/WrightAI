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
    Loads or generates a WrightAI API key from environment variable, file, or creates a new one.

    Attempts to retrieve the API key in the following priority order: (1) from the WRIGHT_API_KEY environment variable, (2) from an existing key file, or (3) generates a new secure random key, saves it to a file with restricted permissions (0o600), and prints a notification to stderr.

    Returns:
        str: The WrightAI API key as a string.

    Example:
        ```
        api_key = _load_or_generate_key()
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
    """Validate a WorkOS access token by calling the userinfo endpoint."""
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
    Verifies API authentication credentials from either an API key or bearer token.

    Authenticates requests using one of three methods: user-issued API keys with 'wai_' prefix validated against Supabase, server-level static API keys for CLI/GitHub Actions/MCP, or WorkOS bearer tokens. Returns silently on successful authentication.

    Args:
        request (Request): The incoming HTTP request object.
        api_key (str | None): Optional API key extracted from request headers, either user-issued (wai_ prefix) or server-level static key.
        bearer (HTTPAuthorizationCredentials | None): Optional bearer token credentials extracted from Authorization header for WorkOS authentication.

    Returns:
        None: Returns nothing on successful authentication.

    Raises:
        HTTPException: When the API key with 'wai_' prefix is not found in the user store (status 401).
        HTTPException: When the WorkOS bearer token verification fails (status 401).
        HTTPException: When no valid credentials are provided or all authentication methods fail (status 401).

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
