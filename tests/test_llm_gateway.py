"""Tests for LLM gateway and schema (uses mocked Anthropic client)."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.llm.schema import DocstringSchema, ParameterDoc, ReturnDoc


def test_docstring_schema_validates_correctly() -> None:
    data = {
        "summary": "Returns the sum of two numbers.",
        "description": None,
        "parameters": [
            {"name": "a", "type_hint": "int", "description": "First number."},
            {"name": "b", "type_hint": "int", "description": "Second number."},
        ],
        "returns": {"type_hint": "int", "description": "The sum."},
        "raises": [],
        "example": "result = add(1, 2)",
        "complexity": None,
    }
    schema = DocstringSchema.model_validate(data)
    assert schema.summary == "Returns the sum of two numbers."
    assert len(schema.parameters) == 2
    assert schema.returns is not None
    assert schema.returns.type_hint == "int"


def test_docstring_schema_from_json() -> None:
    json_str = json.dumps({
        "summary": "Tests the schema.",
        "parameters": [],
        "raises": [],
    })
    schema = DocstringSchema.model_validate_json(json_str)
    assert schema.summary == "Tests the schema."
    assert schema.parameters == []
    assert schema.returns is None


def test_gateway_parse_structured_output_valid_json() -> None:
    from core.llm.gateway import LLMGateway
    gateway = LLMGateway.__new__(LLMGateway)

    valid = json.dumps({
        "summary": "Does something.",
        "parameters": [],
        "raises": [],
    })
    schema = gateway._parse_structured_output(valid)
    assert schema.summary == "Does something."


def test_gateway_parse_structured_output_with_fences() -> None:
    from core.llm.gateway import LLMGateway
    gateway = LLMGateway.__new__(LLMGateway)

    fenced = '```json\n{"summary": "Works fine.", "parameters": [], "raises": []}\n```'
    schema = gateway._parse_structured_output(fenced)
    assert schema.summary == "Works fine."


def test_gateway_parse_structured_output_fallback_on_bad_json() -> None:
    from core.llm.gateway import LLMGateway
    gateway = LLMGateway.__new__(LLMGateway)

    # Should fall back to a minimal schema rather than raising
    schema = gateway._parse_structured_output("This is not JSON at all.")
    assert isinstance(schema, DocstringSchema)
    assert len(schema.summary) > 0
