/**
 * Common mount interface for all simulation engines.
 *
 * Contract (SimController):
 *   controller.mount(container)                   – idempotent, StrictMode safe
 *   controller.destroy()                           – frees engine, listeners
 *   controller.getParams()  → ParamDef[]           – drives the slider panel
 *   controller.setParam(path, value)               – e.g. "forces[2].magnitude"
 *   controller.onResults(cb) → unsubscribe fn      – live result updates
 *   controller.onSelect?(cb) → unsubscribe fn      – user clicked a feature on stage
 *   controller.highlight?(path | null)             – highlight a path on the stage
 *   controller.transport?  { play, pause, step, reset, setSpeed, state }
 *
 * ParamDef shape:
 *   { path, label, unit?, min, max, step, value, group?, inferred?, inferredReason?, color? }
 *
 * ResultMap shape:
 *   { [label: string]: string }   e.g. { "Net Force": "12.3 N", "Acceleration": "1.5 m/s²" }
 */

export const ENGINE_TYPES = {
  FREE_BODY:     'free_body',
  CIRCUIT:       'circuit',
  STATE_MACHINE: 'state_machine',
};

/**
 * Registry: diagram_type → factory function that returns a SimController.
 * Each factory is a plain JS function — no React, no DOM side-effects —
 * so it can be registered synchronously.
 *
 * Factory signature:
 *   createController(data: object) → SimController
 */
const _registry = {};

export function registerEngine(type, factory) {
  _registry[type] = factory;
}

/**
 * Create a SimController for the given diagram type + extracted data.
 * Returns null if the type is not registered.
 */
export function createController(type, data) {
  const factory = _registry[type];
  if (!factory) {
    console.warn(`[mountInterface] No engine registered for type: "${type}"`);
    return null;
  }
  return factory(data);
}

/* ─────────────────────────────────────────────
   Built-in engine controllers
   (Dev B will replace/extend these with real
    Matter.js / CircuitJS / Cytoscape engines)
───────────────────────────────────────────── */

/**
 * Free-body SimController.
 * Manages param state, recomputes results on setParam.
 */
function createFreeBodyController(data) {
  // Internal mutable state
  let _params = buildFreeBodyParams(data);
  let _resultCbs = [];
  let _selectCbs = [];
  let _highlightFn = null;

  function _notify() {
    const results = computeFreeBodyResults(_params);
    _resultCbs.forEach((cb) => cb(results));
  }

  const controller = {
    /** @returns {ParamDef[]} */
    getParams() {
      return [..._params];
    },

    /**
     * @param {string} path  e.g. "mass", "friction_coeff", "forces[2].magnitude"
     * @param {number} value
     */
    setParam(path, value) {
      _params = _params.map((p) => (p.path === path ? { ...p, value } : p));
      _notify();
    },

    /** @param {(results: ResultMap) => void} cb */
    onResults(cb) {
      _resultCbs.push(cb);
      // Fire immediately with current values
      cb(computeFreeBodyResults(_params));
      return () => { _resultCbs = _resultCbs.filter((x) => x !== cb); };
    },

    /** @param {(path: string | null) => void} cb */
    onSelect(cb) {
      _selectCbs.push(cb);
      return () => { _selectCbs = _selectCbs.filter((x) => x !== cb); };
    },

    /** @param {string | null} path */
    highlight(path) {
      _highlightFn?.(path);
    },

    /** Called by the stage component to register its highlight handler */
    _registerHighlight(fn) {
      _highlightFn = fn;
    },

    /** Called by the stage component to fire an onSelect event */
    _fireSelect(path) {
      _selectCbs.forEach((cb) => cb(path));
    },

    mount() { /* no-op — stage component handles DOM */ },
    destroy() {
      _resultCbs = [];
      _selectCbs = [];
      _highlightFn = null;
    },
  };

  return controller;
}

/**
 * Circuit SimController.
 */
function createCircuitController(data) {
  let _params = buildCircuitParams(data);
  let _resultCbs = [];

  function _notify() {
    const results = computeCircuitResults(_params, data);
    _resultCbs.forEach((cb) => cb(results));
  }

  return {
    getParams() { return [..._params]; },
    setParam(path, value) {
      _params = _params.map((p) => (p.path === path ? { ...p, value } : p));
      _notify();
    },
    onResults(cb) {
      _resultCbs.push(cb);
      cb(computeCircuitResults(_params, data));
      return () => { _resultCbs = _resultCbs.filter((x) => x !== cb); };
    },
    onSelect() { return () => {}; },
    highlight() {},
    _registerHighlight() {},
    _fireSelect() {},
    mount() {},
    destroy() { _resultCbs = []; },
  };
}

/**
 * State-machine SimController.
 */
