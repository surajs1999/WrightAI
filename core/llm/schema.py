from __future__ import annotations

from pydantic import BaseModel


class ParameterDoc(BaseModel):
    name: str
    type_hint: str | None = None
    description: str


class ReturnDoc(BaseModel):
    type_hint: str | None = None
    description: str


class RaiseDoc(BaseModel):
    exception: str
    condition: str


class DocstringSchema(BaseModel):
    summary: str
    description: str | None = None
    parameters: list[ParameterDoc] = []
    returns: ReturnDoc | None = None
    raises: list[RaiseDoc] = []
    example: str | None = None
    complexity: str | None = None
    side_effects: str | None = None
    notes: str | None = None
