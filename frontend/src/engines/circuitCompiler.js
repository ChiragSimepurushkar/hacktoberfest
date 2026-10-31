/**
 * Circuit diagram compiler and DC Nodal Solver.
 * Maps validated JSON → Electrical network netlist & live circuit equations.
 */

/**
 * Solves series / ladder DC circuit with battery and resistors.
 * @param {Array<{type: string, value: number, node_a: string, node_b: string, label: string}>} components
 * @param {string} sourceLabel
 * @returns {object} calculated circuit state (voltages, current, resistance)
 */
export function solveCircuit(components, sourceLabel) {
  const battery = components.find((c) => c.type === "battery") || { value: 9.0, label: "V1", node_a: "A", node_b: "B" };
  const resistors = components.filter((c) => c.type === "resistor");

  const Vs = battery.value;
  // Equivalent series resistance
  const Req = resistors.reduce((sum, r) => sum + r.value, 0) || 1.0;
  const currentAmps = Vs / Req;
  const currentMilliAmps = currentAmps * 1000;

  // Node voltage calculations with Node A as 0V reference
  const nodeVoltages = { A: 0.0 };
  nodeVoltages[battery.node_b] = Vs;

  let currentV = Vs;
  resistors.forEach((r) => {
    const vDrop = currentAmps * r.value;
    currentV = Math.max(0, currentV - vDrop);
    nodeVoltages[r.node_b] = currentV;
  });

  return {
    sourceVoltage: Vs,
    equivalentResistance: Req,
    currentAmps,
    currentMilliAmps,
    nodeVoltages,
    powerWatts: Vs * currentAmps,
  };
}

/**
 * Compiles validated Circuit JSON into engine scene object.
 * @param {object} data - validated Circuit JSON from backend
 * @returns {object} scene configuration
 */
export function compileCircuit(data) {
  const components = (data.components || []).map((c, idx) => ({
    type: c.type || "resistor",
    value: typeof c.value === "number" ? c.value : 100,
    node_a: c.node_a || "A",
    node_b: c.node_b || "B",
    label: c.label || `${c.type === "battery" ? "V" : "R"}${idx + 1}`,
  }));

  const nodes = [...new Set(components.flatMap((c) => [c.node_a, c.node_b]))];
  const source = data.source || components.find((c) => c.type === "battery")?.label || "V1";
  const solution = solveCircuit(components, source);

  return {
    engine: "circuit",
    nodes,
    components,
    source,
    solution,
  };
}
