from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _rate_limit_key(request: Request) -> str:
    """Use the API key as the rate limit bucket for wai_ keys, IP otherwise.

    This means each user gets their own independent limit regardless of shared
    IPs (office NAT, VPN), and anonymous/CLI callers are bucketed by IP.
    """
    api_key = request.headers.get("X-Wright-API-Key", "")
    if api_key.startswith("wai_"):
        return api_key
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)
