from __future__ import annotations

import os
import secrets
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from supabase import Client, create_client

_client: Client | None = None

# ---------------------------------------------------------------------------
# In-process user cache — eliminates one SELECT + one UPDATE per request
# ---------------------------------------------------------------------------
_user_cache: dict[str, tuple["User | None", float]] = {}
_user_cache_lock = threading.Lock()
_USER_CACHE_TTL = 300.0  # 5 minutes


def _db() -> Client:
    """
    Returns a singleton Supabase client instance, lazily initializing it from environment variables on the first call.

    Implements a lazy initialization pattern for the Supabase database client. On the first invocation, retrieves SUPABASE_URL and SUPABASE_SERVICE_KEY from environment variables, validates they are non-empty, and creates a new client instance stored in the module-level _client variable. All subsequent calls return the already-cached client without re-initialization, ensuring only one client instance exists throughout the application lifecycle.

    Returns:
        Client: The singleton Supabase Client instance used for all database operations.

    Raises:
        RuntimeError: When SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables are not set or are empty strings.

    Example:
        ```
        client = _db()
        result = client.table('users').select('*').execute()
        ```
    """
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
    """
    Retrieves an existing user by WorkOS user ID from the database, or creates and returns a new user record with a generated API key if none exists.

    Queries the 'users' table for a record matching the given WorkOS user ID. If a matching record is found, it is deserialized into a User dataclass and returned immediately. If no match is found, a new user record is inserted with the provided WorkOS user ID, email address, and a securely generated URL-safe API key prefixed with 'wai_'. This function is called during the authentication callback flow via callback() to ensure every authenticated WorkOS user has a corresponding application user record.

    Args:
        workos_user_id (str): The unique WorkOS identifier for the user to retrieve or create. Used as the primary lookup key in the 'users' table.
        email (str): The email address to associate with the user record if a new user needs to be created. Ignored if the user already exists.

    Returns:
        User: A User dataclass instance representing either the existing user record found in the database or the newly inserted user record, including the assigned API key (e.g., 'wai_<url-safe-token>').

    Example:
        ```
        user = get_or_create_user('user_01ABC123XYZ', 'jane.doe@example.com')
        print(user.api_key)  # e.g., 'wai_dGhpcyBpcyBhIHRlc3Qgc3RyaW5n...'
        ```
    """
    db = _db()
    result = db.table("users").select("*").eq("workos_user_id", workos_user_id).execute()

    if result.data:
        row = result.data[0]
        return User(**{k: row[k] for k in User.__dataclass_fields__})

    api_key = f"wai_{secrets.token_urlsafe(32)}"
    insert = (
        db.table("users")
        .insert(
            {
                "workos_user_id": workos_user_id,
                "email": email,
                "api_key": api_key,
            }
        )
        .execute()
    )

    row = insert.data[0]
    user = User(**{k: row[k] for k in User.__dataclass_fields__})

    # Send welcome email asynchronously — never block sign-up
    try:
        from api.tasks.email_tasks import send_welcome

        send_welcome(email)
    except Exception:
        pass

    return user


def rotate_api_key(old_api_key: str) -> User | None:
    """
    Rotates a user's API key by replacing the old key with a newly generated one and returning the updated User object.

    Looks up a user in the 'users' table by their existing API key. If found, generates a new URL-safe token prefixed with 'wai_' using the secrets module, updates the api_key column in the database, and returns a User dataclass instance populated from the updated row. Returns None if no user matches the provided old key or if the update operation fails. Called by the rotate_key endpoint in main.py.

    Args:
        old_api_key (str): The existing API key string to look up and replace in the users table (e.g., a token prefixed with 'wai_').

    Returns:
        User | None: A User dataclass instance populated with all fields from the updated database row after the key rotation, or None if no user with the given old API key exists or if the update fails.

    Example:
        ```
        updated_user = rotate_api_key("wai_oldtoken1234567890abcdef")
        if updated_user:
            print(f"New API key assigned to {updated_user.email}")
        else:
            print("Key rotation failed: old key not found")
        ```
    """
    db = _db()
    result = db.table("users").select("*").eq("api_key", old_api_key).execute()
    if not result.data:
        return None
    new_key = f"wai_{secrets.token_urlsafe(32)}"
    updated = db.table("users").update({"api_key": new_key}).eq("api_key", old_api_key).execute()
    if not updated.data:
        return None
    with _user_cache_lock:
        _user_cache.pop(old_api_key, None)
    row = updated.data[0]
    return User(**{k: row[k] for k in User.__dataclass_fields__})


def get_user_by_api_key(api_key: str) -> User | None:
    """Return cached user for api_key, falling back to Supabase on miss or TTL expiry."""
    now = time.monotonic()
    with _user_cache_lock:
        if api_key in _user_cache:
            user, ts = _user_cache[api_key]
            if now - ts < _USER_CACHE_TTL:
                return user

    db = _db()
    result = db.table("users").select("*").eq("api_key", api_key).execute()
    user = None
    if result.data:
        row = result.data[0]
        user = User(**{k: row[k] for k in User.__dataclass_fields__})
        # last_used_at is analytics-only — fire-and-forget so it never blocks auth
        threading.Thread(target=_touch_last_used, args=(api_key,), daemon=True).start()

    with _user_cache_lock:
        _user_cache[api_key] = (user, now)
    return user


def _touch_last_used(api_key: str) -> None:
    try:
        _db().table("users").update({"last_used_at": datetime.now(timezone.utc).isoformat()}).eq(
            "api_key", api_key
        ).execute()
    except Exception:
        pass


def invalidate_user_cache(api_key: str) -> None:
    """Drop cached entry after key rotation so the new key takes effect immediately."""
    with _user_cache_lock:
        _user_cache.pop(api_key, None)
