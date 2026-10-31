/**
 * Common mount interface for all simulation engines.
 *
 * All engine renderers must follow this contract:
 *   mount(container, compiledScene) → { onParamChange, destroy }
 *
 * This way the frontend never needs to know which engine is active.
 */

export const ENGINE_TYPES = {
  FREE_BODY:     "free_body",
  CIRCUIT:       "circuit",
  STATE_MACHINE: "state_machine",
};

/**
 * @param {HTMLElement} container
 * @param {object} compiledScene  — output of one of the compiler functions below
 * @returns {{ onParamChange: (params: object) => void, destroy: () => void }}
 */
export function mount(container, compiledScene) {
  // TODO: dispatch to the correct engine based on compiledScene.engine
  throw new Error("mount() must be implemented per engine renderer");
}
