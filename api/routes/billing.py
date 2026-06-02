from __future__ import annotations

import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/billing", tags=["billing"])

# ---------------------------------------------------------------------------
# Stripe helpers
# ---------------------------------------------------------------------------

def _stripe() -> None:
    """Configure Stripe with the secret key from env (called once per request)."""
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    stripe.api_key = key


def _webhook_secret() -> str:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")
    return secret


def _db():
    from api.user_store import _db as _get_db
    return _get_db()


def _get_or_create_stripe_customer(api_key: str) -> str:
    """Return existing Stripe customer ID, or create one and persist it."""
    result = _db().table("users").select("stripe_customer_id, email").eq("api_key", api_key).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")
    row = result.data[0]
    customer_id = row.get("stripe_customer_id")
    if customer_id:
        return customer_id
    customer = stripe.Customer.create(email=row["email"], metadata={"api_key": api_key})
    _db().table("users").update({"stripe_customer_id": customer.id}).eq("api_key", api_key).execute()
    return customer.id


def _get_stripe_price_id(plan_id: str, interval: str) -> str:
    """Look up the Stripe price ID from the plans table."""
    col = "stripe_price_id_annual" if interval == "annual" else "stripe_price_id_monthly"
    result = _db().table("plans").select(col).eq("id", plan_id).execute()
    if not result.data or not result.data[0].get(col):
        raise HTTPException(
            status_code=400,
            detail=f"Stripe price ID not configured for plan '{plan_id}' ({interval}). "
                   "Add stripe_price_id_monthly / stripe_price_id_annual in the Supabase plans table.",
        )
    return result.data[0][col]


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    plan: str = "pro"          # plan ID in the plans table
    interval: str = "monthly"  # 'monthly' | 'annual'


class PortalRequest(BaseModel):
    return_url: str = "https://www.wrightai.live/dashboard"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.wrightai.live")


@router.post("/checkout", dependencies=[Depends(verify_api_key)])
async def create_checkout_session(body: CheckoutRequest, request: Request) -> dict:
    """Create a Stripe Checkout session and return its URL."""
    _stripe()
    api_key = request.headers.get("X-Wright-API-Key", "")
    customer_id = _get_or_create_stripe_customer(api_key)
    price_id = _get_stripe_price_id(body.plan, body.interval)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        # Pass the API key so we can identify the user in the webhook
        client_reference_id=api_key,
        success_url=f"{FRONTEND_URL}/dashboard?upgraded=true",
        cancel_url=f"{FRONTEND_URL}/pricing?cancelled=true",
        subscription_data={
            "metadata": {"api_key": api_key, "plan": body.plan},
        },
        allow_promotion_codes=True,
    )
    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/portal", dependencies=[Depends(verify_api_key)])
async def create_billing_portal(body: PortalRequest, request: Request) -> dict:
    """Create a Stripe Customer Portal session so users can manage/cancel their plan."""
    _stripe()
    api_key = request.headers.get("X-Wright-API-Key", "")
    result = _db().table("users").select("stripe_customer_id").eq("api_key", api_key).execute()
    if not result.data or not result.data[0].get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No active subscription found")

    session = stripe.billing_portal.Session.create(
        customer=result.data[0]["stripe_customer_id"],
        return_url=body.return_url,
    )
    return {"portal_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request) -> JSONResponse:
    """
    Stripe webhook handler. Verifies signature then updates user plan in Supabase.

    Events handled:
    - checkout.session.completed   → upgrade user to paid plan
    - customer.subscription.updated → sync plan / status changes
    - customer.subscription.deleted → downgrade to free
    """
    _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, _webhook_secret())
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    event_type: str = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data)

    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data)

    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data)

    return JSONResponse({"received": True})


# ---------------------------------------------------------------------------
# Webhook event handlers
# ---------------------------------------------------------------------------

def _handle_checkout_completed(session: dict) -> None:
    api_key: str = session.get("client_reference_id", "")
    subscription_id: str = session.get("subscription", "")
    customer_id: str = session.get("customer", "")

    if not api_key or not api_key.startswith("wai_"):
        return

    # Determine the plan from subscription metadata
    plan_id = "pro"
    if subscription_id:
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            plan_id = sub.get("metadata", {}).get("plan", "pro")
            period_end = sub.get("current_period_end")
        except Exception:
            period_end = None
    else:
        period_end = None

    import datetime as dt
    period_end_iso = (
        dt.datetime.fromtimestamp(period_end, tz=dt.timezone.utc).isoformat()
        if period_end else None
    )

    _db().table("users").update({
        "plan": plan_id,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "subscription_status": "active",
        **({"current_period_end": period_end_iso} if period_end_iso else {}),
    }).eq("api_key", api_key).execute()


def _handle_subscription_updated(sub: dict) -> None:
    customer_id: str = sub.get("customer", "")
    if not customer_id:
        return

    status: str = sub.get("status", "inactive")
    plan_id = sub.get("metadata", {}).get("plan", "pro")
    period_end = sub.get("current_period_end")

    import datetime as dt
    period_end_iso = (
        dt.datetime.fromtimestamp(period_end, tz=dt.timezone.utc).isoformat()
        if period_end else None
    )

    update: dict = {
        "plan": plan_id if status == "active" else "free",
        "subscription_status": status,
        "stripe_subscription_id": sub.get("id", ""),
        **({"current_period_end": period_end_iso} if period_end_iso else {}),
    }
    _db().table("users").update(update).eq("stripe_customer_id", customer_id).execute()


def _handle_subscription_deleted(sub: dict) -> None:
    customer_id: str = sub.get("customer", "")
    if not customer_id:
        return
    _db().table("users").update({
        "plan": "free",
        "subscription_status": "cancelled",
        "stripe_subscription_id": None,
        "current_period_end": None,
    }).eq("stripe_customer_id", customer_id).execute()
