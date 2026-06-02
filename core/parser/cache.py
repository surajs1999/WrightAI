from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time

import redis as _redislib

from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction, ParsedClass

# ── Redis LLM result cache (L2) ───────────────────────────────────────────────
# Keyed by content hash — no user identity, shared globally across all callers.
# Falls back silently to SQLite-only if REDIS_URL is unset or unreachable.

_redis_client: object = None   # None = not tried; False = unavailable; Redis = connected
_REDIS_LLM_TTL = int(os.getenv("WRIGHT_CACHE_TTL_DAYS", "30")) * 86400


def _redis() -> "_redislib.Redis | None":  # type: ignore[name-defined]
    global _redis_client
    if _redis_client is None:
        url = os.getenv("REDIS_URL")
        if url:
            try:
                c = _redislib.Redis.from_url(url, socket_connect_timeout=1, decode_responses=True)
                c.ping()
                _redis_client = c
            except Exception:
                _redis_client = False
        else:
            _redis_client = False
    return _redis_client if _redis_client is not False else None


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _serialize_parsed_file(pf: ParsedFile) -> str:
    """
    Serializes a ParsedFile object and all its nested structures into a JSON-formatted string.

    Converts a ParsedFile object into a dictionary representation by recursively extracting attributes from all nested ParsedFunction and ParsedClass objects, then serializes the resulting dictionary to a JSON string. The output includes the file path, language, functions, classes, imports, and last modified timestamp.

    Args:
        pf (ParsedFile): The parsed file object containing functions, classes, imports, and metadata to be serialized.

    Returns:
        str: A JSON-formatted string containing the serialized representation of the ParsedFile, including its path, language, functions, classes, imports, and last modified timestamp.

    Example:
        ```
        json_str = _serialize_parsed_file(parsed_file)
        # json_str => '{"path": "app.py", "language": "python", "functions": [], "classes": [], "imports": [], "last_modified": 1700000000.0}'
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

    Example:
        ```
        parsed_file = _deserialize_parsed_file('{"path": "src/utils.py", "language": "python", "functions": [{"name": "add", "language": "python", "file_path": "src/utils.py", "start_byte": 0, "end_byte": 42, "start_line": 1, "end_line": 3, "source": "def add(a, b):\n    return a + b"}], "classes": [], "imports": ["os"], "last_modified": 1700000000.0}')
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
        os.makedirs(dir_path, exist_ok=True)
        os.chmod(dir_path, 0o700)
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

    def set(self, parsed_file: ParsedFile) -> None:
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

    def get_baseline(self, file_path: str) -> ParsedFile | None:
        """Return the stored snapshot regardless of mtime — used by drift detection."""
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
        """Write an LLM result to SQLite only. Used by set_function_result and Redis backfill."""
        entry_json = json.dumps({
            "src_hash": _hash(source),
            "doc_hash": _hash(docstring),
            "status": status,
            "reason": reason,
        })
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
        self, file_path: str, func_name: str, source: str, docstring: str
    ) -> tuple[str, str | None] | None:
        """Return (status, reason) if a cached LLM result exists, else None. Checks SQLite then Redis."""
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
                if entry and entry["src_hash"] == src_hash and entry["doc_hash"] == doc_hash:
                    return entry["status"], entry.get("reason")
            except Exception:
                pass

        # L2: Redis (shared across devs and API server)
        r = _redis()
        if r:
            try:
                cached = r.get(f"wright:drift:v1:{src_hash}:{doc_hash}")
                if cached:
                    val = json.loads(cached)
                    # backfill SQLite so next offline run is instant
                    self._write_sqlite_result(file_path, func_name, source, docstring, val["status"], val.get("reason"))
                    return val["status"], val.get("reason")
            except Exception:
                pass

        return None

    def set_function_result(
        self,
        file_path: str,
        func_name: str,
        source: str,
        docstring: str,
        status: str,
        reason: str | None,
    ) -> None:
        """Persist the LLM result for a function — writes to SQLite and Redis."""
        self._write_sqlite_result(file_path, func_name, source, docstring, status, reason)
        r = _redis()
        if r:
            try:
                r.set(
                    f"wright:drift:v1:{_hash(source)}:{_hash(docstring)}",
                    json.dumps({"status": status, "reason": reason}),
                    ex=_REDIS_LLM_TTL,
                )
            except Exception:
                pass
