"""Extraction prompt for circuit diagrams."""

CIRCUIT_EXTRACTION_PROMPT = """\
You are extracting a circuit diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Rules:
- Assign sequential node labels (A, B, C, ...) to junction points.
- Read component values directly from labels where visible.
- If a value is missing or ambiguous, flag it in inference_trace with source "inferred".
- Supported component types: battery, resistor, capacitor, inductor, switch, led, ground.
- Audit block requirements:
  * concept_explanation: Plain-language explanation of circuit topology (series/parallel), source voltage, equivalent resistance, and expected current/behavior.
  * detected_issues: Perform sanity checks for short circuits, floating nodes, or missing closed loops. Flag any issues with severity ("error"|"warning"|"info"), location, issue, and suggested_fix.
  * inference_trace: For every component whose value was estimated (e.g. typical LED forward voltage, unlabeled resistor), flag with field (e.g. "components[0].value"), source="inferred", and detailed reasoning. For explicitly marked values, use source="read_directly".

Few-shot examples:

Example 1 — 9V battery with two series resistors:
Image description: A rectangular loop drawn with a 9V battery on the left side,
a 220 Ω resistor on the top, and a 330 Ω resistor on the right side.
Nodes labeled A (top-left), B (top-right), C (bottom-right).
Expected JSON:
{{
  "components": [
    {{"type": "battery",  "value": 9,   "node_a": "A", "node_b": "C", "label": "V1"}},
    {{"type": "resistor", "value": 220, "node_a": "A", "node_b": "B", "label": "R1"}},
    {{"type": "resistor", "value": 330, "node_a": "B", "node_b": "C", "label": "R2"}}
  ],
  "source": "V1",
  "audit": {{
    "concept_explanation": "Series resistor network: 9V battery, R1=220Ω and R2=330Ω in series. Total R=550Ω, I≈16.4 mA.",
    "detected_issues": [],
    "inference_trace": [
      {{"field": "components[1].value", "source": "read_directly", "reasoning": "220 labeled next to resistor symbol."}},
      {{"field": "components[2].value", "source": "read_directly", "reasoning": "330 labeled next to resistor symbol."}}
    ]
  }}
}}

Example 2 — Battery with one resistor and an LED:
Image description: Simple loop: a 5V battery, one 470 Ω resistor, and an LED.
No explicit node labels visible on the diagram.
Expected JSON:
{{
  "components": [
    {{"type": "battery",  "value": 5,   "node_a": "A", "node_b": "C", "label": "V1"}},
    {{"type": "resistor", "value": 470, "node_a": "A", "node_b": "B", "label": "R1"}},
    {{"type": "led",      "value": 0,   "node_a": "B", "node_b": "C", "label": "D1"}}
  ],
  "source": "V1",
  "audit": {{
    "concept_explanation": "LED circuit: 5V supply, 470Ω current-limiting resistor, LED. Estimated current ≈ 9 mA (assuming Vf ≈ 1.8V).",
    "detected_issues": [],
    "inference_trace": [
      {{"field": "components[0].value", "source": "read_directly", "reasoning": "5V labeled on battery symbol."}},
      {{"field": "components[1].value", "source": "read_directly", "reasoning": "470 labeled next to resistor."}},
      {{"field": "components[2].value", "source": "inferred", "reasoning": "LED has no numeric value; forward voltage ~1.8V assumed."}}
    ]
  }}
}}

{error_feedback}
"""
