"""Extraction prompt for state machine / flowchart diagrams."""

STATE_MACHINE_EXTRACTION_PROMPT = """\
You are extracting a state machine diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Rules:
- List all states, transitions (with labels), the initial state, and accepting states.
- In detected_issues, flag any state with missing outgoing transitions for any input symbol.
- The initial state is typically marked with an arrow from nowhere (→ q0) or the word "start".
- Accepting/final states are typically drawn as double circles.
- Always populate the audit block.

Few-shot examples:

Example 1 — DFA recognizing the string "ab":
Image description: Three circles q0, q1, q2. Arrow from nowhere to q0 (initial).
q0 —a→ q1, q1 —b→ q2. q2 is drawn as a double circle (accepting). No other transitions.
Expected JSON:
{{
  "states": ["q0", "q1", "q2"],
  "transitions": [
    {{"from": "q0", "to": "q1", "label": "a"}},
    {{"from": "q1", "to": "q2", "label": "b"}}
  ],
  "initial": "q0",
  "accepting": ["q2"],
  "audit": {{
    "concept_explanation": "DFA accepting exactly the string 'ab'. Two transitions lead from start to the single accepting state.",
    "detected_issues": [
      {{
        "severity": "warning",
        "location": "states q0, q1, q2",
        "issue": "No transitions defined for input symbols other than 'a' from q0 and 'b' from q1 — automaton is incomplete (missing dead/trap-state transitions).",
        "suggested_fix": "Add a dead state and route all undefined transitions there."
      }}
    ],
    "inference_trace": []
  }}
}}

Example 2 — Traffic light state machine:
Image description: Three circles: RED, GREEN, YELLOW. Arrow from nowhere to RED.
RED —timer→ GREEN, GREEN —timer→ YELLOW, YELLOW —timer→ RED.
No accepting states visible.
Expected JSON:
{{
  "states": ["RED", "GREEN", "YELLOW"],
  "transitions": [
    {{"from": "RED",    "to": "GREEN",  "label": "timer"}},
    {{"from": "GREEN",  "to": "YELLOW", "label": "timer"}},
    {{"from": "YELLOW", "to": "RED",    "label": "timer"}}
  ],
  "initial": "RED",
  "accepting": [],
  "audit": {{
    "concept_explanation": "Cyclic traffic light controller: RED → GREEN → YELLOW → RED, each transition triggered by a timer event.",
    "detected_issues": [],
    "inference_trace": [
      {{
        "field": "accepting",
        "source": "inferred",
        "reasoning": "No double-circle states visible in diagram; accepting list left empty as this is a cyclic control machine."
      }}
    ]
  }}
}}

{error_feedback}
"""
