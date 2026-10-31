/**
 * FixtureClient — returns bundled fixture data without any network call.
 * Same interface as the HttpClient, so the demo works offline.
 */

import freeBodyFixture    from '../../../fixtures/free_body.json';
import circuitFixture     from '../../../fixtures/circuit.json';
import stateMachineFixture from '../../../fixtures/state_machine.json';
import { parseResponse }  from './schema.js';

const FIXTURES = {
  free_body:     { status: 'ok', diagram_type: 'free_body',     data: freeBodyFixture },
  circuit:       { status: 'ok', diagram_type: 'circuit',       data: circuitFixture },
  state_machine: { status: 'ok', diagram_type: 'state_machine', data: stateMachineFixture },
};

/**
 * @param {File|null} _imageFile - ignored in fixture mode
 * @param {AbortSignal} signal
 * @param {string} preferType - which fixture to return ('free_body' | 'circuit' | 'state_machine')
 */
export async function extractFromFixture(_imageFile, signal, preferType = 'free_body') {
  // Simulate a realistic analysis delay
  await delay(1800, signal);

  const raw    = FIXTURES[preferType] || FIXTURES.free_body;
  const parsed = parseResponse(raw);

  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export { freeBodyFixture, circuitFixture, stateMachineFixture };
