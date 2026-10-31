# Lab Twin: Handwritten Notebook → Live Interactive Simulation

**Track:** Best Open-Source AI Project — Hacktoberfest Hack Day, Margao (MLH x Don Bosco College of Engineering)
**Core model:** Gemma 4 (`gemma-4-31b-it` / `gemma-4-12b-it`), multimodal, via the Gemini API

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Design Principle](#2-core-design-principle)
3. [Scope](#3-scope--3-supported-diagram-types-only)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Component Responsibilities](#5-component-responsibilities)
6. [Request Lifecycle (Sequence)](#6-request-lifecycle-sequence)
7. [JSON Schemas Per Type](#7-json-schemas-per-type)
8. [Prompt Design](#8-prompt-design)
8a. [Gemma Insight Layer — Showcasing Model Reasoning](#8a-gemma-insight-layer--showcasing-model-reasoning)
9. [API Contract](#9-api-contract)
10. [Simulation Engines Per Type](#10-simulation-engines-per-type)
11. [Open-Source Dependencies](#11-open-source-dependencies)
12. [Failure Modes & Handling](#12-failure-modes--handling)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Team Split](#14-team-split-3-people)
15. [Implementation Plan & Roadmap](#15-implementation-plan--roadmap)
16. [Testing Strategy](#16-testing-strategy)
17. [Sponsor Stack Integration](#17-sponsor-stack-integration)
18. [Judging Criteria Alignment](#18-judging-criteria-alignment)
19. [Demo Risk Mitigation](#19-demo-risk-mitigation)
20. [Stretch Goals / Roadmap](#20-stretch-goals--roadmap)
21. [Glossary](#21-glossary)

---

## 1. Executive Summary

Lab Twin turns a photo of a handwritten notebook page into a **live, manipulable
simulation** — not a video, not a static diagram. A student (or judge) photographs
a free-body diagram, a circuit sketch, or a state-machine dry-run; Gemma 4 reads
the handwriting and diagram structure and extracts it into strict JSON; a
deterministic compiler feeds that JSON into a real open-source simulation engine
(a physics engine, a circuit solver, or a graph library); the result is rendered
in the browser as something you can drag, edit, and step through in real time.

The central design bet is that **the model's job stays narrow** (multimodal
image+text understanding → structured JSON) while **all "running" behavior lives
in established, well-tested open-source engines**, not in code the model
generates and we execute blindly. This makes the system both more reliable under
demo conditions and a cleaner fit for the "adapted open-source model harness"
category of the track.

## 2. Core Design Principle

> Gemma observes and structures. Open-source engines simulate. The frontend lets
> you touch it.

This separation is the single most important decision in the architecture, and
every other choice follows from it:

- **Gemma never generates or executes code.** It only ever returns JSON matching
  a schema we define (`response_mime_type=application/json`). This eliminates the
  need for sandboxing untrusted code execution entirely — a real security and
  reliability concern that a code-generating approach (e.g. an LLM writing Manim
  or Three.js scripts per request) would otherwise require.
- **Simulation state is owned by a real engine** (Matter.js/Cannon-es for
  physics, CircuitJS for circuits, Cytoscape.js/D3 for graphs), not by
  hand-rolled physics or math in our own code. These engines are tested,
  documented, and handle edge cases (collisions, friction, circuit topology,
  graph layout) far better than anything written from scratch in a few hours.
- **Interactivity happens entirely client-side after extraction.** Once the JSON
  is extracted and validated, no further model calls are needed to drag a force
  arrow or edit a resistor value — the local engine recomputes instantly. This
  keeps the live demo fast and immune to API latency/outages after the initial
  photo is processed.

## 3. Scope — 3 supported diagram types only

Keeping scope narrow keeps failure modes narrow and predictable, and leaves room
for solid, tested templates instead of "any sketch becomes any simulation."

| # | Diagram type | Subject area | Output interaction |
|---|---|---|---|
| 1 | Free-body diagram | Physics | Drag force vectors, see net force/acceleration update live |
| 2 | Basic circuit | Physics/EE | Edit component values, see current/voltage update live |
| 3 | State machine / flowchart | CS / algorithms | Step through transitions via input symbols |

Anything that doesn't classify into one of these three is reported to the user as
**unsupported** rather than guessed at — a clear, honest failure is better than a
wrong simulation in a judged demo.

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENT (React)                                                       │
│  ┌───────────────┐   ┌───────────────────────────────────────────┐  │
│  │ Upload/Capture │→ │ Interactive Canvas (react-three-fiber +    │  │
│  │ UI             │   │ Matter.js / CircuitJS / Cytoscape.js)      │  │
│  └───────────────┘   └───────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ POST /extract (image)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI)                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ Classify     │→ │ Extract      │→ │ Schema Validation          │   │
│  │ (Gemma 4)    │  │ (Gemma 4)    │  │ (pydantic) + retry loop    │   │
│  └─────────────┘  └──────────────┘  └───────────────┬───────────┘   │
└──────────────────────────────────────────────────────┼──────────────┘
                                                         │ validated JSON
                                                         ▼
                                          ┌──────────────────────────┐
                                          │ Response → client         │
                                          │ (schema-typed JSON only,  │
                                          │  no code, no HTML)        │
                                          └──────────────────────────┘
```

The client owns all simulation runtime; the backend's only job is
**photo → validated JSON**. This keeps the backend stateless and simple, and
means the "simulation" the user interacts with is really running in their
browser via the open-source engine, not on a server.

## 5. Component Responsibilities

| Component | Owns | Does NOT own |
|---|---|---|
| Upload/Capture UI | Image capture, preview, submit | Any AI calls |
| Backend API (FastAPI) | Orchestrating classify → extract → validate, retry logic | Rendering, simulation |
| Gemma 4 (Classify) | Diagram-type detection from image | Parameter extraction |
| Gemma 4 (Extract) | Structured parameter extraction into JSON | Simulation, rendering |
| Schema Validator (pydantic) | Enforcing JSON shape, triggering repair retries | Semantic correctness of physics |
| Deterministic Compiler | Mapping validated JSON → engine-specific config | AI reasoning |
| Simulation Engine (Matter.js/CircuitJS/Cytoscape.js) | All runtime physics/circuit/graph behavior | Image understanding |
| Frontend Canvas | Rendering, user interaction, slider/control binding | AI calls after initial extraction |

## 6. Request Lifecycle (Sequence)

1. User photographs/uploads a notebook page in the client.
2. Client `POST`s the image to the backend `/extract` endpoint.
3. Backend calls Gemma 4 with a **classification prompt** → returns one of
   `free_body | circuit | state_machine | unsupported`.
4. If `unsupported`, backend returns an error immediately — no extraction
   attempted.
5. Backend calls Gemma 4 again with a **type-specific extraction prompt**
   (includes few-shot examples + the target JSON schema) and
   `response_mime_type=application/json`.
6. Backend validates the response against the pydantic schema for that type.
   - **Valid** → proceed to step 7.
   - **Invalid** → re-prompt Gemma once, appending the validation error message
     to the prompt ("self-repair" loop). Max 2 retries total; if still invalid,
     return a structured error to the client.
7. Backend returns the validated JSON to the client.
8. Client's deterministic compiler maps the JSON into engine-specific
   configuration (e.g., Matter.js body/constraint definitions) and mounts the
   interactive canvas.
9. From this point on, all interaction (dragging forces, editing resistor
   values, stepping transitions) is handled **entirely client-side** by the
   simulation engine — no further backend/model calls.

## 7. JSON Schemas Per Type

Every schema below also carries an `audit` block — see
[section 8a](#8a-gemma-insight-layer--showcasing-model-reasoning) for what it's
for and why it's included.

### Free-body diagram
```json
{
  "mass": 2.5,
  "forces": [
    { "label": "gravity", "magnitude": 24.5, "angle": 270, "anchor": "center" },
    { "label": "normal", "magnitude": 24.5, "angle": 90, "anchor": "base" },
    { "label": "applied", "magnitude": 10, "angle": 30, "anchor": "center" }
  ],
  "surface": "incline",
  "friction_coeff": 0.3,
  "audit": {
    "concept_explanation": "Block on a frictionless incline under gravity, normal force, and an applied force along the surface.",
    "detected_issues": [
      { "severity": "error", "location": "force balance",
        "issue": "Stated forces don't satisfy equilibrium for a static block on this incline.",
        "suggested_fix": "Normal force should be mg·cos(θ) ≈ 21.2N, not 24.5N as drawn." }
    ],
    "inference_trace": [
      { "field": "forces[2].magnitude", "source": "inferred",
        "reasoning": "No value labeled; arrow length is ~40% of the gravity arrow, so estimated proportionally." }
    ]
  }
}
```

### Circuit
```json
{
  "components": [
    { "type": "battery", "value": 9, "node_a": "A", "node_b": "B" },
    { "type": "resistor", "value": 220, "node_a": "B", "node_b": "C" },
    { "type": "resistor", "value": 330, "node_a": "C", "node_b": "A" }
  ],
  "source": "battery_1",
  "audit": {
    "concept_explanation": "Series resistor network driven by a 9V battery.",
    "detected_issues": [],
    "inference_trace": [
      { "field": "components[1].value", "source": "read_directly",
        "reasoning": "220 labeled explicitly next to the resistor symbol." }
    ]
  }
}
```

### State machine
```json
{
  "states": ["q0", "q1", "q2"],
  "transitions": [
    { "from": "q0", "to": "q1", "label": "0" },
    { "from": "q1", "to": "q2", "label": "1" }
  ],
  "initial": "q0",
  "accepting": ["q2"],
  "audit": {
    "concept_explanation": "DFA accepting strings matching pattern '0' followed by '1'.",
    "detected_issues": [
      { "severity": "warning", "location": "state q2",
        "issue": "No outgoing transition defined for input '0' or '1' from q2 — automaton is incomplete.",
        "suggested_fix": "Add a transition from q2 (or confirm q2 is a trap/accepting sink state)." }
    ],
    "inference_trace": []
  }
}
```

## 8. Prompt Design

### Classification prompt (sketch)
```
You are analyzing a photo of a handwritten notebook page.
Classify it into exactly one of: free_body, circuit, state_machine, unsupported.

Rules:
- free_body: forces drawn as arrows acting on an object, a mass, a surface.
- circuit: resistors, batteries, switches, wires, nodes.
- state_machine: labeled circles/nodes connected by arrows with transition labels.
- unsupported: anything else (plain text notes, unrelated diagrams, unreadable image).

Respond with only the category name.
```

### Extraction prompt (sketch, per type — example for free-body)
```
You are extracting a free-body diagram from a handwritten photo into JSON.

Output must match this schema exactly:
{schema}

Few-shot examples:
{2-3 worked examples: image description -> correct JSON}

Rules:
- Infer force magnitudes from labeled values; if unlabeled, estimate from
  relative arrow length and state surface/mass assumptions used.
- angle is measured in degrees, 0 = pointing right, 90 = up.
- If the image is ambiguous or illegible, return the field "needs_clarification"
  with a short description of what's unclear, instead of guessing.
```

Each diagram type gets its own extraction prompt + few-shot set, tuned
independently by Dev A. The classification step exists specifically so each
extraction prompt can stay narrow and type-specific rather than one giant prompt
trying to handle all three cases at once.

## 8a. Gemma Insight Layer — Showcasing Model Reasoning

**Problem this solves:** because the simulation itself runs on a pre-built,
hand-written engine (Matter.js/CircuitJS/Cytoscape.js), the model's actual work —
reading messy handwriting, inferring unlabeled values, understanding diagram
topology — happens invisibly before anything renders. A judge only sees "photo →
nice simulation" and can reasonably wonder how much of that is the model versus
the pre-built renderer. Making the model generate the whole simulation would fix
the visibility problem but reintroduces the reliability problem we deliberately
avoided (see section 2) — a full browser simulation is much higher-variance to
get right in one shot than a handful of structured fields.

**The fix:** extend the *same* extraction call's JSON schema with an `audit`
block, rather than adding a new model call or any executed code. This costs
nothing architecturally — same single request, same no-code-execution guarantee
— but surfaces reasoning the model already has to do internally in order to
extract correctly, instead of discarding it.

The `audit` block has three parts, included in every schema in section 7:

- **`concept_explanation`** — a short plain-language statement of what the
  diagram represents, proving the model understood the content, not just parsed
  shapes.
- **`detected_issues`** — domain-specific correctness checks run against the
  extracted structure:
  - *Free-body* → equilibrium / Newton's-second-law consistency check
  - *Circuit* → shorted-node / Kirchhoff's-law sanity check
  - *State machine* → completeness check (every state has a transition for
    every input symbol) and unreachable-state detection
  - Catching an error here is strong proof the photo is being genuinely
    understood, since a template-driven system has no way to do this.
- **`inference_trace`** — per-field notes on whether a value was `read_directly`
  (explicitly labeled in the photo) or `inferred` (estimated from visual cues,
  e.g. relative arrow length), with the model's reasoning for the estimate. This
  is also useful for calibrating trust in the simulation's starting values.

**UI treatment:** a "Gemma's Analysis" panel next to the simulation canvas shows
`concept_explanation` and `detected_issues`; `inference_trace` entries surface as
small tooltips on the corresponding sliders ("this value was inferred from arrow
length, not explicitly labeled"). The model's reasoning is visible at every
level of the UI, not just as a one-line headline.

**Demo value:** this turns "Gemma extracted the diagram" into "Gemma caught a
mistake in your physics that the student didn't notice" — a much stronger, more
memorable proof of capability than a working slider ever is on its own, and it
adds genuine product value independent of the hackathon demo (a tool that checks
your handwritten derivation for you).

## 9. API Contract

### `POST /extract`
**Request:** `multipart/form-data` with an image file.

**Response (success):**
```json
{
  "status": "ok",
  "diagram_type": "free_body",
  "data": { "...": "validated schema object (see section 7)" }
}
```

**Response (unsupported diagram):**
```json
{ "status": "unsupported", "message": "No recognizable free-body, circuit, or state-machine diagram found." }
```

**Response (extraction failed after retries):**
```json
{ "status": "error", "message": "Could not extract valid structure after 2 retries.", "last_error": "..." }
```

## 10. Simulation Engines Per Type

Rather than hand-rolling simulation math, each compiler configures a real,
established open-source engine from Gemma's JSON output. This is a stronger
"adapted open-source model harness" story for judges than custom physics code,
and each engine handles edge cases far more robustly than anything written from
scratch in a few hours.

- **Free-body** → [Matter.js](https://brm.io/matter-js/) (open-source 2D physics
  engine) or [Cannon-es](https://pmndrs.github.io/cannon-es/) (3D) is configured
  with the extracted mass/forces/surface; draggable force arrows on a Three.js
  scene feed live into the engine, which handles the actual dynamics.
- **Circuit** → [CircuitJS](https://www.falstad.com/circuit/) (open-source
  circuit simulator) or a lightweight SPICE-style solver is configured with the
  extracted components/nodes; live current/voltage readouts come from the real
  simulation, not approximated resistor math.
- **State machine** → [Cytoscape.js](https://js.cytoscape.org/) or
  [D3.js](https://d3js.org/) (open-source graph visualization/layout) renders
  the extracted states/transitions; step through transitions by entering input
  symbols, highlighting the current state.

**Important distinction:** this produces a live conceptual model, not a video.
Manim (considered in an earlier version of this idea for notes-to-video) was
deliberately dropped — it renders pre-baked frames into an MP4, with no running
state behind it once rendered. The engines above are chosen specifically because
they maintain live, interactive state that Gemma's extracted JSON can drive, so
the output is something you can manipulate indefinitely, not something you watch
once.

## 11. Open-Source Dependencies

| Layer | Library | License |
|---|---|---|
| 3D rendering | Three.js / react-three-fiber | MIT |
| 2D/3D physics | Matter.js / Cannon-es | MIT |
| Circuit simulation | CircuitJS | GPL / open-source |
| Graph visualization | Cytoscape.js or D3.js | MIT / BSD |
| Schema validation | pydantic | MIT |
| Backend framework | FastAPI | MIT |

## 12. Failure Modes & Handling

| Failure | Detection | Handling |
|---|---|---|
| Image too blurry/dark to read | Gemma returns low-confidence or `needs_clarification` | Client prompts user to retake photo |
| Diagram type not one of the 3 supported | Classification step returns `unsupported` | Immediate honest error, no guessing |
| Extracted JSON doesn't match schema | pydantic validation fails | Re-prompt Gemma with the validation error, max 2 retries |
| Gemma API latency/outage | Request timeout | Client shows retry option; pre-cached backup examples available for live demo |
| Ambiguous handwriting values | Gemma asked explicitly to flag `needs_clarification` rather than guess | Surface to user instead of silently fabricating a wrong simulation |

## 13. Non-Functional Requirements

- **Latency:** classify + extract should complete in a few seconds; all
  subsequent interaction is client-side and instantaneous (no network round
  trip per slider move).
- **Security:** no LLM-generated code is ever executed — the only trust
  boundary is "does this JSON match our schema," which pydantic enforces before
  anything reaches the simulation engines.
- **Statelessness:** the backend holds no session state between requests; each
  `/extract` call is independent, simplifying deployment and scaling.
- **Resilience:** the system fails honestly (explicit `unsupported`/`error`
  statuses) rather than silently producing a plausible-looking but wrong
  simulation.

## 14. Team Split (3 people)

### Dev A — AI pipeline
- Classification + extraction prompts, few-shot examples per diagram type
- JSON schema validation (pydantic) + retry/self-repair loop (max 2 retries)
- **Owns the hour-0 spike**: run 2–3 real handwritten photos through the
  extraction prompt immediately, before committing further. If handwriting
  accuracy is weak, add an image preprocessing pass (contrast/deskew) early
  rather than discovering it late.

### Dev B — Simulation logic
- The three deterministic compilers mapping JSON → Matter.js/Cannon-es,
  CircuitJS, and Cytoscape.js/D3 configuration
- Can build and test against hand-written mock JSON in parallel with Dev A, so
  neither is blocked on the other

### Dev C — Frontend
- Upload/capture UI
- react-three-fiber canvas rendering, sliders/controls bound to JSON params
- Deployment (Render or DigitalOcean + a `.tech` domain)

## 15. Implementation Plan & Roadmap

Moved to their own files to keep this document focused on architecture:

- **[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)** — team split, the
  contract-lock step, per-track task breakdowns for Dev A/B/C, sync
  checkpoints, and the parallelization map showing what's blocking vs.
  independent across the three tracks.
- **[`ROADMAP.md`](./ROADMAP.md)** — milestone table (M0 Contract Lock through
  M5 Demo Hardening as the hackathon-day critical path), stretch goals, and
  risk checkpoints to recheck at each stage.

## 16. Testing Strategy

- **Unit tests** on each deterministic compiler against the fixed JSON schemas
  (independent of the model — can run without any API calls).
- **Golden-set validation** for the AI pipeline: a small set of real photographed
  notebook pages per diagram type, each with a known-correct expected JSON,
  checked for schema validity and reasonable value extraction.
- **Retry-loop test**: deliberately malformed Gemma output fed into the
  validator to confirm the self-repair retry path works and terminates after 2
  attempts instead of looping indefinitely.
- **End-to-end smoke test**: photo in → interactive canvas rendered, for one
  example of each of the 3 diagram types.

## 17. Sponsor Stack Integration

- **Backboard / Paper Instruments** — pipe extracted parameters or simulation
  state into Backboard/Paper Instruments for persistence and live visualization
- **DigitalOcean** — host the open-source backend
- **.tech domain** — deploy at `labtwin.tech` or `sketch2sim.tech`

## 18. Judging Criteria Alignment

| Track requirement | How Lab Twin satisfies it |
|---|---|
| Open-source/open-weight AI is central, not decorative | Gemma 4's multimodal understanding is the only way the system knows what's in the photo — remove it and there's nothing to simulate |
| "Adapted open-source model harness" | Matter.js/Cannon-es, CircuitJS, and Cytoscape.js/D3 are real open-source engines Gemma's output configures and drives |
| Originality | Handwritten-sketch-to-live-simulation (not video, not static diagram) has few direct precedents |
| Technical depth | Multimodal extraction + schema validation/repair loop + per-domain simulation engines is a genuinely multi-part system, not a thin API wrapper |
| Model capability is visibly demonstrated, not just inferred | The [Gemma Insight Layer](#8a-gemma-insight-layer--showcasing-model-reasoning) surfaces concept understanding, domain-correctness checks, and per-value inference reasoning directly in the UI — proof the model is doing real work, not just OCR-and-template-fill |

## 19. Demo Risk Mitigation

- Narrow 3-type scope keeps failures predictable
- Keep 2–3 pre-validated notebook photos as backup if a live photo doesn't
  extract cleanly
- Show at least one genuinely live photo-to-simulation run — judges value
  seeing it's not faked
- Lead with the honest-failure behavior if asked about edge cases ("if it can't
  read it confidently, it tells you, rather than guessing") — turns a limitation
  into a credibility point

## 20. Stretch Goals / Roadmap

Moved to [`ROADMAP.md`](./ROADMAP.md) — see the Stretch Goals (M6+) section
there.

## 21. Glossary

- **Classify step** — the first Gemma call that determines which of the 3
  supported diagram types (or "unsupported") a photo represents.
- **Extract step** — the second Gemma call that pulls structured parameters out
  of the photo into JSON, specific to the classified diagram type.
- **Deterministic compiler** — hand-written code (not LLM-generated) that maps
  validated JSON into configuration for a simulation engine.
- **Self-repair loop** — the retry mechanism where a schema-validation failure
  is fed back to Gemma as an error message, asking it to correct its own output.
- **Conceptual model vs. video** — a conceptual model has live, manipulable
  state (this project); a video is a fixed sequence of frames with no runtime
  behavior (e.g. Manim output).
