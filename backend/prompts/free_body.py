"""Extraction prompt for free-body diagrams."""

FREE_BODY_EXTRACTION_PROMPT = """\
You are extracting a free-body diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Rules:
- angle is in degrees; 0 = pointing right, 90 = pointing up.
- Force labels: always set "label" to one of these four canonical values —
  "gravity", "normal", "applied", "friction" — based on what the force
  physically IS, never the literal symbol or letter handwritten next to the
  arrow in the photo. For example: an arrow annotated "N" or "Normal force"
  is still label "normal"; "mg", "W", or "Weight" is still "gravity"; "f",
  "friction", or "μN" is still "friction"; any other external push/pull
  (often annotated "F") is "applied". Only use a different label for a force
  that genuinely doesn't fit one of these four (e.g. "tension", "spring").
- Infer force magnitudes from labeled values; if unlabeled, estimate from
  relative arrow length and state the assumptions used in inference_trace.
- If the image is ambiguous or illegible, return the field
  "needs_clarification" with a short description instead of guessing.
- surface is one of: "flat", "incline", "none" (or a brief description).
- Audit block requirements:
  * concept_explanation: Concise description of the physical system, forces acting, and expected motion.
  * detected_issues: Check Newton's second law and equilibrium. If forces do not balance for a static scenario, or normal force doesn't match mg*cos(theta) on an incline, flag it with severity ("error"|"warning"|"info"), location, issue, and suggested_fix.
  * inference_trace: For any force, angle, or mass whose value was estimated rather than read from explicit text, add an entry with field, source="inferred", and detailed reasoning. For explicit labels, use source="read_directly".

Few-shot examples:

Example 1 — 5 kg block on a flat surface with friction:
Image description: A rectangular block labeled "5 kg" on a horizontal surface.
Four arrows: gravity (↓, labeled 49 N), normal (↑, labeled 49 N),
applied (→, labeled 20 N), and friction (←, unlabeled, shorter than applied).
Expected JSON:
{{
  "mass": 5.0,
  "forces": [
    {{"label": "gravity",  "magnitude": 49.0, "angle": 270, "anchor": "center"}},
    {{"label": "normal",   "magnitude": 49.0, "angle": 90,  "anchor": "base"}},
    {{"label": "applied",  "magnitude": 20.0, "angle": 0,   "anchor": "center"}},
    {{"label": "friction", "magnitude": 8.0,  "angle": 180, "anchor": "base"}}
  ],
  "surface": "flat",
  "friction_coeff": 0.3,
  "audit": {{
    "concept_explanation": "Block on a flat surface with applied force and kinetic friction opposing motion.",
    "detected_issues": [],
    "inference_trace": [
      {{
        "field": "forces[3].magnitude",
        "source": "inferred",
        "reasoning": "Friction arrow is ~40% the length of the applied arrow; μk·N = 0.3×49 ≈ 14.7 N but arrow suggests ~8 N — flagged as inferred."
      }}
    ]
  }}
}}

Example 2 — 2.5 kg block on a 30° incline, no friction:
Image description: A block labeled "2.5 kg" on a ramp inclined at 30°.
Two arrows: gravity (↓, labeled 24.5 N) and normal (perpendicular to surface, ↑-right, unlabeled).
Expected JSON:
{{
  "mass": 2.5,
  "forces": [
    {{"label": "gravity", "magnitude": 24.5, "angle": 270, "anchor": "center"}},
    {{"label": "normal",  "magnitude": 21.2, "angle": 120, "anchor": "base"}}
  ],
  "surface": "incline",
  "friction_coeff": 0.0,
  "audit": {{
    "concept_explanation": "Block on a frictionless 30° incline — only gravity and normal force act on it.",
    "detected_issues": [
      {{
        "severity": "warning",
        "location": "force balance",
        "issue": "Net force is non-zero (block will accelerate down the incline).",
        "suggested_fix": "If equilibrium is intended, an applied force along the incline is missing."
      }}
    ],
    "inference_trace": [
      {{
        "field": "forces[1].magnitude",
        "source": "inferred",
        "reasoning": "Normal force perpendicular to 30° incline = mg·cos(30°) = 24.5×0.866 ≈ 21.2 N. Not labeled on diagram."
      }},
      {{
        "field": "forces[1].angle",
        "source": "inferred",
        "reasoning": "Normal is perpendicular to a 30° incline surface, so it points at 90°+30° = 120° from horizontal."
      }}
    ]
  }}
}}

{error_feedback}
"""