function createStateMachineController(data) {
  let _resultCbs = [];
  let _currentState = data.initial;
  let _highlightFn = null;

  function _notify() {
    const accepted = (data.accepting || []).includes(_currentState);
    _resultCbs.forEach((cb) => cb({
      'Current state': _currentState,
      'Status': accepted ? '✓ Accepted' : '–',
    }));
  }

  return {
    getParams() { return []; }, // State machine has no numeric sliders
    setParam() {},              // No-op
    onResults(cb) {
      _resultCbs.push(cb);
      _notify();
      return () => { _resultCbs = _resultCbs.filter((x) => x !== cb); };
    },
    onSelect() { return () => {}; },
    highlight(path) { _highlightFn?.(path); },
    _registerHighlight(fn) { _highlightFn = fn; },
    _fireSelect() {},
    mount() {},
    destroy() { _resultCbs = []; _highlightFn = null; },

    // State machine-specific helpers (called by StateMachinePanel)
    step(inputSymbol) {
      const trans = (data.transitions || []).find(
        (t) => t.from === _currentState && t.label === inputSymbol
      );
      if (trans) {
        _currentState = trans.to;
        _notify();
        _highlightFn?.(_currentState);
        return true;
      }
      return false;
    },
    reset() {
      _currentState = data.initial;
      _notify();
      _highlightFn?.(data.initial);
    },
    getCurrentState() { return _currentState; },
  };
}

/* ─────────────────────────────────────────────
   Helper: build ParamDef[] from raw data
───────────────────────────────────────────── */

const VECTOR_COLORS = {
  gravity:  '#D9531E',
  normal:   '#2F5FD0',
  applied:  '#C0392B',
  friction: '#1F8A4C',
  net:      '#14181F',
};

function buildFreeBodyParams(data) {
  const trace = data.audit?.inference_trace || [];
  const params = [];

  // Mass
  const massTrace = trace.find((t) => t.field === 'mass');
  params.push({
    path: 'mass',
    label: 'Mass',
    unit: 'kg',
    min: 0.1, max: 50, step: 0.1,
    value: data.mass ?? 1,
    group: 'Body',
    inferred: massTrace?.source === 'inferred',
    inferredReason: massTrace?.reasoning,
  });

  // Friction
  const muTrace = trace.find((t) => t.field === 'friction_coeff');
  params.push({
    path: 'friction_coeff',
    label: 'Friction μ',
    unit: '',
    min: 0, max: 1, step: 0.01,
    value: data.friction_coeff ?? 0,
    group: 'Body',
    inferred: muTrace?.source === 'inferred',
    inferredReason: muTrace?.reasoning,
  });

  // Forces
  (data.forces || []).forEach((f, i) => {
    const forceTrace = trace.find((t) => t.field === `forces[${i}].magnitude`);
    params.push({
      path: `forces[${i}].magnitude`,
      label: `${capitalize(f.label)} force`,
      unit: 'N',
      min: 0, max: 200, step: 0.5,
      value: f.magnitude,
      group: 'Forces',
      color: VECTOR_COLORS[f.label],
      inferred: forceTrace?.source === 'inferred',
      inferredReason: forceTrace?.reasoning,
    });
  });

  return params;
}

function buildCircuitParams(data) {
  return (data.components || []).map((c, i) => ({
    path: `components[${i}].value`,
    label: c.label || capitalize(c.type),
    unit: c.type === 'battery' ? 'V' : 'Ω',
    min: 0,
    max: c.type === 'battery' ? 30 : 10000,
    step: c.type === 'battery' ? 0.1 : 10,
    value: c.value,
    group: 'Components',
    inferred: false,
  }));
}

/* ─────────────────────────────────────────────
   Helper: compute results from current params
───────────────────────────────────────────── */

function computeFreeBodyResults(params) {
  const mass = params.find((p) => p.path === 'mass')?.value ?? 0;
  const forceParams = params.filter((p) => p.path.startsWith('forces['));

  let netX = 0;
  let netY = 0;
  forceParams.forEach((p) => {
    // approximate: assume forces already decomposed — just sum magnitudes
    netX += p.value;
  });
  const netF = Math.abs(netX);
  const accel = mass > 0 ? (netF / mass).toFixed(2) : '—';

  return {
    'Net Force':    `${netF.toFixed(1)} N`,
    'Acceleration': `${accel} m/s²`,
    'Mass':         `${mass} kg`,
  };
}

function computeCircuitResults(params, data) {
  const battery = params.find((p) => {
    const i = parseInt(p.path.match(/\[(\d+)\]/)?.[1]);
    return (data.components || [])[i]?.type === 'battery';
  });
  const resistors = params.filter((p) => {
    const i = parseInt(p.path.match(/\[(\d+)\]/)?.[1]);
    return (data.components || [])[i]?.type === 'resistor';
  });

  const V = battery?.value ?? 0;
  const R = resistors.reduce((sum, r) => sum + r.value, 0);
  const I = R > 0 ? (V / R) : 0;

  return {
    'Voltage':   `${V.toFixed(1)} V`,
    'Resistance': `${R} Ω`,
    'Current':   `${I.toFixed(4)} A`,
  };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ─────────────────────────────────────────────
   Auto-register built-in engines
───────────────────────────────────────────── */

registerEngine(ENGINE_TYPES.FREE_BODY,     createFreeBodyController);
registerEngine(ENGINE_TYPES.CIRCUIT,       createCircuitController);
registerEngine(ENGINE_TYPES.STATE_MACHINE, createStateMachineController);
