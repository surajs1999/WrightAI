from __future__ import annotations

import os

from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader

_API_KEY_HEADER = APIKeyHeader(name="X-Wright-API-Key", auto_error=False)
_WRIGHT_API_KEY = os.getenv("WRIGHT_API_KEY", "")


async def verify_api_key(
    request: Request,
    api_key: str | None = Security(_API_KEY_HEADER),
) -> None:
    if not _WRIGHT_API_KEY:
        return
    if api_key != _WRIGHT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
