/**
 * Common mount interface for all simulation engines.
 *
 * All engine renderers must follow this contract:
 *   mount(container, compiledScene) → { onParamChange, destroy }
 *
 * This way the frontend never needs to know which engine is active underneath.
 */

export const ENGINE_TYPES = {
  FREE_BODY:     "free_body",
  CIRCUIT:       "circuit",
  STATE_MACHINE: "state_machine",
};

/**
 * Mounts the compiled scene to the provided DOM container.
 *
 * @param {HTMLElement} container
 * @param {object} compiledScene  — output of compileFreeBody, compileCircuit, or compileStateMachine
 * @returns {{ onParamChange: (paramKey: string, newValue: any) => void, destroy: () => void }}
 */
export function mount(container, compiledScene) {
  if (!container) throw new Error("Mount target container is required.");
  if (!compiledScene || !compiledScene.engine) {
    throw new Error("Invalid compiled scene: missing engine identifier.");
  }

  // If the compiled scene provides its own mount implementation
  if (typeof compiledScene.mount === "function") {
    return compiledScene.mount(container);
  }

  return {
    onParamChange: (paramKey, newValue) => {
      if (typeof compiledScene.onParamChange === "function") {
        compiledScene.onParamChange(paramKey, newValue);
      }
    },
    destroy: () => {
      if (typeof compiledScene.destroy === "function") {
        compiledScene.destroy();
      }
    }
  };
}
