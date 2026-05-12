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
        "http://localhost:3000,https://wrightai.vercel.app,https://wright.ai,https://wrightai-web.fly.dev",
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


from api.routes import auth, chat, coverage, drift, fix_pr, generate, llms_txt, repos  # noqa: E402

app.include_router(auth.router)
app.include_router(generate.router)
app.include_router(coverage.router)
app.include_router(drift.router)
app.include_router(chat.router)
app.include_router(repos.router)
app.include_router(fix_pr.router)
app.include_router(llms_txt.router)


@app.get("/health")
async def health() -> dict:
    """
    Provides a health check endpoint that returns the API status and version information.

    This endpoint is typically used by monitoring systems, load balancers, and orchestration platforms to verify that the API service is running and responsive.

    Returns:
        dict: A dictionary containing the status ('ok') and version ('1.0.0') of the API.

    Example:
        ```
        response = await health()
        # Returns: {'status': 'ok', 'version': '1.0.0'}
        ```
    """
    return {"status": "ok", "version": "1.0.0"}


from fastapi import Depends  # noqa: E402
from api.auth import verify_api_key  # noqa: E402


@app.get("/user/me", dependencies=[Depends(verify_api_key)])
async def user_me(request: Request) -> dict:
    """
    Retrieves the authenticated user's information based on their API key from the request headers.

    This endpoint extracts the API key from the X-Wright-API-Key header, validates it against the user store, and returns the user's email, API key, and account creation timestamp. Authentication is enforced through the verify_api_key dependency.

    Args:
        request (Request): The FastAPI request object containing headers with the X-Wright-API-Key authentication token.

    Returns:
        dict: A dictionary containing the user's email, api_key, and created_at timestamp.

    Raises:
        HTTPException: When the API key is invalid or the user is not found in the user store (status_code=401).

    Example:
        ```
        # GET /user/me with header X-Wright-API-Key: abc123xyz
        # Returns: {"email": "user@example.com", "api_key": "abc123xyz", "created_at": "2024-01-01T00:00:00"}
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
    Starts the Uvicorn ASGI server to run the Wright API application.

    Initializes and runs the FastAPI application using Uvicorn with the host bound to all network interfaces (0.0.0.0) and the port configured via the WRIGHT_API_PORT environment variable (defaulting to 8765). The server runs with auto-reload disabled for production stability.

    Returns:
        None: This function does not return a value; it runs the server until interrupted.

    Raises:
        ValueError: When WRIGHT_API_PORT environment variable cannot be converted to an integer.

    Example:
        ```
        start()
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
