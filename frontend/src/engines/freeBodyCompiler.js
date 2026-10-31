/**
 * Free-body diagram compiler.
 * Maps validated JSON → Physics scene configuration & mathematical dynamics.
 * Fed into FreeBodyRenderer / FreeBodyStage which drives the interactive simulation.
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
  const gravityForce = forces.find((f) => f.label.toLowerCase() === "gravity" || f.label.toLowerCase() === "mg")?.magnitude || mass * g;
  const normalForce = forces.find((f) => f.label.toLowerCase() === "normal" || f.label.toLowerCase() === "n")?.magnitude || mass * g * Math.cos(thetaRad);
  const appliedForce = forces.find((f) => f.label.toLowerCase() === "applied" || f.label.toLowerCase() === "f")?.magnitude || 0;

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
 * Helper to determine default angle in standard degrees (0 = right, 90 = up)
 * based on force type and surface incline.
 */
function resolveForceAngle(label, providedAngle, inclineAngleDeg) {
  if (typeof providedAngle === "number" && !isNaN(providedAngle)) {
    return providedAngle;
  }
  const l = label.toLowerCase();
  if (l.includes("norm") || l === "n") {
    return 90 + inclineAngleDeg; // Perpendicular to ramp
  }
  if (l.includes("app") || l === "f") {
    return inclineAngleDeg; // Along ramp upwards
  }
  if (l.includes("fric") || l === "f") {
    return 180 + inclineAngleDeg; // Down the ramp opposing motion
  }
  if (l.includes("grav") || l.includes("mg") || l === "w") {
    return 270; // Straight down
  }
  return 0;
}

/**
 * Compiles validated FreeBody JSON into a full engine scene object.
 * @param {object} data - validated FreeBodyDiagram JSON from the backend
 * @returns {object} scene configuration
 */
export function compileFreeBody(data) {
  const mass = typeof data.mass === "number" ? data.mass : 2.0;

  // Resolve incline angle from surface, angle fields, or applied force
  let inclineAngleDeg = 30;
  if (typeof data.incline_angle === "number") {
    inclineAngleDeg = data.incline_angle;
  } else if (typeof data.surface_angle === "number") {
    inclineAngleDeg = data.surface_angle;
  } else if (typeof data.angle === "number") {
    inclineAngleDeg = data.angle;
  } else if (typeof data.surface === "string") {
    const match = data.surface.match(/(\d+(\.\d+)?)/);
    if (match) {
      inclineAngleDeg = parseFloat(match[1]);
    } else if (data.surface.toLowerCase().includes("horizontal")) {
      inclineAngleDeg = 0;
    }
  }

  const surface = inclineAngleDeg > 0 ? "incline" : "horizontal";
  const frictionCoeff = typeof data.friction_coeff === "number" ? data.friction_coeff : 0.3;

  const forces = (data.forces || []).map((f) => {
    const rawLabel = f.label || "force";
    const lower = rawLabel.toLowerCase();
    let normalizedLabel = rawLabel;
    if (lower === "n" || lower.includes("normal")) normalizedLabel = "normal";
    else if (lower === "f" && typeof f.angle === "number" && (f.angle > 150 && f.angle < 250)) normalizedLabel = "friction";
    else if (lower === "f" || lower.includes("applied")) normalizedLabel = "applied";
    else if (lower.includes("fric")) normalizedLabel = "friction";
    else if (lower.includes("grav") || lower.includes("mg")) normalizedLabel = "gravity";

    const angle = resolveForceAngle(normalizedLabel, f.angle, inclineAngleDeg);
    const angleRad = (angle * Math.PI) / 180;

    return {
      label: normalizedLabel,
      originalLabel: rawLabel,
      magnitude: typeof f.magnitude === "number" ? f.magnitude : 10,
      angle,
      angleRad,
      anchor: f.anchor || "center",
    };
  });

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
