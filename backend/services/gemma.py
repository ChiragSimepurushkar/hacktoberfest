"""Gemma 4 service — classify, extract, and tutor diagrams via the Gemini API."""
import json
import os
import io
import re
from PIL import Image
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
load_dotenv()

from prompts.classify import CLASSIFY_PROMPT, VALID_TYPES
from prompts.free_body import FREE_BODY_EXTRACTION_PROMPT
from prompts.circuit import CIRCUIT_EXTRACTION_PROMPT
from prompts.state_machine import STATE_MACHINE_EXTRACTION_PROMPT

MAX_RETRIES = 2

_EXTRACTION_PROMPTS = {
    "free_body":     FREE_BODY_EXTRACTION_PROMPT,
    "circuit":       CIRCUIT_EXTRACTION_PROMPT,
    "state_machine": STATE_MACHINE_EXTRACTION_PROMPT,
}

_client = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        _client = genai.Client(api_key=api_key)
    return _client

def _get_model_name() -> str:
    return os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")

def _get_fallback_model() -> str:
    return os.getenv("FALLBACK_MODEL", "gemini-3.8-flash")


def _call_model(contents, config=None):
    """Calls primary model (Gemma 4), falling back to Gemini 3.8 Flash if primary errors."""
    client = _get_client()
    primary = _get_model_name()
    fallback = _get_fallback_model()

    try:
        return client.models.generate_content(
            model=primary,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        print(f"[Model Call] Primary '{primary}' failed ({exc}). Retrying with fallback '{fallback}'...")
        return client.models.generate_content(
            model=fallback,
            contents=contents,
            config=config,
        )


def normalize_diagram_type(text: str) -> str:
    """Robustly classifies diagram type from model response or text."""
    t = text.lower().replace("-", " ").replace("_", " ")

    # Free body / mechanics
    if any(k in t for k in [
        "free body", "body mass", "fbd", "force", "incline", "ramp",
        "normal force", "friction", "gravity", "mass on", "block on", "mechanics"
    ]):
        return "free_body"

    # Circuit / electronics
    if any(k in t for k in [
        "circuit", "schematic", "resistor", "battery", "voltage", "current",
        "nodal", "electronic", "capacitor", "inductor", "switch", "ohm", "kirchhoff"
    ]):
        return "circuit"

    # State machine / automata
    if any(k in t for k in [
        "state machine", "automata", "automaton", "fsm", "dfa", "nfa",
        "transition", "state", "states", "flowchart", "turing"
    ]):
        return "state_machine"

    return "unsupported"


def classify_image(image_bytes: bytes) -> str:
    """Return one of: free_body | circuit | state_machine | unsupported."""
    pil_image = Image.open(io.BytesIO(image_bytes))

    try:
        response = _call_model(
            contents=[pil_image, CLASSIFY_PROMPT],
            config=types.GenerateContentConfig(temperature=0.0)
        )
        raw_text = response.text.strip()
        print(f"[classify_image] Model responded with: {raw_text!r}")
        normalized = normalize_diagram_type(raw_text)
        print(f"[classify_image] Normalized classification: {normalized!r}")
        return normalized
    except Exception as e:
        print(f"[classify_image] Error: {e}")
        return "unsupported"


def parse_json_safely(text: str) -> dict:
    """Extract and parse JSON from text that might contain markdown blocks or commentary."""
    text = text.strip()

    # 1. Match ```json ... ``` block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        candidate = match.group(1).strip()
        try:
            return json.loads(candidate)
        except Exception:
            pass

    # 2. Extract outermost { ... }
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1:
        candidate = text[first:last + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass

    # 3. Direct load fallback
    return json.loads(text)


def _to_float(val, default: float = 0.0) -> float:
    """Extract float from number or string like '10 N', '4 Ω', '30 deg'."""
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        # Extract first numeric sequence (including optional minus and decimal)
        m = re.search(r"[-+]?\d*\.?\d+", val)
        if m:
            try:
                return float(m.group(0))
            except ValueError:
                pass
    return default


def sanitize_extracted_data(diagram_type: str, raw: dict) -> dict:
    """Normalizes raw model JSON into clean types that conform to Pydantic schemas."""
    if not isinstance(raw, dict):
        return {}

    # Ensure audit block exists
    audit = raw.get("audit") or {}
    if not isinstance(audit, dict):
        audit = {}

    concept = audit.get("concept_explanation") or f"Analysis of handwritten {diagram_type} diagram."
    raw_issues = audit.get("detected_issues") or []
    clean_issues = []
    for issue in raw_issues:
        if isinstance(issue, dict):
            sev = issue.get("severity", "info")
            if sev not in ("error", "warning", "info"):
                sev = "info"
            clean_issues.append({
                "severity": sev,
                "location": str(issue.get("location", "diagram")),
                "issue": str(issue.get("issue", "")),
                "suggested_fix": str(issue.get("suggested_fix", "")),
            })

    raw_trace = audit.get("inference_trace") or []
    clean_trace = []
    for trace in raw_trace:
        if isinstance(trace, dict):
            src = trace.get("source", "read_directly")
            if src not in ("read_directly", "inferred"):
                src = "inferred"
            clean_trace.append({
                "field": str(trace.get("field", "")),
                "source": src,
                "reasoning": str(trace.get("reasoning", "")),
            })

    clean_audit = {
        "concept_explanation": str(concept),
        "detected_issues": clean_issues,
        "inference_trace": clean_trace,
    }

    if diagram_type == "free_body":
        raw_forces = raw.get("forces") or []
        clean_forces = []
        for f in raw_forces:
            if isinstance(f, dict):
                clean_forces.append({
                    "label": str(f.get("label", "F")),
                    "magnitude": _to_float(f.get("magnitude"), 10.0),
                    "angle": _to_float(f.get("angle"), 0.0),
                    "anchor": str(f.get("anchor", "center")),
                })

        return {
            "mass": _to_float(raw.get("mass"), 2.0),
            "forces": clean_forces,
            "surface": str(raw.get("surface", "surface")),
            "friction_coeff": _to_float(raw.get("friction_coeff"), 0.3),
            "audit": clean_audit,
        }

    elif diagram_type == "circuit":
        raw_components = raw.get("components") or []
        clean_components = []
        source_label = raw.get("source") or ""

        for c in raw_components:
            if isinstance(c, dict):
                ctype = str(c.get("type", "resistor")).lower()
                if any(k in ctype for k in ["bat", "volt", "source", "dc", "power", "v1"]):
                    ctype = "battery"
                    if not source_label:
                        source_label = c.get("label", "V1")
                elif "cap" in ctype:
                    ctype = "capacitor"
                elif "ind" in ctype:
                    ctype = "inductor"
                elif "led" in ctype:
                    ctype = "led"
                elif "switch" in ctype:
                    ctype = "switch"
                elif "gnd" in ctype or "ground" in ctype:
                    ctype = "ground"
                else:
                    ctype = "resistor"

                clean_components.append({
                    "type": ctype,
                    "value": _to_float(c.get("value"), 10.0 if ctype == "battery" else 4.0),
                    "node_a": str(c.get("node_a", "A")),
                    "node_b": str(c.get("node_b", "B")),
                    "label": str(c.get("label", f"C{len(clean_components) + 1}")),
                })

        if not source_label:
            bat = next((c for c in clean_components if c["type"] == "battery"), None)
            source_label = bat["label"] if bat else "V1"

        return {
            "components": clean_components,
            "source": source_label,
            "audit": clean_audit,
        }

    elif diagram_type == "state_machine":
        raw_states = raw.get("states") or []
        clean_states = [str(s) for s in raw_states] if raw_states else ["q0", "q1", "q2"]

        raw_initial = str(raw.get("initial", clean_states[0]))
        if raw_initial not in clean_states:
            clean_states.insert(0, raw_initial)

        raw_accepting = raw.get("accepting") or []
        clean_accepting = [str(a) for a in raw_accepting] if raw_accepting else [clean_states[-1]]

        raw_transitions = raw.get("transitions") or []
        clean_transitions = []
        for t in raw_transitions:
            if isinstance(t, dict):
                from_s = str(t.get("from") or t.get("from_state") or t.get("source") or clean_states[0])
                to_s = str(t.get("to") or t.get("to_state") or t.get("target") or clean_states[0])
                sym = str(t.get("label") or t.get("symbol") or t.get("input") or "0")
                clean_transitions.append({
                    "from": from_s,
                    "to": to_s,
                    "label": sym,
                })

        return {
            "states": clean_states,
            "transitions": clean_transitions,
            "initial": raw_initial,
            "accepting": clean_accepting,
            "audit": clean_audit,
        }

    return raw


def extract_diagram(
    diagram_type: str,
    image_bytes: bytes,
    schema_json: str,
    error_feedback: str = "",
) -> dict:
    """Call model with type-specific extraction prompt and return sanitized parsed JSON."""
    pil_image = Image.open(io.BytesIO(image_bytes))

    prompt_template = _EXTRACTION_PROMPTS.get(diagram_type, FREE_BODY_EXTRACTION_PROMPT)
    feedback_str = f"PREVIOUS VALIDATION ERROR:\n{error_feedback}\nPlease correct the JSON output." if error_feedback else ""
    full_prompt = prompt_template.format(schema=schema_json, error_feedback=feedback_str)

    response = _call_model(
        contents=[pil_image, full_prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )
    )

    raw_parsed = parse_json_safely(response.text)
    return sanitize_extracted_data(diagram_type, raw_parsed)


def chat_tutor(diagram_type: str, diagram_data: dict, question: str, history: list = None) -> str:
    """Ask Gemma 4 questions about the diagram, physics, circuits, or state machines."""
    prompt = f"""You are Gemma 4, an open-source AI engineering lab tutor for the Lab Twin project.
The student has uploaded and analyzed a handwritten {diagram_type} diagram from their notebook.
Here is the active diagram data extracted from the student's diagram:
{json.dumps(diagram_data, indent=2)}

Student Question: {question}

Provide an educational, clear, friendly explanation in plain conversational text only.
- Answer specifically about THIS diagram and its exact extracted parameters.
- Do NOT assume or refer to old example notebook numbers unless they match the active data above.
- Do NOT use any markdown formatting. No asterisks for bold, no ## headers, no - bullet dashes, no backticks, no LaTeX dollar signs.
- Use plain numbered sentences or short paragraphs instead of bullet lists.
- Detail the physical formulas or circuit laws (Ohm's Law, Kirchhoff's Laws, Newton's Laws) step-by-step in plain text.
- If there are errors or discrepancies in the student's notebook or values, point them out gently and show how to calculate the correct values.
- Write naturally, as a friendly tutor would speak.
"""
    try:
        response = _call_model(
            contents=[prompt],
            config=types.GenerateContentConfig(temperature=0.3)
        )
        return response.text.strip()
    except Exception as e:
        print(f"[chat_tutor] Error: {e}")
        return f"Gemma Analysis: In this {diagram_type} diagram, check the equilibrium and nodal relations according to the extracted parameters."
