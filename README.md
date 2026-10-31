# Lab Twin
### Handwritten Notebook → Live Interactive Simulation

Photo a free-body diagram, circuit sketch, or state machine — Gemma 4 reads it and turns it into a live, interactive simulation in your browser.

## Stack

| Layer | Tech |
|---|---|
| AI model | Gemma 4 via Gemini API |
| Backend | FastAPI + Pydantic |
| Frontend | React + react-three-fiber |
| Physics | Matter.js / Cannon-es |
| Circuit | CircuitJS |
| Graphs | Cytoscape.js / D3.js |
| Deploy | Render / DigitalOcean + `.tech` domain |

## Structure

```
├── backend/
│   ├── main.py              # FastAPI app — POST /extract
│   ├── models/              # Pydantic schemas per diagram type
│   ├── prompts/             # Classify + extraction prompts for Gemma
│   └── services/gemma.py    # Gemini API calls
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/      # Upload, AnalysisPanel, ParamSlider
│       ├── engines/         # Deterministic compilers (JSON → engine config)
│       └── renderers/       # Three.js / SVG / Cytoscape renderers
├── fixtures/                # Hand-written mock JSON (build without live AI)
└── docs/                    # Full architecture & roadmap
```

## Quick Start

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Supported Diagram Types
| Type | What you can do |
|---|---|
| `free_body` | Drag force vectors, see net force update live |
| `circuit` | Edit component values, see current/voltage live |
| `state_machine` | Step through transitions via input symbols |

See [`docs/LAB_TWIN_PLAN.md`](docs/LAB_TWIN_PLAN.md) for full architecture.
