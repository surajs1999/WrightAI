.PHONY: install test lint audit build-extension start-api start-mcp start-worker

install:
	pip install -e ".[dev]"
	pip install pip-audit

test:
	pytest tests/ -v

lint:
	ruff check . --fix
	ruff format .

audit:
	pip-audit --skip-editable

build-extension:
	cd vscode-extension && npm install && npm run build

start-api:
	wright-api

start-mcp:
	wright-mcp

start-worker:
	celery -A api.tasks.celery_app worker --loglevel=info
