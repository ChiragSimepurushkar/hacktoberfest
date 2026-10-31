# Lab Twin — Implementation Plan

> Companion to [`LAB_TWIN_PLAN.md`](./LAB_TWIN_PLAN.md) (full architecture,
> schemas, prompts, API contract). This file covers **who builds what, in what
> order, and how the three tracks stay unblocked from each other.**

## Team Split (3 people)

### Dev A — AI Pipeline
- Classification + extraction prompts, few-shot examples per diagram type
- JSON schema validation (pydantic) + self-repair retry loop (max 2 retries)
- Audit/insight prompting (`concept_explanation`, `detected_issues`,
  `inference_trace`)
- Owns the hour-0 handwriting spike (see Step 0 below)

### Dev B — Simulation Engines
- Deterministic compilers mapping JSON → Matter.js/Cannon-es, CircuitJS, and
  Cytoscape.js/D3 configuration
- A common mount interface so the frontend never needs to know which engine is
  active underneath

### Dev C — Frontend
- Upload/capture UI, canvas shell (react-three-fiber), "Gemma's Analysis" panel
- Slider/control UI bound to Dev B's mount interface
- Deployment pipeline (Render/DigitalOcean + `.tech` domain)

## The Core Parallelization Lever: Lock the Contract First

The single biggest lever for parallelism is the **JSON contract** between all
three tracks. Once it's locked and backed by real fixture files, Dev B and
Dev C never need to wait on Dev A's actual Gemma integration to make progress
— they build and test against fixtures from minute one. Swapping fixtures for
live model output becomes a small, low-risk step late in the process, not a
dependency the whole team sits around waiting on.

## Step 0 — Contract Lock (all three, ~20–30 min, together)

- Finalize JSON schema v1 for all 3 diagram types, including the `audit` block.
- Agree on the `/extract` API request/response shape.
- **Dev A immediately hand-writes 3 fixture JSON files** (one per diagram type,
  matching the schema exactly, including realistic `audit` content) and commits
  them to a shared `fixtures/` directory. This one artifact is what unlocks
  every other track below.

Nobody writes implementation code before this step completes — it's kept short
by design specifically so the three parallel tracks below can start
immediately afterward with zero ambiguity about the interface between them.

## Track A — AI Pipeline (Dev A)

Independent sub-tasks, can be built and tested in any order:

1. Classification prompt — test against sample photos
2. Extraction prompt + few-shot examples: free-body
3. Extraction prompt + few-shot examples: circuit
4. Extraction prompt + few-shot examples: state machine
5. Pydantic schema + validation for each type
6. Self-repair retry loop (max 2 retries)
7. Audit/insight prompting per type
8. Wire the FastAPI `/extract` endpoint tying 1–7 together
9. **Swap fixtures for live calls** once the endpoint is solid → triggers
   Checkpoint 2 (first real integration)

## Track B — Simulation Engines (Dev B)

Builds entirely against the Step 0 fixtures — never blocked on Track A:

1. Matter.js/Cannon-es compiler: JSON → physics scene config (free-body)
2. CircuitJS compiler: JSON → circuit config (circuit)
3. Cytoscape.js/D3 compiler: JSON → graph config (state machine)
4. Unit tests for each compiler against the fixture JSON (no API calls needed —
   fully offline-testable)
5. A common mount interface exposed to the frontend, e.g.:
   ```
   mount(container, compiledScene) -> { onParamChange, destroy }
   ```
   so Dev C never needs to know which engine is active underneath

## Track C — Frontend (Dev C)

Also builds entirely against the Step 0 fixtures:

1. Upload/capture UI (camera + file upload)
2. Generic canvas shell (react-three-fiber scaffold) with routing between the
   3 renderer types based on `diagram_type`
3. "Gemma's Analysis" panel — build against fixture `audit` data first
4. Slider/control UI bound to Dev B's common mount interface
5. Deployment pipeline (Render/DigitalOcean) stood up immediately with a
   placeholder app, so deployment is never a last-minute scramble

## Sync Checkpoints (short, ~10–15 min, roughly every 90 min)

Short, frequent checkpoints catch integration drift early without forcing
anyone to sit idle waiting for another track — this replaces a single risky
"big bang" integration phase at the end.

| Checkpoint | What's confirmed |
|---|---|
| 1 | Fixtures finalized and committed; all 3 tracks confirmed building against them |
| 2 | Track A's live `/extract` returns valid JSON for at least 1 type; Track B's compiler renders that fixture shape into a working sim; Track C's shell mounts Track B's output — first type is end-to-end integrated |
| 3 | All 3 diagram types integrated end-to-end (live photo → live interactive sim) |
| 4 | Insight Layer wired end-to-end from real Gemma output into the "Gemma's Analysis" panel; polish begins |

## Parallelization Map

What's blocking vs. independent, made explicit:

| Task | Depends on | Can start |
|---|---|---|
| JSON schema v1 + fixtures | Nothing | Immediately (Step 0, all three) |
| Classification/extraction prompts (A) | Fixtures (for schema shape only) | Immediately after Step 0 |
| Simulation compilers (B) | Fixtures | Immediately after Step 0, in parallel with A |
| Upload UI + canvas shell (C) | Fixtures | Immediately after Step 0, in parallel with A and B |
| Live Gemma integration (A) | A's own prompt work | After A's prompts are individually validated |
| Wiring B's compiler output into C's canvas | B's mount interface + C's shell | As soon as both exist — can happen before A's live integration, using fixtures |
| Wiring real Gemma output end-to-end | A's live integration + the B↔C wiring above | Checkpoint 2 |
| Insight Layer UI | C's panel (buildable against fixtures early) + A's audit prompting (live) | Panel UI immediately; live data at Checkpoint 4 |

**The key pattern:** almost nothing is blocked on Track A's live model
integration except the very final swap-in. B and C can reach a fully working,
demoable state using fixtures alone, which means Track A's AI work — the
highest-risk, highest-variance piece — has the rest of the team's work already
done and waiting for it, rather than the rest of the team waiting on it.

## Testing Strategy

- **Unit tests** on each deterministic compiler against the fixed JSON schemas
  (independent of the model — can run without any API calls).
- **Golden-set validation** for the AI pipeline: a small set of real
  photographed notebook pages per diagram type, each with a known-correct
  expected JSON, checked for schema validity and reasonable value extraction.
- **Retry-loop test**: deliberately malformed Gemma output fed into the
  validator to confirm the self-repair retry path works and terminates after 2
  attempts instead of looping indefinitely.
- **End-to-end smoke test**: photo in → interactive canvas rendered, for one
  example of each of the 3 diagram types.
