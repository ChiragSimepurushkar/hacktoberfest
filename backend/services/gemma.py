"""Gemma 4 service — classify and extract diagrams via the Gemini API."""
import json
import os
from functools import lru_cache

from google import genai
from google.genai import types
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

_MODEL_NAME = os.getenv("GEMMA_MODEL", "gemma-4-12b-it")


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    """Initialise and cache the Gemini client once per process."""
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def _image_mime(image_bytes: bytes) -> str:
    """Detect image MIME type from magic bytes (imghdr removed in Python 3.13)."""
    if image_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if image_bytes[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"  # safe default for camera shots


def _image_part(image_bytes: bytes) -> types.Part:
    """Build an inline-data Part from raw image bytes."""
    return types.Part.from_bytes(data=image_bytes, mime_type=_image_mime(image_bytes))


def classify_image(image_bytes: bytes) -> str:
    """Return one of: free_body | circuit | state_machine | unsupported."""
    client = _get_client()
    response = client.models.generate_content(
        model=_MODEL_NAME,
        contents=[CLASSIFY_PROMPT, _image_part(image_bytes)],
        config=types.GenerateContentConfig(
            temperature=0.0,
            max_output_tokens=16,
        ),
    )
    result = (response.text or "").strip().lower()
    # Guard against any extra punctuation / whitespace the model may add
    for candidate in VALID_TYPES:
        if candidate in result:
            return candidate
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
    Pass error_feedback on retries to trigger the self-repair path.
    """
    base_prompt = _EXTRACTION_PROMPTS[diagram_type]

    repair_section = ""
    if error_feedback:
        repair_section = (
            "\n\nPREVIOUS ATTEMPT FAILED SCHEMA VALIDATION.\n"
            f"Validation error: {error_feedback}\n"
            "Fix the error and return corrected JSON only."
        )

    prompt = base_prompt.format(schema=schema_json, error_feedback=repair_section)

    client = _get_client()
    response = client.models.generate_content(
        model=_MODEL_NAME,
        contents=[prompt, _image_part(image_bytes)],
        config=types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )
    text = (response.text or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)
