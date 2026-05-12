"""Tests for LLM gateway and schema (uses mocked Anthropic client)."""

from __future__ import annotations

import json


from core.llm.schema import DocstringSchema


def test_docstring_schema_validates_correctly() -> None:
    """
    Validates that the DocstringSchema model correctly parses and stores docstring data.

    Tests the model_validate method of DocstringSchema by providing a sample dictionary with docstring components including summary, parameters, returns, and other metadata, then asserts that the parsed schema object contains the expected values.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_docstring_schema_validates_correctly()
        ```
    """
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
    """
    Tests the deserialization of a DocstringSchema object from a JSON string.

    Verifies that a DocstringSchema instance can be correctly created from a JSON string using model_validate_json, and that all fields (summary, parameters, returns, raises) are properly populated or set to their expected default values.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        test_docstring_schema_from_json()
        ```
    """
    json_str = json.dumps(
        {
            "summary": "Tests the schema.",
            "parameters": [],
            "raises": [],
        }
    )
    schema = DocstringSchema.model_validate_json(json_str)
    assert schema.summary == "Tests the schema."
    assert schema.parameters == []
    assert schema.returns is None


def test_gateway_parse_structured_output_valid_json() -> None:
    """
    Tests that the LLMGateway can successfully parse valid JSON output into a structured schema object.

    This test verifies that the _parse_structured_output method correctly deserializes a valid JSON string containing summary, parameters, and raises fields into a schema object, and that the summary field is properly accessible.

    Returns:
        None: This is a test function that returns nothing.

    Example:
        ```
        test_gateway_parse_structured_output_valid_json()
        ```
    """
    from core.llm.gateway import LLMGateway

    gateway = LLMGateway.__new__(LLMGateway)

    valid = json.dumps(
        {
            "summary": "Does something.",
            "parameters": [],
            "raises": [],
        }
    )
    schema = gateway._parse_structured_output(valid)
    assert schema.summary == "Does something."


def test_gateway_parse_structured_output_with_fences() -> None:
    """
    Tests that the LLMGateway._parse_structured_output method correctly parses JSON output wrapped in markdown code fences.

    This test verifies that when JSON data is provided within markdown-style code fences (```json...```), the _parse_structured_output method can extract and parse the JSON content, returning a properly structured schema object with the expected attributes.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_gateway_parse_structured_output_with_fences()
        ```
    """
    from core.llm.gateway import LLMGateway

    gateway = LLMGateway.__new__(LLMGateway)

    fenced = '```json\n{"summary": "Works fine.", "parameters": [], "raises": []}\n```'
    schema = gateway._parse_structured_output(fenced)
    assert schema.summary == "Works fine."


def test_gateway_parse_structured_output_fallback_on_bad_json() -> None:
    """
    Tests that the LLMGateway fallback mechanism returns a valid DocstringSchema when parsing invalid JSON input.

    Verifies that _parse_structured_output gracefully handles malformed JSON by falling back to a minimal schema with a non-empty summary instead of raising an exception.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_gateway_parse_structured_output_fallback_on_bad_json()
        ```
    """
    from core.llm.gateway import LLMGateway

    gateway = LLMGateway.__new__(LLMGateway)

    # Should fall back to a minimal schema rather than raising
    schema = gateway._parse_structured_output("This is not JSON at all.")
    assert isinstance(schema, DocstringSchema)
    assert len(schema.summary) > 0
