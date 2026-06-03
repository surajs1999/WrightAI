# WrightAI — AI-powered code documentation tool
# Copyright (C) 2026 Suraj Sahoo
# SPDX-License-Identifier: AGPL-3.0-or-later
# https://github.com/surajs1999/WrightAI
from __future__ import annotations

import logging
import os
import time

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

load_dotenv()

app = FastAPI(
    title="Wright API",
    version="1.0.0",
    description="AI-powered code documentation API",
)

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://www.wrightai.live,https://wrightai.live,https://wrightai-web.netlify.app",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_logger = logging.getLogger("wright.api")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Logs HTTP request details including method, path, status code, and processing duration.

    FastAPI middleware that intercepts HTTP requests, measures the time taken to process them, and logs the request method, URL path, response status code, and duration in milliseconds.

    Args:
        request (Request): The incoming HTTP request object containing request metadata and information.
        call_next (Callable): Middleware chain callable that processes the request and returns the response.

    Returns:
        Response: The HTTP response object returned from the next middleware or route handler.

    Example:
        ```
        @app.middleware("http")
        async def log_requests(request: Request, call_next):
            return await log_requests(request, call_next)
        ```

    Complexity: O(1) time, O(1) space
    """
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    _logger.info(
        "%s %s %d %.1fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


from api.routes import (  # noqa: E402
    auth,
    billing,
    chat,
    coverage,
    drift,
    fix_pr,
    generate,
    llms_txt,
    repos,
    usage,
    webhooks,
)

app.include_router(auth.router)
app.include_router(billing.router)
app.include_router(generate.router)
app.include_router(coverage.router)
app.include_router(drift.router)
app.include_router(chat.router)
app.include_router(repos.router)
app.include_router(fix_pr.router)
app.include_router(llms_txt.router)
app.include_router(usage.router)
app.include_router(webhooks.router)


@app.get("/health")
async def health() -> dict:
    """
    Returns the health status and version information of the API as a dictionary.

    An asynchronous GET endpoint registered at '/health' that is polled by monitoring systems, load balancers, and orchestration platforms to verify the API service is running and responsive. Always returns a fixed payload indicating a healthy status and the current API version.

    Returns:
        dict: A dictionary with two keys: 'status' set to 'ok' indicating the service is healthy, and 'version' set to '1.0.0' indicating the current API version.

    Example:
        ```
        import httpx
        response = httpx.get('http://localhost:8000/health')
        print(response.json())  # {'status': 'ok', 'version': '1.0.0'}
        ```
    """
    return {"status": "ok", "version": "1.0.0"}


from fastapi import Depends  # noqa: E402
from api.auth import verify_api_key  # noqa: E402


@app.post("/user/key/rotate", dependencies=[Depends(verify_api_key)])
async def rotate_key(request: Request) -> dict:
    """
    Rotates the API key for the authenticated user by invalidating the old key and generating a new one.

    This FastAPI POST endpoint reads the current API key from the 'X-Wright-API-Key' request header, delegates key rotation to the user store, and returns the newly generated API key. Access is protected by the 'verify_api_key' dependency. If no user is associated with the provided key, a 404 HTTP exception is raised.

    Args:
        request (Request): The incoming FastAPI HTTP request object, used to extract the current API key from the 'X-Wright-API-Key' header.

    Returns:
        dict: A dictionary containing the newly generated API key under the key 'api_key', e.g., {'api_key': 'new-generated-key-string'}.

    Raises:
        HTTPException: Raised with status code 404 and detail 'User not found' when no user is associated with the provided API key.

    Example:
        ```
        # Using httpx or requests in an async context:
        import httpx

        response = httpx.post(
            'http://localhost:8000/user/key/rotate',
            headers={'X-Wright-API-Key': 'existing-api-key-abc123'}
        )
        new_key = response.json()  # {'api_key': 'newly-rotated-key-xyz789'}
        ```
    """
    from api.user_store import rotate_api_key
    from fastapi import HTTPException

    old_key = request.headers.get("X-Wright-API-Key", "")
    user = rotate_api_key(old_key)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"api_key": user.api_key}


@app.get("/user/me", dependencies=[Depends(verify_api_key)])
async def user_me(request: Request) -> dict:
    """
    Retrieves the authenticated user's profile information by looking up the API key from the request headers.

    An async FastAPI endpoint protected by the verify_api_key dependency. It extracts the X-Wright-API-Key header from the incoming request, resolves the corresponding user via the user store, and returns the user's email, API key, and account creation timestamp. Raises a 401 Unauthorized exception if the key is absent or unrecognized.

    Args:
        request (Request): The FastAPI Request object used to access HTTP headers, specifically the X-Wright-API-Key header for user lookup.

    Returns:
        dict: A dictionary containing three keys: 'email' (str) — the user's email address, 'api_key' (str) — the user's API key, and 'created_at' (str or datetime) — the ISO 8601 timestamp of account creation.

    Raises:
        HTTPException: Raised with status_code=401 when the X-Wright-API-Key header is missing, empty, or does not correspond to any user in the user store.

    Example:
        ```
        # GET /user/me with Header: X-Wright-API-Key: abc123xyz
        # Response:
        # {
        #   "email": "user@example.com",
        #   "api_key": "abc123xyz",
        #   "created_at": "2024-01-01T00:00:00"
        # }
        ```
    """
    from api.user_store import get_user_by_api_key

    api_key = request.headers.get("X-Wright-API-Key", "")
    user = get_user_by_api_key(api_key)
    if not user:
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Invalid API key")
    return {
        "email": user.email,
        "api_key": user.api_key,
        "created_at": user.created_at,
    }


def start() -> None:
    """
    Starts the Uvicorn ASGI server to run the Wright API application on the configured host and port.

    Initializes and runs the FastAPI application using Uvicorn with the host bound to all network interfaces (0.0.0.0) and the port configured via the WRIGHT_API_PORT environment variable (defaulting to 8765). Auto-reload is disabled for production stability. This function blocks until the server is interrupted.

    Returns:
        None: Does not return a value; runs the server until interrupted.

    Raises:
        ValueError: When the WRIGHT_API_PORT environment variable is set to a non-integer value that cannot be converted via int().

    Example:
        ```
        import os
        os.environ['WRIGHT_API_PORT'] = '8765'
        start()  # Starts the Wright API server on http://0.0.0.0:8765
        ```
    """
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("WRIGHT_API_PORT", "8765")),
        reload=False,
    )


if __name__ == "__main__":
    start()
