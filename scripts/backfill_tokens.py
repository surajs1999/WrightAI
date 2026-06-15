#!/usr/bin/env python3
"""One-off backfill: copy .tokens.json files from the GCS repos backup into
the new Supabase `tokens` table (see SUPABASE_MIGRATION_TOKENS.sql).

For each gs://<bucket>/repos/<user_id>/.tokens.json, every {key: token} entry
(_github_oauth or a repo slug) is upserted via api.token_store.save_token.

Usage:
    python3 scripts/backfill_tokens.py [--bucket wrightai-data] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from api.token_store import save_token  # noqa: E402


def gsutil(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["gsutil", *args], capture_output=True, text=True)


def list_user_dirs(bucket: str) -> list[str]:
    result = gsutil("ls", f"gs://{bucket}/repos/")
    if result.returncode != 0:
        print(f"gsutil ls failed: {result.stderr}", file=sys.stderr)
        return []
    user_ids = []
    for line in result.stdout.splitlines():
        line = line.strip().rstrip("/")
        if line.startswith(f"gs://{bucket}/repos/"):
            user_ids.append(line.removeprefix(f"gs://{bucket}/repos/"))
    return user_ids


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", default="wrightai-data")
    parser.add_argument(
        "--dry-run", action="store_true", help="print what would be migrated without writing"
    )
    args = parser.parse_args()

    user_ids = list_user_dirs(args.bucket)
    print(f"Found {len(user_ids)} user dir(s): {user_ids}")

    total_tokens = 0
    for user_id in user_ids:
        path = f"gs://{args.bucket}/repos/{user_id}/.tokens.json"
        result = gsutil("cat", path)
        if result.returncode != 0:
            print(f"  {user_id}: no .tokens.json — skipping")
            continue

        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"  {user_id}: failed to parse .tokens.json: {e}", file=sys.stderr)
            continue

        for key, token in data.items():
            if not isinstance(token, str) or not token:
                continue
            print(f"  {user_id}: {key}")
            if not args.dry_run:
                save_token(user_id, key, token)
            total_tokens += 1

    action = "Would migrate" if args.dry_run else "Migrated"
    print(f"\n{action} {total_tokens} token(s) across {len(user_ids)} user(s).")


if __name__ == "__main__":
    main()
