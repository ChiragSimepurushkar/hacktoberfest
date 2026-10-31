"""Shared Pydantic models used across all diagram types."""
from typing import Literal
from pydantic import BaseModel


class InferenceEntry(BaseModel):
    field: str
    source: Literal["read_directly", "inferred", "computed"]
    reasoning: str


class DetectedIssue(BaseModel):
    severity: Literal["error", "warning", "info"]
    location: str
    issue: str
    suggested_fix: str = ""


class AuditBlock(BaseModel):
    concept_explanation: str
    detected_issues: list[DetectedIssue]
    inference_trace: list[InferenceEntry]
