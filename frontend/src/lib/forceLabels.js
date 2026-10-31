/**
 * Canonicalizes free-body force labels.
 *
 * The extraction prompt asks Gemma for canonical labels (gravity/normal/
 * applied/friction), but it sometimes copies the literal symbol handwritten
 * next to the arrow instead (N, F, f, mg, W...). VECTOR_COLORS and the
 * gravity/friction notation shortcuts in FreeBodyStage both key off the
 * canonical names, so anything reading a force's label for color or display
 * purposes should go through here first instead of using the raw string.
 */
const SYNONYMS = {
  gravity: 'gravity',
  mg: 'gravity',
  w: 'gravity',
  weight: 'gravity',
  normal: 'normal',
  n: 'normal',
  applied: 'applied',
};

const PRETTY = {
  gravity: 'Gravity',
  normal: 'Normal',
  applied: 'Applied',
  friction: 'Friction',
};

export function canonicalForceKey(rawLabel) {
  if (!rawLabel) return 'other';
  // Case carries meaning here: by convention "F" is an applied force and
  // lowercase "f" is friction — don't lowercase before checking these.
  if (rawLabel === 'f' || rawLabel.toLowerCase() === 'friction') return 'friction';
  if (rawLabel === 'F') return 'applied';
  return SYNONYMS[rawLabel.toLowerCase()] || rawLabel.toLowerCase();
}

export function prettyForceLabel(rawLabel) {
  const key = canonicalForceKey(rawLabel);
  return PRETTY[key] || (rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1));
}
