/**
 * Free-body diagram compiler.
 * Maps validated JSON → Matter.js scene config.
 * Fed into FreeBodyRenderer which mounts it with Matter.js.
 */

/**
 * @param {object} data  — validated FreeBodyDiagram JSON from the backend
 * @returns {object}     — scene config for FreeBodyRenderer / Matter.js
 */
export function compileFreeBody(data) {
  // TODO: implement
  // - map data.forces[] → force vector definitions (magnitude, angle in radians, anchor)
  // - map data.mass     → Matter.js body mass
  // - map data.friction_coeff → friction option
  return {
    engine: "free_body",
    body: { mass: data.mass, label: "object" },
    forces: data.forces.map((f) => ({
      ...f,
      angleRad: (f.angle * Math.PI) / 180,
    })),
    friction: data.friction_coeff,
    surface:  data.surface,
  };
}
