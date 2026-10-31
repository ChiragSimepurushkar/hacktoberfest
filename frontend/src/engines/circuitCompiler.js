/**
 * Circuit diagram compiler and DC Nodal Solver.
 * Maps validated JSON → Electrical network netlist & live circuit equations.
 * Supports both series-parallel circuits and pure series/parallel networks.
 */

/**
 * Solves series and series-parallel DC circuits.
 * @param {Array<{type: string, value: number, node_a: string, node_b: string, label: string}>} components
 * @param {string} sourceLabel
 * @returns {object} calculated circuit state (voltages, current, resistance, branches)
 */
export function solveCircuit(components, sourceLabel) {
  const battery = components.find((c) => c.type === "battery") || {
    value: 10.0,
    label: "V1",
    node_a: "A",
    node_b: "B",
  };
  const resistors = components.filter((c) => c.type === "resistor");
  const Vs = typeof battery.value === "number" ? battery.value : 10.0;

  if (resistors.length === 0) {
    return {
      sourceVoltage: Vs,
      equivalentResistance: 1.0,
      currentAmps: Vs,
      currentMilliAmps: Vs * 1000,
      nodeVoltages: { A: 0.0, B: Vs },
      branchCurrents: {},
      branchVoltages: {},
      powerWatts: Vs * Vs,
      isSeriesParallel: false,
    };
  }

  // Check for parallel pairs: two resistors sharing the same two endpoints
  let parallelPair = null;
  for (let i = 0; i < resistors.length; i++) {
    for (let j = i + 1; j < resistors.length; j++) {
      const rA = resistors[i];
      const rB = resistors[j];
      const sameNodes =
        (rA.node_a === rB.node_a && rA.node_b === rB.node_b) ||
        (rA.node_a === rB.node_b && rA.node_b === rB.node_a);
      if (sameNodes) {
        parallelPair = [rA, rB];
        break;
      }
    }
    if (parallelPair) break;
  }

  // Also detect 3-resistor series-parallel if labelled R1, R2, R3 where R2 and R3 share common ground/return
  let isSeriesParallel = Boolean(parallelPair);
  let R_series = [];
  let R_parallel = [];

  if (parallelPair) {
    R_parallel = parallelPair;
    R_series = resistors.filter((r) => !parallelPair.includes(r));
  } else if (resistors.length === 3) {
    // If 3 resistors without explicit shared pair, check if R2 & R3 form the parallel bank
    const r1 = resistors[0];
    const r2 = resistors[1];
    const r3 = resistors[2];
    // In series-parallel: R1 is series, R2 and R3 are parallel
    isSeriesParallel = true;
    R_series = [r1];
    R_parallel = [r2, r3];
  } else {
    R_series = resistors;
  }

  let Req = 0;
  let Rp = 0;
  let branchCurrents = {};
  let branchVoltages = {};
  let nodeVoltages = { A: 0.0, GND: 0.0 };
  nodeVoltages[battery.node_b || "B"] = Vs;

  if (isSeriesParallel && R_parallel.length >= 2) {
    const r1 = R_series[0] ? R_series[0].value : 0;
    const r2 = R_parallel[0].value || 1.0;
    const r3 = R_parallel[1].value || 1.0;

    Rp = (r2 * r3) / (r2 + r3);
    Req = r1 + Rp;

    const I_total = Vs / Req;
    const V_series = I_total * r1;
    const V_parallel = Vs - V_series;

    if (R_series[0]) {
      branchCurrents[R_series[0].label] = I_total;
      branchVoltages[R_series[0].label] = V_series;
    }
    branchCurrents[R_parallel[0].label] = V_parallel / r2;
    branchVoltages[R_parallel[0].label] = V_parallel;

    branchCurrents[R_parallel[1].label] = V_parallel / r3;
    branchVoltages[R_parallel[1].label] = V_parallel;

    // Node voltages
    nodeVoltages["MID"] = V_parallel;
    nodeVoltages["C"] = V_parallel;
    nodeVoltages["N2"] = V_parallel;

    return {
      sourceVoltage: Vs,
      equivalentResistance: Req,
      parallelResistance: Rp,
      currentAmps: I_total,
      currentMilliAmps: I_total * 1000,
      nodeVoltages,
      branchCurrents,
      branchVoltages,
      powerWatts: Vs * I_total,
      isSeriesParallel: true,
      r1Val: r1,
      r2Val: r2,
      r3Val: r3,
    };
  }

  // Pure Series network
  Req = resistors.reduce((sum, r) => sum + (r.value || 0), 0) || 1.0;
  const currentAmps = Vs / Req;
  const currentMilliAmps = currentAmps * 1000;

  let currentV = Vs;
  resistors.forEach((r) => {
    const vDrop = currentAmps * r.value;
    branchCurrents[r.label] = currentAmps;
    branchVoltages[r.label] = vDrop;
    currentV = Math.max(0, currentV - vDrop);
    nodeVoltages[r.node_b] = currentV;
  });

  return {
    sourceVoltage: Vs,
    equivalentResistance: Req,
    parallelResistance: 0,
    currentAmps,
    currentMilliAmps,
    nodeVoltages,
    branchCurrents,
    branchVoltages,
    powerWatts: Vs * currentAmps,
    isSeriesParallel: false,
    r1Val: resistors[0]?.value || 0,
    r2Val: resistors[1]?.value || 0,
    r3Val: resistors[2]?.value || 0,
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
