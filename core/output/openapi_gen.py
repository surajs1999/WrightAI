from __future__ import annotations

import json
from typing import Any

from core.parser.tree_sitter_parser import ParsedFunction


class OpenAPIGenerator:
    def __init__(self, title: str, version: str = "1.0.0") -> None:
        self._spec: dict[str, Any] = {
            "openapi": "3.0.3",
            "info": {"title": title, "version": version},
            "paths": {},
        }

    def add_endpoint(self, func: ParsedFunction, route_info: dict[str, Any]) -> None:
        path = route_info.get("path", f"/{func.name}")
        method = route_info.get("method", "get").lower()
        summary = route_info.get("summary", func.name)
        description = route_info.get("description", func.existing_docstring or "")

        parameters = []
        for param in func.parameters:
            parameters.append({
                "name": param["name"],
                "in": "query",
                "required": False,
                "schema": {"type": self._map_type(param.get("type_annotation"))},
                "description": "",
            })

        operation: dict[str, Any] = {
            "summary": summary,
            "description": description,
            "parameters": parameters,
            "responses": {
                "200": {"description": "Success"},
                "422": {"description": "Validation Error"},
            },
        }

        if method in ("post", "put", "patch"):
            operation["requestBody"] = {
                "content": {"application/json": {"schema": {"type": "object"}}},
                "required": True,
            }

        if path not in self._spec["paths"]:
            self._spec["paths"][path] = {}
        self._spec["paths"][path][method] = operation

    def _map_type(self, type_hint: str | None) -> str:
        if not type_hint:
            return "string"
        mapping = {
            "int": "integer",
            "float": "number",
            "bool": "boolean",
            "str": "string",
            "list": "array",
            "dict": "object",
        }
        return mapping.get(type_hint.lower(), "string")

    def to_json(self) -> str:
        return json.dumps(self._spec, indent=2)

    def to_yaml(self) -> str:
        try:
            import yaml
            return yaml.dump(self._spec, default_flow_style=False)
        except ImportError:
            return self.to_json()
