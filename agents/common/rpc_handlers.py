"""
JSON-RPC 2.0 Pydantic schemas for Agent-to-Agent (A2A) messaging consistency.

See https://www.jsonrpc.org/specification — requests carry method/params;
responses return either result or error (never both).
"""

from __future__ import annotations

from typing import Any, Literal, Union

from pydantic import BaseModel, Field


class JsonRpcRequest(BaseModel):
    """Inbound JSON-RPC 2.0 request (including notifications when id is omitted)."""

    jsonrpc: Literal["2.0"] = "2.0"
    method: str = Field(..., description="Agent or service method name.")
    params: Union[list[Any], dict[str, Any], None] = None
    id: Union[str, int, None] = None


class JsonRpcErrorBody(BaseModel):
    code: int
    message: str
    data: Any | None = None


class JsonRpcSuccess(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    result: Any = None
    id: Union[str, int, None] = None


class JsonRpcErrorResponse(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    error: JsonRpcErrorBody
    id: Union[str, int, None] = None


JsonRpcResponse = Union[JsonRpcSuccess, JsonRpcErrorResponse]
