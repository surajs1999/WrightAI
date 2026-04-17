from __future__ import annotations

import os

from workos import WorkOSClient
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

_workos_client: WorkOSClient | None = None


def _get_workos() -> WorkOSClient:
    global _workos_client
    if _workos_client is None:
        api_key = os.getenv("WORKOS_API_KEY", "")
        client_id = os.getenv("WORKOS_CLIENT_ID", "")
        if not api_key or not client_id:
            raise HTTPException(status_code=503, detail="WorkOS not configured")
        _workos_client = WorkOSClient(api_key=api_key, client_id=client_id)
    return _workos_client

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://wrightai-api.fly.dev")


@router.get("/login")
async def login(provider: str = "GoogleOAuth") -> RedirectResponse:
    url = _get_workos().user_management.get_authorization_url(
        provider=provider,
        redirect_uri=f"{FRONTEND_URL}/auth/callback",
    )
    return RedirectResponse(url)


class CallbackRequest(BaseModel):
    code: str


@router.post("/callback")
async def callback(body: CallbackRequest) -> dict:
    try:
        auth = _get_workos().user_management.authenticate_with_code(
            code=body.code,
            session={"seal_session": False},
        )
        return {
            "access_token": auth.access_token,
            "user": {
                "id": auth.user.id,
                "email": auth.user.email,
                "first_name": auth.user.first_name,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/callback")
async def callback_get(code: str) -> dict:
    return await callback(CallbackRequest(code=code))
