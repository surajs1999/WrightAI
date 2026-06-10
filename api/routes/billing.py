from __future__ import annotations

import hashlib
import hmac
import json
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/billing", tags=["billing"])

_PADDLE_API_URL = os.getenv("PADDLE_API_URL", "https://api.paddle.com")
_FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.wrightai.live")


# ---------------------------------------------------------------------------
# Paddle helpers
# ---------------------------------------------------------------------------


def _headers() -> dict[str, str]:
    key = os.getenv("PADDLE_API_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="Paddle not configured")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _db():
    from api.user_store import _db as _get_db

    return _get_db()


async def _get_or_create_paddle_customer(api_key: str) -> str:
    result = (
        _db().table("users").select("paddle_customer_id, email").eq("api_key", api_key).execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")

    row = result.data[0]
    customer_id = row.get("paddle_customer_id")
    if customer_id:
        return customer_id

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_PADDLE_API_URL}/customers",
            headers=_headers(),
            json={"email": row["email"]},
            timeout=10,
        )
    if not resp.is_success:
        raise HTTPException(
            status_code=502, detail=f"Failed to create Paddle customer: {resp.text}"
        )

    customer_id = resp.json()["data"]["id"]
    _db().table("users").update({"paddle_customer_id": customer_id}).eq(
        "api_key", api_key
    ).execute()
    return customer_id


def _get_paddle_price_id(plan_id: str, interval: str) -> str:
    col = "paddle_price_id_annual" if interval == "annual" else "paddle_price_id_monthly"
    result = _db().table("plans").select(col).eq("id", plan_id).execute()
    if not result.data or not result.data[0].get(col):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Paddle price ID not configured for plan '{plan_id}' ({interval}). "
                "Add paddle_price_id_monthly / paddle_price_id_annual in the Supabase plans table."
            ),
        )
    return result.data[0][col]


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CheckoutRequest(BaseModel):
    plan: str = "pro"
    interval: str = "monthly"


class PortalRequest(BaseModel):
    return_url: str = "https://www.wrightai.live/dashboard"


class SyncTransactionRequest(BaseModel):
    transaction_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/checkout", dependencies=[Depends(verify_api_key)])
async def create_checkout_session(body: CheckoutRequest, request: Request) -> dict:
    """Create a Paddle transaction and return its ID for Paddle.js overlay checkout."""
    api_key = request.headers.get("X-Wright-API-Key", "")
    price_id = _get_paddle_price_id(body.plan, body.interval)

    # Fetch user email to pre-fill the checkout form (no customer_id — avoids
    # Paddle's customer verification flow which breaks the Paddle.js overlay)
    user_result = _db().table("users").select("email").eq("api_key", api_key).execute()
    if not user_result.data:
        raise HTTPException(status_code=401, detail="User not found")
    user_email = user_result.data[0].get("email", "")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_PADDLE_API_URL}/transactions",
            headers=_headers(),
            json={
                "items": [{"price_id": price_id, "quantity": 1}],
                "customer": {"email": user_email},
                "custom_data": {"api_key": api_key, "plan": body.plan},
            },
            timeout=15,
        )
    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f"Paddle error: {resp.text}")

    data = resp.json()["data"]
    checkout_url = (data.get("checkout") or {}).get("url", "")

    return {"checkout_url": checkout_url, "transaction_id": data["id"]}


@router.post("/sync-transaction", dependencies=[Depends(verify_api_key)])
async def sync_transaction(body: SyncTransactionRequest, request: Request) -> dict:
    """
    Fallback for the Paddle webhook: fetch the transaction directly from Paddle
    and apply the same plan upgrade. Called by the frontend right after
    checkout.completed so the account upgrades even if no webhook is configured
    or it hasn't arrived yet.
    """
    api_key = request.headers.get("X-Wright-API-Key", "")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_PADDLE_API_URL}/transactions/{body.transaction_id}",
            headers=_headers(),
            timeout=10,
        )
    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f"Paddle error: {resp.text}")

    data = resp.json()["data"]
    custom_data = data.get("custom_data") or {}
    if custom_data.get("api_key") != api_key:
        raise HTTPException(status_code=403, detail="Transaction does not belong to this account")

    if data.get("status") == "completed":
        _handle_transaction_completed(data)

    result = (
        _db().table("users").select("plan, subscription_status").eq("api_key", api_key).execute()
    )
    return result.data[0] if result.data else {"plan": "free", "subscription_status": None}


