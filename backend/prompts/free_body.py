"""Extraction prompt for free-body diagrams."""

FREE_BODY_EXTRACTION_PROMPT = """\
You are extracting a free-body diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Rules:
- angle is in degrees; 0 = pointing right, 90 = pointing up.
- Infer force magnitudes from labeled values; if unlabeled, estimate from
  relative arrow length and state the assumptions used in inference_trace.
- If the image is ambiguous or illegible, return the field
  "needs_clarification" with a short description instead of guessing.
- Always populate the audit block.

{error_feedback}
"""
