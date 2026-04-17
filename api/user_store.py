from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone

from supabase import Client, create_client

_client: Client | None = None


def _db() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _client = create_client(url, key)
    return _client


@dataclass
class User:
    id: str
    workos_user_id: str
    email: str
    api_key: str
    created_at: str


def get_or_create_user(workos_user_id: str, email: str) -> User:
    db = _db()
    result = db.table("users").select("*").eq("workos_user_id", workos_user_id).execute()

    if result.data:
        row = result.data[0]
        return User(**{k: row[k] for k in User.__dataclass_fields__})

    api_key = f"wai_{secrets.token_urlsafe(32)}"
    insert = db.table("users").insert({
        "workos_user_id": workos_user_id,
        "email": email,
        "api_key": api_key,
    }).execute()

    row = insert.data[0]
    return User(**{k: row[k] for k in User.__dataclass_fields__})


def get_user_by_api_key(api_key: str) -> User | None:
    db = _db()
    result = db.table("users").select("*").eq("api_key", api_key).execute()
    if not result.data:
        return None
    row = result.data[0]
    db.table("users").update({
        "last_used_at": datetime.now(timezone.utc).isoformat()
    }).eq("api_key", api_key).execute()
    return User(**{k: row[k] for k in User.__dataclass_fields__})
