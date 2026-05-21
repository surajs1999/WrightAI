from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from api.auth import verify_api_key

router = APIRouter(prefix="/usage", tags=["usage"], dependencies=[Depends(verify_api_key)])


@router.get("")
async def get_usage(request: Request) -> dict:
    """
    Retrieves per-user API usage statistics by extracting the API key from the incoming request headers and delegating to get_stats.

    An async GET route handler that reads the 'X-Wright-API-Key' header from the HTTP request (defaulting to an empty string if absent) and calls get_stats to fetch and return the corresponding usage data as a dictionary.

    Args:
        request (Request): The incoming HTTP request object used to extract the 'X-Wright-API-Key' header for identifying the user whose usage statistics are being queried.

    Returns:
        dict: A dictionary containing per-user usage statistics associated with the provided API key, as returned by get_stats. For example: {'requests_made': 42, 'tokens_used': 1500}.

    Example:
        ```
        # GET /usage with header X-Wright-API-Key: abc123
        response = await client.get('/usage', headers={'X-Wright-API-Key': 'abc123'})
        stats = response.json()  # e.g., {'requests_made': 42, 'tokens_used': 1500}
        ```
    """
    from api.usage_store import get_stats

    api_key = request.headers.get("X-Wright-API-Key", "")
    return get_stats(api_key)
