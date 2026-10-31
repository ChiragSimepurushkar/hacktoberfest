import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { compileFreeBody } from '../../engines/freeBodyCompiler.js';
import { canonicalForceKey } from '../../lib/forceLabels.js';

const VECTOR_COLORS = {
  gravity:  '#D9531E',
  normal:   '#2F5FD0',
  applied:  '#C0392B',
  friction: '#1F8A4C',
  net:      '#14181F',
};

const PX_PER_METER = 18;
const SLIDE_MARGIN = 30; // keep the block clear of the wedge ends while sliding

/**
 * Free-body diagram stage.
 * Renders an incline wedge (or flat ground) with the block rotated flush
 * onto the surface, color-coded force vectors with non-overlapping label
 * badges, and a lightweight kinematic "Play" animation driven by the net
 * force along the surface — the block actually slides at s(t) = 0.5*a*t²,
 * it isn't a full rigid-body physics engine (that's still open per the
 * project's stretch goals), but the motion is real, not canned.
 */
export default function FreeBodyStage({ data }) {
  const scene   = compileFreeBody(data || {});
  const svgRef  = useRef(null);
  const [size, setSize] = useState({ w: 650, h: 420 });
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  // A parameter edit invalidates any in-flight slide — stop and reset it.
  useEffect(() => {
    setPlaying(false);
    setElapsed(0);
  }, [data]);

  const acceleration = scene.accelerationAlongSurface || 0;
  const isStatic = Math.abs(acceleration) < 0.05;

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setElapsed((prev) => prev + dt);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);

  const thetaDeg = scene.surface === 'incline' ? scene.inclineAngleDeg : 0;
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const blockW = 84;
  const blockH = 54;

  // Wedge geometry: origin at the acute (theta) corner, rising to a vertical
  // right edge, matching the physics convention already used for force
  // angles (0 = flat/rightward, 90+theta = normal, theta = "up the slope").
  const ox = Math.max(50, size.w * 0.12);
  const oy = Math.min(size.h - 60, size.h / 2 + 150);
  const rampLen = Math.min(size.w * 0.65, 380);
  const topX = ox + rampLen * Math.cos(thetaRad);
  const topY = oy - rampLen * Math.sin(thetaRad);

  // Slide distance along the ramp, clamped so the block stays on it.
  const maxSlidePx = Math.max(0, rampLen * 0.4 - SLIDE_MARGIN);
  const slideSign = Math.sign(acceleration) || 0;
  const rawSlidePx = 0.5 * Math.abs(acceleration) * elapsed * elapsed * PX_PER_METER;
  const slidePx = Math.min(rawSlidePx, maxSlidePx);
  useEffect(() => {
    if (playing && rawSlidePx >= maxSlidePx) setPlaying(false);
  }, [rawSlidePx, maxSlidePx, playing]);

  const restDist = thetaDeg > 0 ? rampLen * 0.42 : size.w * 0.4;
  const blockDist = restDist + slideSign * slidePx;

  const surfaceX = thetaDeg > 0 ? ox + blockDist * Math.cos(thetaRad) : blockDist;
  const surfaceY = thetaDeg > 0 ? oy - blockDist * Math.sin(thetaRad) : oy;
  const perpX = thetaDeg > 0 ? -Math.sin(thetaRad) : 0;
  const perpY = thetaDeg > 0 ? -Math.cos(thetaRad) : -1;
  const blockCx = surfaceX + (blockH / 2) * perpX;
  const blockCy = surfaceY + (blockH / 2) * perpY;

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
        style={{ position: 'absolute', inset: 0 }}
        aria-label={`Free-body diagram: block of ${scene.mass}kg with ${scene.forces.length} forces`}
      >
        <defs>
          {Object.entries(VECTOR_COLORS).map(([name, color]) => (
            <marker key={name} id={`arrow-${name}`} markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
              <path d="M 0 1 L 8 4 L 0 7 Z" fill={color} />
            </marker>
          ))}
          <filter id="fbd-badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>

        {thetaDeg > 0 ? (
          <>
            <line x1={ox - 30} y1={oy} x2={ox + rampLen + 60} y2={oy} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,4" />
            <path d={`M ${ox} ${oy} L ${topX} ${topY} L ${topX} ${oy} Z`} fill="#f8fafc" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={arcPath} fill="none" stroke="#d97706" strokeWidth="2" />
            <text x={ox + arcRadius + 8} y={oy - 10} fill="#d97706" fontSize="13" fontFamily="var(--font-mono)" fontWeight="700">
              {thetaDeg}°
            </text>
          </>
        ) : (
          <line
            x1={blockCx - 180} y1={oy + blockH / 2 + 2}
            x2={blockCx + 180} y2={oy + blockH / 2 + 2}
            stroke="var(--ink-2)" strokeWidth="2" strokeDasharray="8,4"
          />
        )}

        {/* Block, flush on the surface */}
        <g transform={`translate(${blockCx}, ${blockCy}) rotate(${-thetaDeg})`}>
          <rect
            x={-blockW / 2} y={-blockH / 2} width={blockW} height={blockH} rx="6"
            fill="#e0f2fe" stroke="#0284c7" strokeWidth="2"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          />
          <line x1={-blockW / 2 + 10} y1={-blockH / 2} x2={-blockW / 2} y2={-blockH / 2 + 10} stroke="#bae6fd" strokeWidth="1.5" />
          <line x1={-blockW / 2 + 25} y1={-blockH / 2} x2={-blockW / 2} y2={-blockH / 2 + 25} stroke="#bae6fd" strokeWidth="1.5" />
          <text x="0" y="4" textAnchor="middle" fill="#0369a1" fontSize="14" fontFamily="var(--font-mono)" fontWeight="700">
            m = {scene.mass} kg
          </text>
        </g>

        {/* Force vectors with non-overlapping badges */}
        {scene.forces.map((force, i) => {
          const forceKey = canonicalForceKey(force.label);
          const color = VECTOR_COLORS[forceKey] || '#888';
          const markerName = VECTOR_COLORS[forceKey] ? forceKey : 'net';
          const rad = force.angleRad;
          const arrowLen = Math.max(65, Math.min(force.magnitude * 4.2, 115));
          const tipX = blockCx + arrowLen * Math.cos(rad);
          const tipY = blockCy - arrowLen * Math.sin(rad);
          const badgeOffset = 26;
          const badgeX = tipX + badgeOffset * Math.cos(rad);
          const badgeY = tipY - badgeOffset * Math.sin(rad);
          const displaySymbol = forceKey === 'gravity' ? 'mg' : forceKey === 'friction' ? 'f'
            : forceKey === 'normal' ? 'N' : forceKey === 'applied' ? 'F'
            : force.label.charAt(0).toUpperCase() + force.label.slice(1);
          const badgeText = `${displaySymbol} = ${force.magnitude.toFixed(1)} N`;
          const badgeWidth = badgeText.length * 7.5 + 16;
          const badgeHeight = 24;

          return (
            <g key={`force-${i}-${force.label}`}>
              <line
                x1={blockCx} y1={blockCy} x2={tipX} y2={tipY}
                stroke={color} strokeWidth="2.5" strokeLinecap="round"
                markerEnd={`url(#arrow-${markerName})`}
              />
              <g transform={`translate(${badgeX}, ${badgeY})`}>
                <rect
                  x={-badgeWidth / 2} y={-badgeHeight / 2} width={badgeWidth} height={badgeHeight} rx="4"
                  fill="#ffffff" stroke={color} strokeWidth="1.5" filter="url(#fbd-badge-shadow)"
                />
                <text x="0" y="4" textAnchor="middle" fill={color} fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">
                  {badgeText}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Telemetry + Play/Pause/Reset */}
      <div
        style={{
          position: 'absolute', bottom: 16, left: 16,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
          border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 12, fontFamily: 'var(--font-mono)',
          display: 'flex', gap: 12, alignItems: 'center',
        }}
      >
        <button
          type="button" id="fbd-play-btn" className="btn btn-secondary btn-sm"
          disabled={isStatic}
          onClick={() => setPlaying((p) => !p)}
          title={isStatic ? 'Net force is ~0 — nothing to animate' : playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button" id="fbd-reset-btn" className="btn btn-ghost btn-sm"
          onClick={() => { setPlaying(false); setElapsed(0); }}
          title="Reset position"
        >
          <RotateCcw size={13} />
        </button>
        <span style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 10, color: '#64748b' }}>
          a = <strong style={{ color: '#0f172a' }}>{acceleration.toFixed(2)} m/s²</strong>
        </span>
      </div>
    </div>
  );
}
