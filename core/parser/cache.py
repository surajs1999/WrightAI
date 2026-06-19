from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime, timezone

from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction, ParsedClass

# ── LLM result cache (L2) ─────────────────────────────────────────────────────
# Keyed by content hash — no user identity, shared globally across all callers.
# Backed by Supabase (drift_llm_cache). Falls back silently to SQLite-only (L1)
# if SUPABASE_URL/SUPABASE_SERVICE_KEY are unset or the request fails.

_L2_TTL_DAYS = int(os.getenv("WRIGHT_CACHE_TTL_DAYS", "30"))


def _db():
    from api.user_store import _db as _get_db

    return _get_db()


def _parse_iso(ts: str) -> float:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()


def prefetch_function_results(
    pairs: list[tuple[str, str]],
) -> dict[tuple[str, str], tuple[str, str | None]]:
    """Batch-load L2 (Supabase) verdicts for (src_hash, doc_hash) pairs in ONE
    query. Also loads doc-hash-only drifted verdicts so drift persists even
    when the source changes. Returns a dict to pass into get_function_result().
    Stateless — safe to call concurrently from multiple requests."""
    if not pairs:
        return {}
    src_hashes = list({h for h, _ in pairs})
    doc_hashes = list({h for _, h in pairs})
    try:
        # Fetch by src_hash (exact match) AND by doc_hash (drift persistence)
        result = (
            _db()
            .table("drift_llm_cache")
            .select("src_hash, doc_hash, status, reason, updated_at")
            .in_("doc_hash", doc_hashes)
            .execute()
        )
    except Exception:
        return {}
    cutoff = time.time() - _L2_TTL_DAYS * 86400
    wanted_exact = set(pairs)
    wanted_src = set(src_hashes)
    out: dict[tuple[str, str], tuple[str, str | None]] = {}
    for row in result.data or []:
        updated_at = row.get("updated_at")
        if updated_at and _parse_iso(updated_at) < cutoff:
            continue  # stale — treat as miss
        key = (row["src_hash"], row["doc_hash"])
        # Exact match: populate for any src_hash in our set
        if row["src_hash"] in wanted_src and key in wanted_exact:
            out[key] = (row["status"], row.get("reason"))
    return out


def flush_function_results(rows: list[dict]) -> None:
    """Batch-upsert newly-computed L2 verdicts in ONE query. `rows` is the
    list built up by set_function_result(l2_pending=...) calls. No-op on an
    empty list or Supabase error."""
    if not rows:
        return
    try:
        _db().table("drift_llm_cache").upsert(rows, on_conflict="src_hash,doc_hash").execute()
    except Exception:
        pass


# ── AST baseline cache (per-file structural snapshot) ─────────────────────────
# Keyed by (user_id, repo_name, file_path) — Backed by Supabase (ast_baseline).
# Lets ASTCache.get_baseline() survive Cloud Run cold starts: read-through on
# local SQLite miss, write-through when the baseline advances.


def prefetch_baselines(user_id: str, repo_name: str) -> dict[str, str]:
    """Batch-load all stored AST baselines for (user_id, repo_name) in ONE
    query. Returns {relative_file_path: parsed_json}."""
    try:
        result = (
            _db()
            .table("ast_baseline")
            .select("file_path, parsed_json")
            .eq("user_id", user_id)
            .eq("repo_name", repo_name)
            .execute()
        )
    except Exception:
        return {}
    return {row["file_path"]: row["parsed_json"] for row in (result.data or [])}


