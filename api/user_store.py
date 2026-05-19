from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone

from supabase import Client, create_client

_client: Client | None = None


def _db() -> Client:
    """
    Returns a singleton Supabase client instance, initializing it lazily from environment variables if not already created.

    This function implements a lazy initialization pattern for the Supabase database client. It checks if the global _client variable is None, and if so, retrieves the Supabase URL and service key from environment variables, validates them, and creates a new client instance. Subsequent calls return the cached client instance.

    Returns:
        Client: The Supabase client instance for database operations.

    Raises:
        RuntimeError: When SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables are not set or are empty.

    Example:
        ```
        client = _db()
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
    Retrieves an existing user by WorkOS user ID or creates a new user with a generated API key if not found.

    Queries the users table for a user matching the provided WorkOS user ID. If found, returns the existing user. If not found, creates a new user record with the provided WorkOS user ID, email, and a newly generated API key prefixed with 'wai_', then returns the newly created user.

    Args:
        workos_user_id (str): The unique WorkOS identifier for the user to retrieve or create.
        email (str): The email address to associate with the user if creating a new record.

    Returns:
        User: The User object representing either the existing or newly created user record.

    Example:
        ```
        user = get_or_create_user('workos_user_123', 'user@example.com')
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
    return User(**{k: row[k] for k in User.__dataclass_fields__})


def rotate_api_key(old_api_key: str) -> User | None:
    """Generate a new API key for the user with the given key and return the updated user."""
    db = _db()
    result = db.table("users").select("*").eq("api_key", old_api_key).execute()
    if not result.data:
        return None
    new_key = f"wai_{secrets.token_urlsafe(32)}"
    updated = db.table("users").update({"api_key": new_key}).eq("api_key", old_api_key).execute()
    if not updated.data:
        return None
    row = updated.data[0]
    return User(**{k: row[k] for k in User.__dataclass_fields__})


def get_user_by_api_key(api_key: str) -> User | None:
    """
    Retrieves a user from the database by their API key and updates their last used timestamp.

    Queries the users table for a matching API key, updates the last_used_at timestamp to the current UTC time if found, and returns the corresponding User object. Returns None if no user is found with the given API key.

    Args:
        api_key (str): The API key to search for in the users table.

    Returns:
        User | None: A User object if a matching API key is found, None otherwise.

    Example:
        ```
        user = get_user_by_api_key("sk_1234567890abcdef")
        ```
    """
    db = _db()
    result = db.table("users").select("*").eq("api_key", api_key).execute()
    if not result.data:
        return None
    row = result.data[0]
    db.table("users").update({"last_used_at": datetime.now(timezone.utc).isoformat()}).eq(
        "api_key", api_key
    ).execute()
    return User(**{k: row[k] for k in User.__dataclass_fields__})
