import { z } from 'zod';

/* ──────────────────────────────────────────────────────────────────────────
   Zod schemas — mirror the Python pydantic models with loose passthrough
   ────────────────────────────────────────────────────────────────────────── */

const InferenceTraceEntry = z.object({
  field:     z.string(),
  source:    z.string(),
  reasoning: z.string(),
}).passthrough();

const DetectedIssue = z.object({
  severity:      z.string(),
  location:      z.string(),
  issue:         z.string(),
  suggested_fix: z.string().optional(),
}).passthrough();

const Audit = z.object({
  concept_explanation: z.string().optional().default(''),
  detected_issues:     z.array(DetectedIssue).default([]),
  inference_trace:     z.array(InferenceTraceEntry).default([]),
}).passthrough();

// Free-body
const Force = z.object({
  label:     z.string(),
  magnitude: z.number(),
  angle:     z.number(),
  anchor:    z.string().optional(),
}).passthrough();

export const FreeBodySchema = z.object({
  mass:           z.number(),
  forces:         z.array(Force),
  surface:        z.string().optional(),
  friction_coeff: z.number().optional(),
  audit:          Audit.optional(),
}).passthrough();

// Circuit
const Component = z.object({
  type:   z.string(),
  value:  z.number(),
  node_a: z.string().optional(),
  node_b: z.string().optional(),
  label:  z.string().optional(),
}).passthrough();

export const CircuitSchema = z.object({
  components: z.array(Component),
  source:     z.string().optional(),
  audit:      Audit.optional(),
}).passthrough();

// State machine
const Transition = z.object({
  from:  z.string(),
  to:    z.string(),
  label: z.string(),
}).passthrough();

export const StateMachineSchema = z.object({
  states:      z.array(z.string()),
  transitions: z.array(Transition),
  initial:     z.string(),
  accepting:   z.array(z.string()),
  audit:       Audit.optional(),
}).passthrough();

// Response envelope
export const ExtractResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status:       z.literal('ok'),
    diagram_type: z.enum(['free_body', 'circuit', 'state_machine']),
    data:         z.any(),
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
 * Resilient fallback: if status is 'ok' and data is present, never block the user.
 */
export function parseResponse(raw) {
  if (raw && raw.status === 'ok' && raw.diagram_type && raw.data) {
    return { ok: true, data: raw };
  }
  const result = ExtractResponseSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  if (raw && (raw.status === 'unsupported' || raw.status === 'error')) {
    return { ok: true, data: raw };
  }
  console.error('[schema] parse failed on:', raw);
  return { ok: false, error: 'We got an unexpected response from the server.' };
}
