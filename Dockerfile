FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY core/ core/
COPY api/ api/
COPY cli/ cli/
COPY mcp_server/ mcp_server/
COPY start.sh /start.sh

RUN pip install --no-cache-dir -e . && \
    chmod +x /start.sh

ENV WRIGHT_API_PORT=8080
ENV CHROMA_PATH=/data/chroma
ENV SQLITE_CACHE_PATH=/data/ast_cache.db
ENV WRIGHT_API_KEY=changeme

RUN mkdir -p /data

EXPOSE 8080

CMD ["/start.sh"]
