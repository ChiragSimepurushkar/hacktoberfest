"""Gemma 4 service — classify and extract diagrams via the Gemini API."""
import json
import os

import google.generativeai as genai
from dotenv import load_dotenv

from prompts.classify import CLASSIFY_PROMPT, VALID_TYPES
from prompts.free_body import FREE_BODY_EXTRACTION_PROMPT
from prompts.circuit import CIRCUIT_EXTRACTION_PROMPT
from prompts.state_machine import STATE_MACHINE_EXTRACTION_PROMPT

load_dotenv()

MAX_RETRIES = 2

_EXTRACTION_PROMPTS = {
    "free_body":     FREE_BODY_EXTRACTION_PROMPT,
    "circuit":       CIRCUIT_EXTRACTION_PROMPT,
    "state_machine": STATE_MACHINE_EXTRACTION_PROMPT,
}

# TODO: initialise once at startup
def _get_model() -> genai.GenerativeModel:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    return genai.GenerativeModel(model_name=os.getenv("GEMMA_MODEL", "gemma-4-12b-it"))


def classify_image(image_bytes: bytes) -> str:
    """Return one of: free_body | circuit | state_machine | unsupported."""
    # TODO: implement — call Gemma with CLASSIFY_PROMPT + image_bytes
    raise NotImplementedError


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
    # TODO: implement
    # 1. Build prompt = _EXTRACTION_PROMPTS[diagram_type].format(schema=schema_json, error_feedback=...)
    # 2. Call model with response_mime_type="application/json"
    # 3. Return json.loads(response.text)
    raise NotImplementedError
