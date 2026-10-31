import { z } from 'zod';

/* ──────────────────────────────────────────────────────────────────────────
   Zod schemas — mirror the Python pydantic models
   ────────────────────────────────────────────────────────────────────────── */

const InferenceTraceEntry = z.object({
  field:     z.string(),
  source:    z.enum(['read_directly', 'inferred', 'computed']),
  reasoning: z.string(),
});

const DetectedIssue = z.object({
  severity:      z.enum(['error', 'warning', 'info']),
  location:      z.string(),
  issue:         z.string(),
  suggested_fix: z.string().optional(),
});

const Audit = z.object({
  concept_explanation: z.string(),
  detected_issues:     z.array(DetectedIssue).default([]),
  inference_trace:     z.array(InferenceTraceEntry).default([]),
});

// Free-body
const Force = z.object({
  label:     z.string(),
  magnitude: z.number(),
  angle:     z.number(),
  anchor:    z.string().optional(),
});

export const FreeBodySchema = z.object({
  mass:           z.number(),
  forces:         z.array(Force),
  surface:        z.string().optional(),
  friction_coeff: z.number().optional(),
  audit:          Audit,
});

// Circuit
const Component = z.object({
  type:   z.string(),
  value:  z.number(),
  node_a: z.string(),
  node_b: z.string(),
  label:  z.string().optional(),
});

export const CircuitSchema = z.object({
  components: z.array(Component),
  source:     z.string().optional(),
  audit:      Audit,
});

// State machine
const Transition = z.object({
  from:  z.string(),
  to:    z.string(),
  label: z.string(),
});

export const StateMachineSchema = z.object({
  states:      z.array(z.string()),
  transitions: z.array(Transition),
  initial:     z.string(),
  accepting:   z.array(z.string()),
  audit:       Audit,
});

// Response envelope
export const ExtractResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status:       z.literal('ok'),
    diagram_type: z.enum(['free_body', 'circuit', 'state_machine']),
    data:         z.union([FreeBodySchema, CircuitSchema, StateMachineSchema]),
  }),
  z.object({
    status:  z.literal('unsupported'),
    message: z.string(),
  }),
  z.object({
    status:     z.literal('error'),
    message:    z.string(),
    last_error: z.string().optional(),
  }),
]);

/**
 * Parse an API response with zod. Returns { ok, data } | { ok: false, error }.
 */
export function parseResponse(raw) {
  const result = ExtractResponseSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  console.error('[schema] parse failed:', result.error.format());
  return { ok: false, error: 'We got an unexpected response from the server.' };
}