def flush_baselines(rows: list[dict]) -> None:
    """Batch-upsert AST baseline snapshots in ONE query. `rows` is the list
    built up by ASTCache.set(remote_pending=...) calls. No-op on an empty
    list or Supabase error."""
    if not rows:
        return
    try:
        _db().table("ast_baseline").upsert(
            rows, on_conflict="user_id,repo_name,file_path"
        ).execute()
    except Exception:
        pass


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _serialize_parsed_file(pf: ParsedFile) -> str:
    """
    Serializes a ParsedFile object and all its nested structures into a JSON-formatted string.

    Converts a ParsedFile object into a dictionary representation by recursively extracting attributes from all nested ParsedFunction and ParsedClass objects, then serializes the resulting dictionary to a JSON string. The output includes a schema_version marker, the file path, language, functions, classes, imports, and last modified timestamp.

    Args:
        pf (ParsedFile): The parsed file object containing functions, classes, imports, and metadata to be serialized.

    Returns:
        str: A JSON-formatted string containing the serialized representation of the ParsedFile, including its schema_version, path, language, functions, classes, imports, and last modified timestamp.

    Example:
        ```
        json_str = _serialize_parsed_file(parsed_file)
        # json_str => '{"schema_version": 2, "path": "app.py", "language": "python", "functions": [], "classes": [], "imports": [], "last_modified": 1700000000.0}'
        ```

    Complexity: O(n) time where n is the total number of functions and methods across all classes, O(n) space for the constructed dictionary
    """

    def _func_to_dict(f: ParsedFunction) -> dict:
        return {
            "name": f.name,
            "language": f.language,
            "file_path": f.file_path,
            "start_byte": f.start_byte,
            "end_byte": f.end_byte,
            "start_line": f.start_line,
            "end_line": f.end_line,
            "source": f.source,
            "existing_docstring": f.existing_docstring,
            "parameters": f.parameters,
            "return_type": f.return_type,
            "is_async": f.is_async,
            "decorators": f.decorators,
        }

    def _class_to_dict(c: ParsedClass) -> dict:
        return {
            "name": c.name,
            "language": c.language,
            "file_path": c.file_path,
            "start_byte": c.start_byte,
            "end_byte": c.end_byte,
            "start_line": c.start_line,
            "end_line": c.end_line,
            "source": c.source,
            "methods": [_func_to_dict(m) for m in c.methods],
            "docstring": c.docstring,
        }

    data = {
        "schema_version": 2,
        "path": pf.path,
        "language": pf.language,
        "functions": [_func_to_dict(f) for f in pf.functions],
        "classes": [_class_to_dict(c) for c in pf.classes],
        "imports": pf.imports,
        "last_modified": pf.last_modified,
    }
    return json.dumps(data)


def _deserialize_parsed_file(raw: str) -> ParsedFile:
    """
    Deserializes a JSON string into a fully reconstructed ParsedFile object with nested ParsedFunction and ParsedClass instances.

    Converts a JSON-serialized representation of parsed source code back into a structured ParsedFile object by parsing the raw JSON string and recursively reconstructing the full object hierarchy, including all top-level functions, classes, and their nested methods, using internal helper functions _dict_to_func and _dict_to_class.

    Args:
        raw (str): A JSON string containing the serialized ParsedFile data, including path, language, functions, classes, imports, and file metadata fields such as last_modified.

    Returns:
        ParsedFile: A fully reconstructed ParsedFile object containing lists of ParsedFunction and ParsedClass objects, along with imports and file metadata such as path, language, and last_modified timestamp.

    Raises:
        json.JSONDecodeError: When the raw string is not valid JSON and cannot be parsed.
        KeyError: When required keys such as 'path', 'language', 'name', 'file_path', 'start_byte', 'end_byte', 'start_line', 'end_line', or 'source' are missing from the JSON structure.
        ValueError: When the JSON's "schema_version" field is missing or less than 2 — cache entries from older schema versions are rejected.

    Example:
        ```
        parsed_file = _deserialize_parsed_file('{"schema_version": 2, "path": "src/utils.py", "language": "python", "functions": [{"name": "add", "language": "python", "file_path": "src/utils.py", "start_byte": 0, "end_byte": 42, "start_line": 1, "end_line": 3, "source": "def add(a, b):\n    return a + b"}], "classes": [], "imports": ["os"], "last_modified": 1700000000.0}')
        ```

    Complexity: O(n + m) time and space, where n is the number of top-level functions and m is the total number of methods across all classes
    """
    data = json.loads(raw)

    # Reject cache entries from older schema versions
    if data.get("schema_version", 1) < 2:
        raise ValueError(f"Unsupported cache schema version: {data.get('schema_version', 1)}")

    def _dict_to_func(d: dict) -> ParsedFunction:
        return ParsedFunction(
            name=d["name"],
            language=d["language"],
            file_path=d["file_path"],
            start_byte=d["start_byte"],
            end_byte=d["end_byte"],
            start_line=d["start_line"],
            end_line=d["end_line"],
            source=d["source"],
            existing_docstring=d.get("existing_docstring"),
            parameters=d.get("parameters", []),
            return_type=d.get("return_type"),
            is_async=d.get("is_async", False),
            decorators=d.get("decorators", []),
        )

    def _dict_to_class(d: dict) -> ParsedClass:
        return ParsedClass(
            name=d["name"],
            language=d["language"],
            file_path=d["file_path"],
            start_byte=d["start_byte"],
            end_byte=d["end_byte"],
            start_line=d["start_line"],
            end_line=d["end_line"],
            source=d["source"],
            methods=[_dict_to_func(m) for m in d.get("methods", [])],
            docstring=d.get("docstring"),
        )

    return ParsedFile(
        path=data["path"],
        language=data["language"],
        functions=[_dict_to_func(f) for f in data.get("functions", [])],
        classes=[_dict_to_class(c) for c in data.get("classes", [])],
        imports=data.get("imports", []),
        last_modified=data.get("last_modified", 0.0),
    )