@router.post("/portal", dependencies=[Depends(verify_api_key)])
async def create_billing_portal(body: PortalRequest, request: Request) -> dict:
    """Generate a Paddle customer portal URL for subscription management."""
    api_key = request.headers.get("X-Wright-API-Key", "")
    result = _db().table("users").select("paddle_customer_id").eq("api_key", api_key).execute()

    if not result.data or not result.data[0].get("paddle_customer_id"):
        raise HTTPException(status_code=400, detail="No active subscription found")

    customer_id = result.data[0]["paddle_customer_id"]
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_PADDLE_API_URL}/customers/{customer_id}/auth-token",
            headers=_headers(),
            timeout=10,
        )
    if not resp.is_success:
        raise HTTPException(status_code=502, detail="Failed to create portal session")

    auth_code = resp.json()["data"]["customer_auth_token"]
    portal_url = (
        f"https://customer.paddle.com/?customer_auth_code={auth_code}&return={body.return_url}"
    )
    return {"portal_url": portal_url}


@router.post("/webhook")
async def paddle_webhook(request: Request) -> JSONResponse:
    """
    Paddle webhook handler. Verifies signature then updates user plan in Supabase.

    Events handled:
      transaction.completed     → upgrade user to paid plan
      subscription.updated      → sync status / plan changes
      subscription.canceled     → downgrade to free
    """
    payload = await request.body()
    signature = request.headers.get("Paddle-Signature", "")
    secret = os.getenv("PADDLE_WEBHOOK_SECRET", "")

    if secret and signature:
        parts = {}
        for part in signature.split(";"):
            if "=" in part:
                k, v = part.split("=", 1)
                parts[k] = v
        ts = parts.get("ts", "")
        h1 = parts.get("h1", "")
        signed_payload = f"{ts}:{payload.decode()}"
        expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, h1):
            raise HTTPException(status_code=400, detail="Invalid Paddle signature")

    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("event_type", "")
    data = event.get("data", {})

    if event_type == "transaction.completed":
        _handle_transaction_completed(data)
    elif event_type == "subscription.updated":
        _handle_subscription_updated(data)
    elif event_type == "subscription.canceled":
        _handle_subscription_canceled(data)

    return JSONResponse({"received": True})


# ---------------------------------------------------------------------------
# Webhook event handlers
# ---------------------------------------------------------------------------


def _handle_transaction_completed(data: dict) -> None:
    custom_data = data.get("custom_data") or {}
    api_key = custom_data.get("api_key", "")
    plan_id = custom_data.get("plan", "pro")
    subscription_id = data.get("subscription_id", "")
    customer_id = data.get("customer_id", "")

    if not api_key or not api_key.startswith("wai_"):
        return

    _db().table("users").update(
        {
            "plan": plan_id,
            "paddle_customer_id": customer_id,
            "paddle_subscription_id": subscription_id,
            "subscription_status": "active",
        }
    ).eq("api_key", api_key).execute()


def _handle_subscription_updated(data: dict) -> None:
    customer_id = data.get("customer_id", "")
    if not customer_id:
        return

    status = data.get("status", "inactive")
    custom_data = data.get("custom_data") or {}
    plan_id = custom_data.get("plan", "pro")
    next_billed = data.get("next_billed_at")

    _db().table("users").update(
        {
            "plan": plan_id if status == "active" else "free",
            "subscription_status": status,
            "paddle_subscription_id": data.get("id", ""),
            **({"current_period_end": next_billed} if next_billed else {}),
        }
    ).eq("paddle_customer_id", customer_id).execute()


def _handle_subscription_canceled(data: dict) -> None:
    customer_id = data.get("customer_id", "")
    if not customer_id:
        return

    _db().table("users").update(
        {
            "plan": "free",
            "subscription_status": "cancelled",
            "paddle_subscription_id": None,
            "current_period_end": None,
        }
    ).eq("paddle_customer_id", customer_id).execute()
