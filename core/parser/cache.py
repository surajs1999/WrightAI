from __future__ import annotations

import json
import os
import sqlite3
import time
from dataclasses import asdict

from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction, ParsedClass


def _serialize_parsed_file(pf: ParsedFile) -> str:
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
        "path": pf.path,
        "language": pf.language,
        "functions": [_func_to_dict(f) for f in pf.functions],
        "classes": [_class_to_dict(c) for c in pf.classes],
        "imports": pf.imports,
        "last_modified": pf.last_modified,
    }
    return json.dumps(data)


def _deserialize_parsed_file(raw: str) -> ParsedFile:
    data = json.loads(raw)

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
                    updated_at REAL
                )
            """)

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
        mtime = os.path.getmtime(parsed_file.path) if os.path.exists(parsed_file.path) else parsed_file.last_modified
        parsed_json = _serialize_parsed_file(parsed_file)
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO ast_cache (file_path, mtime, parsed_json, updated_at) VALUES (?, ?, ?, ?)",
                (parsed_file.path, mtime, parsed_json, time.time()),
            )

    def invalidate(self, file_path: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM ast_cache WHERE file_path = ?", (file_path,))

    def clear(self) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM ast_cache")
