/**
 * Free-body diagram compiler.
 * Maps validated JSON → Physics scene configuration & mathematical dynamics.
 * Fed into FreeBodyRenderer which drives the live interactive canvas.
 */
import { canonicalForceKey } from "../lib/forceLabels.js";

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

  // Find components. Labels may be canonical ("gravity") or copied straight
  // from the handwriting ("mg", "N", "F") — canonicalForceKey normalizes both.
  const gravityForce = forces.find((f) => canonicalForceKey(f.label) === "gravity")?.magnitude || mass * g;
  const normalForce = forces.find((f) => canonicalForceKey(f.label) === "normal")?.magnitude || mass * g * Math.cos(thetaRad);
  const appliedForce = forces.find((f) => canonicalForceKey(f.label) === "applied")?.magnitude || 0;

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
  const frictionCoeff = typeof data.friction_coeff === "number" ? data.friction_coeff : 0.3;

  // The schema has no explicit incline-angle field, but the normal force's
  // angle encodes it: a surface rising at angle theta has its normal at
  // 90+theta. Derive from that instead of assuming every incline is 30 deg.
  // An explicit incline_angle/surface_angle (e.g. from the interactive angle
  // slider) always wins over the derived value.
  const normalForce = (data.forces || []).find(
    (f) => canonicalForceKey(f.label) === "normal"
  );
  const inferredAngle = normalForce ? Math.round(normalForce.angle - 90) : null;
  const explicitAngle =
    typeof data.incline_angle === "number"
      ? data.incline_angle
      : typeof data.surface_angle === "number"
        ? data.surface_angle
        : null;
  const inclineAngleDeg =
    surface === "incline"
      ? (explicitAngle != null
          ? explicitAngle
          : (inferredAngle != null && inferredAngle > 0 && inferredAngle < 90 ? inferredAngle : 30))
      : 0;

  const forces = (data.forces || []).map((f) => ({
    label: f.label || "force",
    magnitude: typeof f.magnitude === "number" ? f.magnitude : 10,
    angle: typeof f.angle === "number" ? f.angle : 0,
    angleRad: ((f.angle || 0) * Math.PI) / 180,
    anchor: f.anchor || "center",
  }));

  const initialDynamics = calculateDynamics(mass, inclineAngleDeg, frictionCoeff, forces);

  // Net force actually along the surface — the sum of every extracted
  // force's component in the "up the slope" direction (angle = inclineAngleDeg,
  // same convention the backend already uses: 0 = flat/rightward). This is
  // what both the Results panel and the slide animation drive off of; it's
  // distinct from calculateDynamics' friction-limited static-equilibrium
  // model above, which assumes ideal friction rather than trusting whatever
  // the diagram's own forces say.
  const slopeRad = (inclineAngleDeg * Math.PI) / 180;
  const netAlongSurface = forces.reduce(
    (sum, f) => sum + f.magnitude * Math.cos(f.angleRad - slopeRad),
    0
  );
  const accelerationAlongSurface = mass > 0 ? netAlongSurface / mass : 0;

  return {
    engine: "free_body",
    netAlongSurface,
    accelerationAlongSurface,
    surface,
    mass,
    frictionCoeff,
    inclineAngleDeg,
    forces,
    dynamics: initialDynamics,
  };
}
