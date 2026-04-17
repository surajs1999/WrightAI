.PHONY: install test lint build-extension start-api start-mcp start-worker

install:
	pip install -e ".[dev]"

test:
	pytest tests/ -v

lint:
	ruff check . --fix
	ruff format .

build-extension:
	cd vscode-extension && npm install && npm run build

start-api:
	wright-api

start-mcp:
	wright-mcp

start-worker:
	celery -A api.tasks.celery_app worker --loglevel=info
