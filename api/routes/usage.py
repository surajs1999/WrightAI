from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from api.auth import verify_api_key

router = APIRouter(prefix="/usage", tags=["usage"], dependencies=[Depends(verify_api_key)])


@router.get("")
async def get_usage(request: Request) -> dict:
    """Return per-user usage stats."""
    from api.usage_store import get_stats

    api_key = request.headers.get("X-Wright-API-Key", "")
    return get_stats(api_key)
