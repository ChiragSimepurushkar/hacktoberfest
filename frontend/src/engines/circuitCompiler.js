/**
 * Circuit diagram compiler.
 * Maps validated JSON → CircuitJS / SPICE-style config.
 */

/**
 * @param {object} data  — validated Circuit JSON from the backend
 * @returns {object}     — scene config for CircuitRenderer
 */
export function compileCircuit(data) {
  // TODO: implement netlist generation for CircuitJS or a lightweight solver
  const nodes = [...new Set(data.components.flatMap((c) => [c.node_a, c.node_b]))];
  return {
    engine:     "circuit",
    nodes,
    components: data.components,
    source:     data.source,
  };
}
