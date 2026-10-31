import { useEffect, useRef, useState } from 'react';
import { compileFreeBody } from '../../engines/freeBodyCompiler.js';
import { canonicalForceKey } from '../../lib/forceLabels.js';

const VECTOR_COLORS = {
  gravity:  '#D9531E',
  normal:   '#2F5FD0',
  applied:  '#C0392B',
  friction: '#1F8A4C',
  net:      '#14181F',
};

/**
 * Free-body diagram stage.
 * Renders an SVG canvas showing the block on an incline with labelled force arrows.
 * TODO: Wire up Matter.js for live physics — this provides a correct visual representation.
 */
export default function FreeBodyStage({ data }) {
  const scene   = compileFreeBody(data);
  const svgRef  = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  const cx = size.w / 2;
  const cy = size.h / 2 + 30;
  const blockW = 80;
  const blockH = 56;

  // Angle from surface field
  const surfaceAngle = 30; // degrees — TODO: extract from data if available

  // Scale factor for force arrows
  const scale = 1.2;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0 }}
      aria-label={`Free-body diagram: block of ${data.mass}kg with ${scene.forces.length} forces`}
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

      {/* Surface / incline */}
      <line
        x1={cx - 160}
        y1={cy + blockH / 2 + 20}
        x2={cx + 160}
        y2={cy + blockH / 2 + 20}
        stroke="var(--ink-2)"
        strokeWidth="2"
        strokeDasharray="8,4"
      />

      {/* Block */}
      <rect
        x={cx - blockW / 2}
        y={cy - blockH / 2}
        width={blockW}
        height={blockH}
        rx="5"
        fill="#EFF6FF"
        stroke="var(--navy)"
        strokeWidth="2"
      />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fill="var(--navy)"
        fontSize="12"
        fontFamily="var(--font-mono)"
        fontWeight="600"
      >
        {data.mass} kg
      </text>

      {/* Force arrows */}
      {scene.forces.map((force, i) => {
        const rad    = force.angleRad;
        const len    = Math.min(force.magnitude * scale, 120);
        const x2     = cx + len * Math.cos(rad);
        const y2     = cy - len * Math.sin(rad); // SVG Y is inverted
        const forceKey = canonicalForceKey(force.label);
        const color  = VECTOR_COLORS[forceKey] || '#888';
        const markerName = VECTOR_COLORS[forceKey] ? forceKey : 'net';

        return (
          <g key={`force-${i}`}>
            <line
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="2.5"
              markerEnd={`url(#arrow-${markerName})`}
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
              {forceKey === 'gravity' ? 'mg' : forceKey === 'friction' ? 'f' : force.label.charAt(0).toUpperCase() + force.label.slice(1)} = {force.magnitude.toFixed(1)} N
            </text>
          </g>
        );
      })}

      {/* Angle label */}
      <text
        x={cx + 90}
        y={cy + blockH / 2 + 15}
        fill="var(--ink-2)"
        fontSize="12"
        fontFamily="var(--font-mono)"
      >
        {surfaceAngle}°
      </text>
    </svg>
  );
}
