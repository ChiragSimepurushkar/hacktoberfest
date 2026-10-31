/**
 * State machine compiler.
 * Maps validated JSON → Cytoscape.js graph elements.
 */

/**
 * @param {object} data  — validated StateMachine JSON from the backend
 * @returns {object}     — scene config for StateMachineRenderer / Cytoscape
 */
export function compileStateMachine(data) {
  // TODO: implement
  const nodes = data.states.map((s) => ({
    data: {
      id:        s,
      isInitial:  s === data.initial,
      isAccepting: data.accepting.includes(s),
    },
  }));

  const edges = data.transitions.map((t, i) => ({
    data: {
      id:     `e${i}`,
      source: t.from,
      target: t.to,
      label:  t.label,
    },
  }));

  return {
    engine:       "state_machine",
    elements:     { nodes, edges },
    initial:      data.initial,
    accepting:    data.accepting,
    currentState: data.initial,
  };
}
