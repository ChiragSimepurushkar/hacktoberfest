"""Lab Twin — FastAPI backend.

Single responsibility: POST /extract
  image → classify → extract → pydantic-validate (+ retry) → JSON response
"""
import json

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.free_body import FreeBodyDiagram
from models.circuit import Circuit
from models.state_machine import StateMachine
from services.gemma import classify_image, extract_diagram, MAX_RETRIES
from services.preprocess import preprocess_image

app = FastAPI(title="Lab Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

_SCHEMA_MAP = {
    "free_body":     FreeBodyDiagram,
    "circuit":       Circuit,
    "state_machine": StateMachine,
}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract(image: UploadFile = File(...)):
    image_bytes = await image.read()
    if not image_bytes:
        return {"status": "error", "message": "Uploaded image file is empty."}

    # Preprocess image (EXIF rotate, contrast, sharpness)
    try:
        processed_bytes = preprocess_image(image_bytes)
    except Exception:
        # Fall back to raw bytes if preprocessing fails on unconventional format
        processed_bytes = image_bytes

    # 1. Classify
    try:
        diagram_type = classify_image(processed_bytes)
    except Exception as exc:
        return {"status": "error", "message": f"Classification failed: {exc}"}

    if diagram_type not in _SCHEMA_MAP:
        return {"status": "unsupported", "message": "No recognizable free-body, circuit, or state-machine diagram found."}

    # 2. Get schema for this type
    model_cls = _SCHEMA_MAP[diagram_type]
    schema_json = json.dumps(model_cls.model_json_schema())

    # 3. Extract + validate with self-repair retry
    last_error = ""
    for attempt in range(MAX_RETRIES + 1):
        try:
            raw = extract_diagram(diagram_type, processed_bytes, schema_json, error_feedback=last_error)
        except Exception as exc:
            last_error = str(exc)
            continue

        if isinstance(raw, dict) and "needs_clarification" in raw:
            return {
                "status": "needs_clarification",
                "message": raw["needs_clarification"],
            }

        try:
            validated = model_cls.model_validate(raw)
            return {
                "status": "ok",
                "diagram_type": diagram_type,
                "data": validated.model_dump(by_alias=True),
            }
        except Exception as exc:
            last_error = str(exc)

    return {
        "status": "error",
        "message": f"Could not extract valid structure after {MAX_RETRIES} retries.",
        "last_error": last_error,
    }
