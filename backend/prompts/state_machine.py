"""Extraction prompt for state machine / flowchart diagrams."""

STATE_MACHINE_EXTRACTION_PROMPT = """\
You are extracting a state machine diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Rules:
- List all states, transitions (with labels), the initial state, and accepting states.
- In detected_issues, flag any state with missing outgoing transitions.
- Always populate the audit block.

{error_feedback}
"""
