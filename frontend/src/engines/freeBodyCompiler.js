/**
 * Free-body diagram compiler.
 * Maps validated JSON → Physics scene configuration & mathematical dynamics.
 * Fed into FreeBodyRenderer which drives the live interactive canvas.
 */

/**
 * Computes net force, normal force, friction, and acceleration along the surface.
 * @param {number} mass - mass in kg
 * @param {number} inclineAngleDeg - angle in degrees
 * @param {number} frictionCoeff - friction coefficient mu
 * @param {Array<{label: string, magnitude: number, angle: number}>} forces
 * @returns {object} calculated dynamics
 */
export function calculateDynamics(mass, inclineAngleDeg, frictionCoeff, forces) {
  const g = 9.81;
  const thetaRad = (inclineAngleDeg * Math.PI) / 180;

  // Find components
  const gravityForce = forces.find((f) => f.label.toLowerCase() === "gravity")?.magnitude || mass * g;
  const normalForce = forces.find((f) => f.label.toLowerCase() === "normal")?.magnitude || mass * g * Math.cos(thetaRad);
  const appliedForce = forces.find((f) => f.label.toLowerCase() === "applied")?.magnitude || 0;

  // Theoretical forces along incline
  const F_g_parallel = mass * g * Math.sin(thetaRad);
  const F_normal_theoretical = mass * g * Math.cos(thetaRad);
  const maxFriction = frictionCoeff * normalForce;

  // Net force along surface: upward positive
  let F_net = appliedForce - F_g_parallel;
  let frictionForce = 0;
  let isStatic = false;

  if (Math.abs(F_net) <= maxFriction) {
    frictionForce = -F_net;
    F_net = 0;
    isStatic = true;
  } else {
    frictionForce = -Math.sign(F_net) * maxFriction;
    F_net = F_net + frictionForce;
    isStatic = false;
  }

  const acceleration = F_net / mass;

  return {
    mass,
    inclineAngleDeg,
    inclineAngleRad: thetaRad,
    frictionCoeff,
    normalForce,
    normalForceTheoretical: F_normal_theoretical,
    gravityForce,
    appliedForce,
    frictionForce,
    netForce: F_net,
    acceleration,
    isStatic,
  };
}

/**
 * Compiles validated FreeBody JSON into a full engine scene object.
 * @param {object} data - validated FreeBodyDiagram JSON from the backend
 * @returns {object} scene configuration
 */
export function compileFreeBody(data) {
  const mass = data.mass || 2.5;
  const surface = data.surface || "incline";
  const inclineAngleDeg = surface === "incline" ? 30 : 0;
  const frictionCoeff = typeof data.friction_coeff === "number" ? data.friction_coeff : 0.3;

  const forces = (data.forces || []).map((f) => ({
    label: f.label || "force",
    magnitude: typeof f.magnitude === "number" ? f.magnitude : 10,
    angle: typeof f.angle === "number" ? f.angle : 0,
    angleRad: ((f.angle || 0) * Math.PI) / 180,
    anchor: f.anchor || "center",
  }));

  const initialDynamics = calculateDynamics(mass, inclineAngleDeg, frictionCoeff, forces);

  return {
    engine: "free_body",
    surface,
    mass,
    frictionCoeff,
    inclineAngleDeg,
    forces,
    dynamics: initialDynamics,
  };
}
