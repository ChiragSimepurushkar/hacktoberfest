"""Extraction prompt for circuit diagrams."""

CIRCUIT_EXTRACTION_PROMPT = """\
You are extracting a circuit diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Rules:
- Assign sequential node labels (A, B, C, ...) to junction points.
- Read component values directly from labels where visible.
- If a value is missing or ambiguous, flag it in inference_trace with source "inferred".
- Always populate the audit block.

{error_feedback}
"""
