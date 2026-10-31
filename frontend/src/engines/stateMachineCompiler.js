/**
 * State machine compiler.
 * Maps validated JSON → Cytoscape.js graph elements & transition execution logic.
 */

/**
 * Helper to normalize transition endpoints from any schema variant.
 */
export function normalizeTransition(tr) {
  const from = tr.from || tr.from_state || tr.source || '';
  const to = tr.to || tr.to_state || tr.target || '';
  const label = tr.label ?? tr.symbol ?? tr.input ?? '';
  return { from: String(from), to: String(to), label: String(label) };
}

/**
 * Executes a single transition step in the automaton.
 * @param {string} currentState
 * @param {string} symbol
 * @param {Array<{from: string, to: string, label: string}>} transitions
 * @returns {string|null} next state or null if no transition defined
 */
export function stepTransition(currentState, symbol, transitions = []) {
  const symStr = String(symbol);
  for (const tr of transitions) {
    const { from, to, label } = normalizeTransition(tr);
    if (from === currentState && label === symStr) {
      return to;
    }
  }
  return null;
}

/**
 * Simulates a full input stream through the automaton.
 * @param {string} initialState
 * @param {string} inputString
 * @param {Array<{from: string, to: string, label: string}>} transitions
 * @param {Array<string>} acceptingStates
 * @returns {{ trace: Array<{step: number, symbol: string, state: string}>, isAccepted: boolean, finalState: string }}
 */
export function simulateStream(initialState, inputString, transitions = [], acceptingStates = []) {
  let state = initialState;
  const trace = [{ step: 0, symbol: "START", state }];

  for (let i = 0; i < inputString.length; i++) {
    const sym = inputString[i];
    const nextState = stepTransition(state, sym, transitions);
    if (!nextState) {
      return {
        trace,
        isAccepted: false,
        finalState: state,
        rejectedAtStep: i,
        missingTransitionSymbol: sym,
      };
    }
    state = nextState;
    trace.push({ step: i + 1, symbol: sym, state });
  }

  return {
    trace,
    isAccepted: acceptingStates.includes(state),
    finalState: state,
  };
}

/**
 * Compiles validated StateMachine JSON into Cytoscape graph configuration.
 * @param {object} data - validated StateMachine JSON from backend
 * @returns {object} Cytoscape scene configuration
 */
export function compileStateMachine(data = {}) {
  const states = data.states || ["q0"];
  const rawTransitions = data.transitions || [];
  const initial = data.initial || states[0] || "q0";
  const accepting = data.accepting || [];

  const nodes = states.map((s) => ({
    group: "nodes",
    data: {
      id: s,
      label: s,
      isInitial: s === initial,
      isAccepting: accepting.includes(s),
    },
    classes: `${accepting.includes(s) ? "accepting" : ""} ${s === initial ? "initial current" : ""}`.trim(),
  }));

  const edges = [];
  rawTransitions.forEach((t, idx) => {
    const { from, to, label } = normalizeTransition(t);
    if (from && to) {
      edges.push({
        group: "edges",
        data: {
          id: `e_${from}_${to}_${label}_${idx}`,
          source: from,
          target: to,
          label: label,
        },
      });
    }
  });

  return {
    engine: "state_machine",
    elements: [...nodes, ...edges],
    initial,
    accepting,
    currentState: initial,
    transitions: rawTransitions.map(normalizeTransition),
    states,
  };
}
