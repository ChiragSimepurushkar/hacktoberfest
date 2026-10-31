"""Gemma 4 service — classify and extract diagrams via the Gemini API."""
import json
import os
import io
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

def classify_image(image_bytes: bytes) -> str:
    """Return one of: free_body | circuit | state_machine | unsupported."""
    client = _get_client()
    model_name = _get_model_name()
    pil_image = Image.open(io.BytesIO(image_bytes))

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[pil_image, CLASSIFY_PROMPT],
            config=types.GenerateContentConfig(
                temperature=0.0
            )
        )
        cat = response.text.strip().lower()
        for valid in VALID_TYPES:
            if valid in cat:
                return valid
        return "unsupported"
    except Exception as e:
        print(f"Classification error: {e}")
        return "unsupported"


def extract_diagram(
    diagram_type: str,
    image_bytes: bytes,
    schema_json: str,
    error_feedback: str = "",
) -> dict:
    """
    Call Gemma with the type-specific extraction prompt.
    Returns the parsed JSON dict (not yet validated against pydantic).
    Pass error_feedback to trigger the self-repair path on retries.
    """
    client = _get_client()
    model_name = _get_model_name()
    pil_image = Image.open(io.BytesIO(image_bytes))

    prompt_template = _EXTRACTION_PROMPTS.get(diagram_type, FREE_BODY_EXTRACTION_PROMPT)
    feedback_str = f"PREVIOUS VALIDATION ERROR:\n{error_feedback}\nPlease correct the JSON output." if error_feedback else ""
    full_prompt = prompt_template.format(schema=schema_json, error_feedback=feedback_str)

    response = client.models.generate_content(
        model=model_name,
        contents=[pil_image, full_prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1
        )
    )

    text = response.text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


def chat_tutor(diagram_type: str, diagram_data: dict, question: str, history: list = None) -> str:
    """Ask Gemma 4 questions about the diagram, physics, circuits, or state machines."""
    client = _get_client()
    model_name = _get_model_name()

    prompt = f"""You are Gemma 4, an open-source AI engineering lab tutor for the Lab Twin project.
The student has uploaded and analyzed a handwritten {diagram_type} diagram from their notebook.
Here is the extracted parameters and audit data from the diagram:
{json.dumps(diagram_data, indent=2)}

Student Question: {question}

Provide an educational, clear, friendly explanation in plain conversational text only.
- Do NOT use any markdown formatting. No asterisks for bold, no ## headers, no - bullet dashes, no backticks, no LaTeX dollar signs.
- Use plain numbered sentences or short paragraphs instead of bullet lists.
- Detail the physical formulas or circuit laws (Ohm's Law, Kirchhoff's Laws, Newton's Laws) step-by-step in plain text.
- If there are errors or discrepancies in the student's notebook or values, point them out gently and show how to calculate the correct values.
- Write naturally, as a friendly tutor would speak.
"""
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.3
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Chat error: {e}")
        return f"Gemma Analysis: In this {diagram_type} diagram, check the equilibrium and nodal relations according to the extracted parameters."
