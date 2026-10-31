import { useEffect, useRef, useState } from 'react';
import { compileFreeBody, calculateDynamics } from '../../engines/freeBodyCompiler.js';

const VECTOR_COLORS = {
  gravity:  '#D9531E', // Vermilion / Red-Orange
  normal:   '#2F5FD0', // Blue
  applied:  '#C0392B', // Red
  friction: '#1F8A4C', // Forest Green
  net:      '#14181F', // Dark Ink
};

/**
 * Free-body diagram stage.
 * Renders an accurate, interactive physics representation of the block on an incline wedge,
 * with vector force arrows, dynamic telemetry HUD, and non-overlapping label badges.
 */
export default function FreeBodyStage({ data }) {
  const scene = compileFreeBody(data || {});
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 650, h: 420 });

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: width, h: height });
      }
    });
    ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  const thetaDeg = scene.inclineAngleDeg || 30;
  const thetaRad = (thetaDeg * Math.PI) / 180;

  // Wedge geometry
  const ox = Math.max(50, size.w * 0.12);
  const oy = Math.min(size.h - 60, 360);
  const rampLen = Math.min(size.w * 0.65, 380);

  const topX = ox + rampLen * Math.cos(thetaRad);
  const topY = oy - rampLen * Math.sin(thetaRad);

  // Block dimensions & position on incline
  const blockW = 84;
  const blockH = 54;
  const blockDist = rampLen * 0.52; // midway along the ramp

  // Point on the ramp surface
  const surfaceX = ox + blockDist * Math.cos(thetaRad);
  const surfaceY = oy - blockDist * Math.sin(thetaRad);

  // Perpendicular vector pointing outward from the ramp surface (up-left)
  const perpX = -Math.sin(thetaRad);
  const perpY = -Math.cos(thetaRad);

  // Center of the block sitting on top of the surface
  const blockCx = surfaceX + (blockH / 2) * perpX;
  const blockCy = surfaceY + (blockH / 2) * perpY;

  // Arc path for angle
  const arcRadius = 45;
  const arcEndX = ox + arcRadius * Math.cos(thetaRad);
  const arcEndY = oy - arcRadius * Math.sin(thetaRad);
  const arcPath = `M ${ox + arcRadius} ${oy} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 380, overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        aria-label={`Free-body diagram: block of ${scene.mass}kg on a ${thetaDeg} degree incline`}
      >
        <defs>
          {/* Arrow markers for each force color */}
          {Object.entries(VECTOR_COLORS).map(([name, color]) => (
            <marker
              key={name}
              id={`arrow-${name}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="4"
              orient="auto"
            >
              <path d="M 0 1 L 8 4 L 0 7 Z" fill={color} />
            </marker>
          ))}

          {/* Subtle drop shadow filter for label badges */}
          <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* 1. Ground baseline */}
        <line
          x1={ox - 30}
          y1={oy}
          x2={ox + rampLen + 60}
          y2={oy}
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="6,4"
        />

        {/* 2. Incline Wedge Triangle */}
        <path
          d={`M ${ox} ${oy} L ${topX} ${topY} L ${topX} ${oy} Z`}
          fill="#f8fafc"
          stroke="#1e293b"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Angle Arc & Label */}
        <path d={arcPath} fill="none" stroke="#d97706" strokeWidth="2" />
        <text
          x={ox + arcRadius + 8}
          y={oy - 10}
          fill="#d97706"
          fontSize="13"
          fontFamily="var(--font-mono, monospace)"
          fontWeight="700"
        >
          {thetaDeg}°
        </text>

        {/* 3. Block on the incline (rotated by -thetaDeg) */}
        <g transform={`translate(${blockCx}, ${blockCy}) rotate(${-thetaDeg})`}>
          <rect
            x={-blockW / 2}
            y={-blockH / 2}
            width={blockW}
            height={blockH}
            rx="6"
            fill="#e0f2fe"
            stroke="#0284c7"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          />
          {/* Diagonal hatch lines inside block for notebook aesthetic */}
          <line x1={-blockW / 2 + 10} y1={-blockH / 2} x2={-blockW / 2} y2={-blockH / 2 + 10} stroke="#bae6fd" strokeWidth="1.5" />
          <line x1={-blockW / 2 + 25} y1={-blockH / 2} x2={-blockW / 2} y2={-blockH / 2 + 25} stroke="#bae6fd" strokeWidth="1.5" />
          
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#0369a1"
            fontSize="14"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="700"
          >
            m = {scene.mass} kg
          </text>
        </g>

        {/* 4. Force Vectors & Smart Non-Overlapping Badges */}
        {scene.forces.map((force, i) => {
          const color = VECTOR_COLORS[force.label] || VECTOR_COLORS.net;
          const markerName = Object.keys(VECTOR_COLORS).find((k) => k === force.label) || 'net';

          // Determine start anchor on the block
          let startX = blockCx;
          let startY = blockCy;

          // Standard vector length based on force magnitude (clamped for visual clarity)
          const arrowLen = Math.max(65, Math.min(force.magnitude * 4.2, 115));
          const rad = force.angleRad;

          // Tip of the vector arrow
          const tipX = startX + arrowLen * Math.cos(rad);
          const tipY = startY - arrowLen * Math.sin(rad); // SVG Y-axis inverted

          // Badge placement slightly past the arrow tip along the vector
          const badgeOffset = 26;
          const badgeX = tipX + badgeOffset * Math.cos(rad);
          const badgeY = tipY - badgeOffset * Math.sin(rad);

          // Force label formatting
          let displaySymbol = force.label.toUpperCase();
          if (force.label === 'gravity') displaySymbol = 'mg';
          else if (force.label === 'normal') displaySymbol = 'N';
          else if (force.label === 'friction') displaySymbol = 'f';
          else if (force.label === 'applied') displaySymbol = 'F';

          const badgeText = `${displaySymbol} = ${force.magnitude.toFixed(1)} N`;
          const badgeWidth = badgeText.length * 7.5 + 16;
          const badgeHeight = 24;

          return (
            <g key={`force-${i}-${force.label}`}>
              {/* Vector arrow line */}
              <line
                x1={startX}
                y1={startY}
                x2={tipX}
                y2={tipY}
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                markerEnd={`url(#arrow-${markerName})`}
              />

              {/* Clean non-overlapping badge pill */}
              <g transform={`translate(${badgeX}, ${badgeY})`}>
                <rect
                  x={-badgeWidth / 2}
                  y={-badgeHeight / 2}
                  width={badgeWidth}
                  height={badgeHeight}
                  rx="4"
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth="1.5"
                  filter="url(#badge-shadow)"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={color}
                  fontSize="11"
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="700"
                >
                  {badgeText}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Physics HUD overlay pill (bottom-left) */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '8px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          fontSize: 12,
          fontFamily: 'var(--font-mono, monospace)',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ color: '#64748b' }}>F_net: </span>
          <strong style={{ color: scene.dynamics.netForce < 0 ? '#dc2626' : '#16a34a' }}>
            {scene.dynamics.netForce.toFixed(2)} N
          </strong>
        </div>
        <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
          <span style={{ color: '#64748b' }}>Acceleration: </span>
          <strong style={{ color: '#0f172a' }}>
            {scene.dynamics.acceleration.toFixed(2)} m/s²
          </strong>
        </div>
        <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
          <span style={{ color: '#64748b' }}>Incline: </span>
          <strong style={{ color: '#d97706' }}>{thetaDeg}°</strong>
        </div>
      </div>
    </div>
  );
}
