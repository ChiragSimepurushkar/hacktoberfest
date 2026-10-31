"""Lab Twin — FastAPI backend.

Endpoints:
  POST /extract: image → classify → extract → pydantic-validate (+ retry) → JSON response
  POST /chat: diagram_type + diagram_data + question → Gemma 4 tutor explanation
"""
import json
from pydantic import BaseModel

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.free_body import FreeBodyDiagram
from models.circuit import Circuit
from models.state_machine import StateMachine
from services.gemma import classify_image, extract_diagram, chat_tutor, MAX_RETRIES

app = FastAPI(title="Lab Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


class ChatRequest(BaseModel):
    diagram_type: str
    diagram_data: dict = {}
    question: str
    history: list = []


@app.post("/chat")
def chat(req: ChatRequest):
    """Interactive AI lab tutor powered by Gemma 4."""
    answer = chat_tutor(
        diagram_type=req.diagram_type,
        diagram_data=req.diagram_data,
        question=req.question,
        history=req.history
    )
    return {"status": "ok", "answer": answer}


@app.post("/extract")
async def extract(image: UploadFile = File(...)):
    image_bytes = await image.read()
    print(f"\n[POST /extract] Received image of {len(image_bytes)} bytes ({image.filename})")

    # 1. Classify
    diagram_type = classify_image(image_bytes)
    print(f"[POST /extract] Detected diagram_type: {diagram_type}")
    if diagram_type not in _SCHEMA_MAP:
        return {"status": "unsupported", "message": f"No recognised diagram type found (detected: {diagram_type})."}

    # 2. Get schema for this type
    model_cls = _SCHEMA_MAP[diagram_type]
    schema_json = json.dumps(model_cls.model_json_schema())

    # 3. Extract + validate with self-repair retry
    last_error = ""
    for attempt in range(MAX_RETRIES + 1):
        print(f"[POST /extract] Extraction attempt {attempt + 1}/{MAX_RETRIES + 1}...")
        try:
            raw = extract_diagram(diagram_type, image_bytes, schema_json, error_feedback=last_error)
            validated = model_cls.model_validate(raw)
            print(f"[POST /extract] Successfully validated {diagram_type}!")
            return {
                "status": "ok",
                "diagram_type": diagram_type,
                "data": validated.model_dump(by_alias=True),
            }
        except Exception as exc:
            last_error = str(exc)
            print(f"[POST /extract] Attempt {attempt + 1} validation failed: {last_error}")

    return {
        "status": "error",
        "message": f"Could not extract valid structure after {MAX_RETRIES} retries.",
        "last_error": last_error,
    }
