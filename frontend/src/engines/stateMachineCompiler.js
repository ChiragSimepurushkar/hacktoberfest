/**
 * State machine compiler.
 * Maps validated JSON → Cytoscape.js graph elements & transition execution logic.
 */

/**
 * Executes a single transition step in the automaton.
 * @param {string} currentState
 * @param {string} symbol
 * @param {Array<{from: string, to: string, label: string}>} transitions
 * @returns {string|null} next state or null if no transition defined
 */
export function stepTransition(currentState, symbol, transitions) {
  const t = transitions.find((tr) => tr.from === currentState && tr.label === symbol);
  return t ? t.to : null;
}

/**
 * Simulates a full input stream through the automaton.
 * @param {string} initialState
 * @param {string} inputString
 * @param {Array<{from: string, to: string, label: string}>} transitions
 * @param {Array<string>} acceptingStates
 * @returns {{ trace: Array<{step: number, symbol: string, state: string}>, isAccepted: boolean, finalState: string }}
 */
export function simulateStream(initialState, inputString, transitions, acceptingStates) {
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
export function compileStateMachine(data) {
  const states = data.states || ["q0"];
  const transitions = data.transitions || [];
  const initial = data.initial || states[0] || "q0";
  const accepting = data.accepting || [];

  const nodes = states.map((s) => ({
    data: {
      id: s,
      label: s,
      isInitial: s === initial,
      isAccepting: accepting.includes(s),
    },
    classes: `${accepting.includes(s) ? "accepting" : ""} ${s === initial ? "initial current" : ""}`.trim(),
  }));

  const edges = transitions.map((t, idx) => ({
    data: {
      id: `e_${t.from}_${t.to}_${t.label}_${idx}`,
      source: t.from,
      target: t.to,
      label: t.label,
    },
  }));

  return {
    engine: "state_machine",
    elements: [...nodes, ...edges],
    initial,
    accepting,
    currentState: initial,
    transitions,
    states,
  };
}
