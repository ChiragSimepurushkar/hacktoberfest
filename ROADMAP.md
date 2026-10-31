# Lab Twin — Roadmap

> Companion to [`LAB_TWIN_PLAN.md`](./LAB_TWIN_PLAN.md) (full architecture) and
> [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) (who builds what, and
> how the three tracks stay parallel). This file tracks **milestones** —
> what "done" looks like at each stage, from first commit to stretch goals
> beyond the hackathon.

## Milestones

| Milestone | Definition of done |
|---|---|
| **M0 — Contract Lock** | Schema v1 finalized for all 3 diagram types (including the `audit` block); 3 hand-written fixture JSON files committed to `fixtures/` |
| **M1 — Standalone proof** | Each track works independently: Dev A's prompts return valid JSON on real sample photos; Dev B's compilers render fixtures into working sims; Dev C's canvas shell mounts fixture-driven sims and shows the Insight panel |
| **M2 — First vertical slice** | One diagram type fully integrated end-to-end: live photo → Gemma classify/extract → validated JSON → deterministic compiler → interactive canvas, with real (not fixture) data |
| **M3 — Full integration** | All 3 diagram types (free-body, circuit, state machine) working end-to-end with live photos |
| **M4 — Insight Layer live** | `audit` block wired from real Gemma output into the "Gemma's Analysis" panel and per-slider inference-trace tooltips |
| **M5 — Demo hardening** | 2–3 backup photos validated per diagram type; all failure modes (blurry image, unsupported diagram, schema-validation failure, API timeout) tested and fail honestly; deployment finalized on Render/DigitalOcean with a `.tech` domain |
| **M6+ — Stretch (post-MVP)** | See below — only after M0–M5 are solid |

M0–M5 are the hackathon-day critical path. M6+ is explicitly out of scope
until the live demo is reliable — don't pull stretch work forward at the
expense of M5.

## Stretch Goals (M6+)

Ordered roughly by effort-to-impact ratio, cheapest first:

1. **Additional diagram types** — e.g. simple pulley systems, projectile
   motion trajectories — once the 3 core types are solid and have spare
   capacity. Each new type is additive (new schema + new compiler + new
   prompt), doesn't touch existing types.
2. **Shareable simulation links** — persist the extracted JSON server-side and
   generate a replay URL, so a simulation can be reopened without rescanning
   the photo.
3. **Multi-page notebook support** — stitch several photographed pages into
   one continuous simulation session (e.g. a multi-step derivation or a
   multi-state automaton spread across pages).
4. **Voice narration** — open-source TTS (Piper/Coqui) narrating the
   `concept_explanation` and `detected_issues` from the Insight Layer, synced
   to key simulation events.

## Risk Checkpoints Along the Way

These aren't separate milestones, but are worth explicitly re-checking at each
stage so risk doesn't silently accumulate:

- **At M1:** if Dev A's handwriting extraction accuracy is weak on real
  photos, decide now whether to add an image preprocessing pass
  (contrast/deskew) — don't discover this at M3.
- **At M3:** confirm all 3 types have been tested against at least one
  genuinely messy (not clean/printed) handwritten sample each.
- **At M5:** rehearse the actual demo script end-to-end at least once,
  including one live (non-backup) photo, before presenting to judges.

## Out of Scope for This Hackathon

Explicitly deferred, to keep M0–M5 achievable:

- Free-form/unconstrained diagram types beyond the 3 supported
- Server-side persistence of user accounts/history (Backboard/Paper
  Instruments integration is a sponsor-credit nice-to-have, not core path)
- Any LLM-generated, directly-executed code (see `LAB_TWIN_PLAN.md` section 2
  — this is a permanent architectural boundary, not a time-boxed cut)