class ASTCache:
    def __init__(self, db_path: str) -> None:
        dir_path = os.path.dirname(db_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
            try:
                os.chmod(dir_path, 0o700)
            except PermissionError:
                pass
        self._db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ast_cache (
                    file_path TEXT PRIMARY KEY,
                    mtime REAL,
                    parsed_json TEXT,
                    updated_at REAL,
                    last_checked_json TEXT
                )
            """)
            # Migrate existing databases that predate last_checked_json
            try:
                conn.execute("ALTER TABLE ast_cache ADD COLUMN last_checked_json TEXT")
            except Exception:
                pass

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._db_path)

    def is_stale(self, file_path: str) -> bool:
        if not os.path.exists(file_path):
            return True
        current_mtime = os.path.getmtime(file_path)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT mtime FROM ast_cache WHERE file_path = ?", (file_path,)
            ).fetchone()
        if row is None:
            return True
        return current_mtime != row[0]

    def get(self, file_path: str) -> ParsedFile | None:
        if self.is_stale(file_path):
            return None
        with self._connect() as conn:
            row = conn.execute(
                "SELECT parsed_json FROM ast_cache WHERE file_path = ?", (file_path,)
            ).fetchone()
        if row is None:
            return None
        try:
            return _deserialize_parsed_file(row[0])
        except Exception:
            return None

    def set(
        self,
        parsed_file: ParsedFile,
        remote_pending: list[dict] | None = None,
        repo_root: str | None = None,
    ) -> None:
        mtime = (
            os.path.getmtime(parsed_file.path)
            if os.path.exists(parsed_file.path)
            else parsed_file.last_modified
        )
        parsed_json = _serialize_parsed_file(parsed_file)
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO ast_cache (file_path, mtime, parsed_json, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(file_path) DO UPDATE SET
                       mtime = excluded.mtime,
                       parsed_json = excluded.parsed_json,
                       updated_at = excluded.updated_at""",
                (parsed_file.path, mtime, parsed_json, time.time()),
            )
        if remote_pending is not None and repo_root is not None:
            remote_pending.append(
                {
                    "file_path": os.path.relpath(parsed_file.path, repo_root),
                    "parsed_json": parsed_json,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )

    def get_baseline(self, file_path: str, remote_json: str | None = None) -> ParsedFile | None:
        """Return the stored snapshot regardless of mtime — used by drift detection.

        Falls back to `remote_json` (a Supabase-backed ast_baseline row, from
        prefetch_baselines()) on a local SQLite miss, backfilling SQLite so
        subsequent calls hit L1.
        """
        with self._connect() as conn:
            row = conn.execute(
                "SELECT parsed_json FROM ast_cache WHERE file_path = ?", (file_path,)
            ).fetchone()
        if row is not None:
            try:
                return _deserialize_parsed_file(row[0])
            except Exception:
                pass
        if remote_json:
            try:
                pf = _deserialize_parsed_file(remote_json)
                self.set(pf)
                return pf
            except Exception:
                pass
        return None

    def invalidate(self, file_path: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM ast_cache WHERE file_path = ?", (file_path,))

    def clear(self) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM ast_cache")

    def _write_sqlite_result(
        self,
        file_path: str,
        func_name: str,
        source: str,
        docstring: str,
        status: str,
        reason: str | None,
    ) -> None:
        """Write an LLM result to SQLite only. Used by set_function_result and L2 backfill."""
        entry_json = json.dumps(
            {
                "src_hash": _hash(source),
                "doc_hash": _hash(docstring),
                "status": status,
                "reason": reason,
            }
        )
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO ast_cache (file_path, mtime, parsed_json, updated_at, last_checked_json)
                   VALUES (?, 0, '{}', ?, json_set('{}', '$.' || ?, json(?)))
                   ON CONFLICT(file_path) DO UPDATE SET
                       last_checked_json = json_set(
                           COALESCE(last_checked_json, '{}'), '$.' || ?, json(?)
                       ),
                       updated_at = excluded.updated_at""",
                (file_path, now, func_name, entry_json, func_name, entry_json),
            )

    def get_function_result(
        self,
        file_path: str,
        func_name: str,
        source: str,
        docstring: str,
        l2_cache: dict[tuple[str, str], tuple[str, str | None]] | None = None,
    ) -> tuple[str, str | None] | None:
        """Return (status, reason) if a cached LLM result exists, else None.

        Checks SQLite (L1) first, then `l2_cache` (a dict from
        prefetch_function_results, if provided).
        """
        src_hash = _hash(source)
        doc_hash = _hash(docstring)

        # L1: SQLite (local, fast, offline)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT last_checked_json FROM ast_cache WHERE file_path = ?", (file_path,)
            ).fetchone()
        if row and row[0]:
            try:
                entry = json.loads(row[0]).get(func_name)
                if entry and entry["doc_hash"] == doc_hash:
                    # Drift verdict is bound to the docstring, not the source.
                    # If this docstring was previously judged drifted, persist
                    # that verdict even when the source changes — the docstring
                    # is still wrong until the developer updates it.
                    if entry["status"] == "drifted":
                        return entry["status"], entry.get("reason")
                    # For up_to_date/undocumented, require exact source match
                    # so a body change triggers a fresh LLM evaluation.
                    if entry["src_hash"] == src_hash:
                        return entry["status"], entry.get("reason")
            except Exception:
                pass

        # L2: prefetched Supabase verdicts (shared across devs and API server)
        if l2_cache is not None:
            # Exact match first (same source + same docstring)
            entry = l2_cache.get((src_hash, doc_hash))
            if entry is not None:
                status, reason = entry
                self._write_sqlite_result(file_path, func_name, source, docstring, status, reason)
                return status, reason

        return None

    def set_function_result(
        self,
        file_path: str,
        func_name: str,
        source: str,
        docstring: str,
        status: str,
        reason: str | None,
        l2_pending: list[dict] | None = None,
    ) -> None:
        """Persist the LLM result for a function — writes to SQLite (L1) immediately
        and, if `l2_pending` is provided, queues an L2 (Supabase) upsert to be
        flushed via flush_function_results()."""
        self._write_sqlite_result(file_path, func_name, source, docstring, status, reason)
        if l2_pending is not None:
            l2_pending.append(
                {
                    "src_hash": _hash(source),
                    "doc_hash": _hash(docstring),
                    "status": status,
                    "reason": reason,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
