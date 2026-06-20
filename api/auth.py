from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path

import httpx
from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

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


_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    """Fetch and cache the WorkOS JWKS public key set."""
    global _jwks_cache
    if _jwks_cache is None:
        client_id = os.getenv("WORKOS_CLIENT_ID", "")
        resp = httpx.get(
            f"https://api.workos.com/user_management/jwks/{client_id}",
            timeout=5,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=503, detail="Could not fetch WorkOS JWKS")
        _jwks_cache = resp.json()
    return _jwks_cache


def _verify_workos_token(token: str) -> dict:
    """
    Validates a WorkOS JWT access token by fetching the JWKS public keys and verifying the signature.

    Fetches the WorkOS JWKS (JSON Web Key Set) for the configured client ID, then decodes and
    verifies the provided JWT against those public keys. Raises HTTP 401 if the token is invalid,
    expired, or the signature doesn't match.

    Args:
        token (str): The WorkOS JWT access token to validate.

    Returns:
        dict: The decoded JWT payload containing user identity claims.

    Raises:
        HTTPException: Raised with HTTP status code 401 when the token is invalid or expired.
        HTTPException: Raised with HTTP status code 503 when the JWKS endpoint is unreachable.
    """
    try:
        jwks = _get_jwks()
        # Extract the key ID from the JWT header to pick the right key from the set
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        key = next(
            (k for k in jwks.get("keys", []) if k.get("kid") == kid),
            jwks.get("keys", [None])[0] if jwks.get("keys") else None,
        )
        if key is None:
            raise HTTPException(status_code=401, detail="Invalid WorkOS token: no matching key")
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=os.getenv("WORKOS_CLIENT_ID", ""),
        )
        return claims
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid WorkOS token: {exc}") from exc


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
