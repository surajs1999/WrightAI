from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path

from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader

_API_KEY_HEADER = APIKeyHeader(name="X-Wright-API-Key", auto_error=False)
_KEY_FILE = Path(os.getenv("WRIGHT_KEY_FILE", Path.home() / ".wright" / "api.key"))


def _load_or_generate_key() -> str:
    env_key = os.getenv("WRIGHT_API_KEY", "")
    if env_key:
        return env_key

    if _KEY_FILE.exists():
        return _KEY_FILE.read_text().strip()

    # First run — generate a secure random key and persist it
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


async def verify_api_key(
    request: Request,
    api_key: str | None = Security(_API_KEY_HEADER),
) -> None:
    if api_key != _WRIGHT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
