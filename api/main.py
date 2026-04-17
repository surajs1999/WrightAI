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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_logger = logging.getLogger("wright.api")


@app.middleware("http")
async def log_requests(request: Request, call_next):
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


from api.routes import auth, chat, coverage, drift, generate

app.include_router(auth.router)
app.include_router(generate.router)
app.include_router(coverage.router)
app.include_router(drift.router)
app.include_router(chat.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}


def start() -> None:
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("WRIGHT_API_PORT", "8765")),
        reload=False,
    )


if __name__ == "__main__":
    start()
