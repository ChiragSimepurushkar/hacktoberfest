import { useEffect, useRef, useState } from 'react';
import { compileFreeBody } from '../../engines/freeBodyCompiler.js';

const VECTOR_COLORS = {
  gravity:  '#D9531E',
  normal:   '#2F5FD0',
  applied:  '#C0392B',
  friction: '#1F8A4C',
  net:      '#14181F',
};

/**
 * Free-body diagram stage.
 *
 * Props:
 *   data        — raw extracted JSON (used for initial scene compile)
 *   controller  — SimController from mountInterface.createController()
 *                 When provided, the stage:
 *                   • registers a highlight handler so the controller can
 *                     visually emphasise a path (e.g. "forces[0].magnitude")
 *                   • fires controller._fireSelect(path) when user clicks a force arrow
 *                 Falls back to rendering from `data` alone if controller is absent.
 *
 * NOTE: Matter.js live physics is a TODO. This provides an accurate SVG
 * visual that re-renders reactively when params change via the controller.
 */
export default function FreeBodyStage({ data, controller }) {
  const svgRef  = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  // Local mirror of params so the stage re-renders when controller.setParam is called
  const [localData, setLocalData] = useState(data);
  const [highlighted, setHighlighted] = useState(null);

  // ── Register highlight handler with controller ──────────────────────────
  useEffect(() => {
    if (!controller) return;
    controller._registerHighlight((path) => setHighlighted(path));
    return () => controller._registerHighlight(null);
  }, [controller]);

  // ── Sync localData when controller params change ────────────────────────
  // We listen to onResults as a side-channel that fires after every setParam.
  // On each notification we rebuild localData from the controller's param list.
  useEffect(() => {
    if (!controller) return;
    const unsub = controller.onResults(() => {
      const params = controller.getParams();
      setLocalData((prev) => {
        const next = { ...prev };
        // Update mass & friction from params
        const massP = params.find((p) => p.path === 'mass');
        const muP   = params.find((p) => p.path === 'friction_coeff');
        if (massP) next.mass = massP.value;
        if (muP)   next.friction_coeff = muP.value;
        // Update force magnitudes
        const forceParams = params.filter((p) => p.path.startsWith('forces['));
        next.forces = (prev.forces || []).map((f, i) => {
          const fp = forceParams.find((p) => p.path === `forces[${i}].magnitude`);
          return fp ? { ...f, magnitude: fp.value } : f;
        });
        return next;
      });
    });
    return unsub;
  }, [controller]);

  // ── Resize observer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  const scene = compileFreeBody(localData);

  const cx     = size.w / 2;
  const cy     = size.h / 2 + 30;
  const blockW = 80;
  const blockH = 56;
  const scale  = 1.2;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0 }}
      aria-label={`Free-body diagram: block of ${localData.mass}kg with ${scene.forces.length} forces`}
    >
      <defs>
        {Object.entries(VECTOR_COLORS).map(([name, color]) => (
          <marker
            key={name}
            id={`arrow-${name}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 8 3 L 0 6 Z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* Surface line */}
      <line
        x1={cx - 160} y1={cy + blockH / 2 + 20}
        x2={cx + 160} y2={cy + blockH / 2 + 20}
        stroke="var(--ink-2)" strokeWidth="2" strokeDasharray="8,4"
      />

      {/* Block */}
      <rect
        x={cx - blockW / 2} y={cy - blockH / 2}
        width={blockW} height={blockH}
        rx="5"
        fill="#EFF6FF"
        stroke="var(--navy)"
        strokeWidth="2"
      />
      <text
        x={cx} y={cy + 5}
        textAnchor="middle"
        fill="var(--navy)"
        fontSize="12"
        fontFamily="var(--font-mono)"
        fontWeight="600"
      >
        {localData.mass} kg
      </text>

      {/* Force arrows */}
      {scene.forces.map((force, i) => {
        const path   = `forces[${i}].magnitude`;
        const rad    = force.angleRad;
        const len    = Math.min(force.magnitude * scale, 120);
        const x2     = cx + len * Math.cos(rad);
        const y2     = cy - len * Math.sin(rad);
        const color  = VECTOR_COLORS[force.label] || '#888';
        const marker = Object.keys(VECTOR_COLORS).find((k) => k === force.label) || 'net';
        const isHigh = highlighted === path;

        return (
          <g
            key={`force-${i}`}
            style={{ cursor: controller ? 'pointer' : 'default' }}
            onClick={() => controller?._fireSelect(path)}
            aria-label={`${force.label} force: ${force.magnitude.toFixed(1)} N`}
          >
            <line
              x1={cx} y1={cy} x2={x2} y2={y2}
              stroke={color}
              strokeWidth={isHigh ? 4 : 2.5}
              markerEnd={`url(#arrow-${marker})`}
              style={{ filter: isHigh ? `drop-shadow(0 0 4px ${color})` : undefined }}
            />
            <text
              x={x2 + (x2 > cx ? 8 : -8)}
              y={y2 + (y2 < cy ? -6 : 14)}
              textAnchor={x2 > cx ? 'start' : 'end'}
              fill={color}
              fontSize="12"
              fontFamily="var(--font-mono)"
              fontWeight="600"
            >
              {force.label === 'gravity' ? 'mg'
                : force.label === 'friction' ? 'f'
                : force.label.charAt(0).toUpperCase() + force.label.slice(1)
              } = {force.magnitude.toFixed(1)} N
            </text>
          </g>
        );
      })}

      {/* Angle label */}
      <text
        x={cx + 90} y={cy + blockH / 2 + 15}
        fill="var(--ink-2)" fontSize="12" fontFamily="var(--font-mono)"
      >
        30°
      </text>
    </svg>
  );
}
