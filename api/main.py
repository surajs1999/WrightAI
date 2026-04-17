from __future__ import annotations

import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

from api.routes import chat, coverage, drift, generate

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
