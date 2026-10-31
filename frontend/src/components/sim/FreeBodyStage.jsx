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
const MAX_SLIDE_PX = 130;

/**
 * Free-body diagram stage.
 * Renders an SVG canvas showing the block on the surface described by `data`
 * (a flat line, or a drawn incline rotated to the extracted angle) with
 * labelled, color-coded force arrows, and a lightweight kinematic "Play"
 * animation driven by the compiler's computed acceleration — the block
 * actually slides along the surface at s(t) = 0.5*a*t², it isn't a full
 * rigid-body physics engine (that's still open per the project's stretch
 * goals), but the motion is real, not canned.
 */
export default function FreeBodyStage({ data }) {
  const scene   = compileFreeBody(data);
  const svgRef  = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds since last play/reset
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
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

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setElapsed((prev) => {
        const next = prev + dt;
        const distPx = Math.abs(0.5 * acceleration * next * next) * PX_PER_METER;
        if (distPx >= MAX_SLIDE_PX) {
          setPlaying(false);
          return prev;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, acceleration]);

  const blockW = 80;
  const blockH = 56;
  const inclineDeg = scene.surface === 'incline' ? scene.inclineAngleDeg : 0;
  const inclineRad = (inclineDeg * Math.PI) / 180;
  const scale = 1.2;

  // Ramp geometry — a right triangle with the hypotenuse rising left to right
  // at inclineDeg, matching the angle convention the backend already uses for
  // force directions (90+incline = normal, incline = "up the slope").
  const rampW = Math.min(size.w * 0.5, 380);
  const rampH = rampW * Math.tan(inclineRad);
  const rampBaseY = size.h / 2 + 150;
  const rampLeftX = size.w / 2 - rampW * 0.58;
  const rampRightX = rampLeftX + rampW;
  const rampTopY = rampBaseY - rampH;

  // Resting point for the block, partway up the hypotenuse.
  const restT = 0.42;
  const restX = rampLeftX + restT * (rampRightX - rampLeftX);
  const restY = rampBaseY + restT * (rampTopY - rampBaseY);

  const normalRad = inclineRad + Math.PI / 2;
  const liftOff = blockH / 2 + 2;
  const baseX = inclineDeg > 0 ? restX + liftOff * Math.cos(normalRad) : size.w / 2;
  const baseY = inclineDeg > 0 ? restY - liftOff * Math.sin(normalRad) : size.h / 2 + 30;

  // Signed slide distance along the surface: positive acceleration means
  // sliding in the "up the slope" / rightward direction.
  const slideSign = Math.sign(acceleration) || 0;
  const slideDist = Math.min(0.5 * Math.abs(acceleration) * elapsed * elapsed * PX_PER_METER, MAX_SLIDE_PX);
  const slideDirRad = inclineRad; // "up the slope" direction, same convention as force angles
  const cx = baseX + slideSign * slideDist * Math.cos(slideDirRad);
  const cy = baseY - slideSign * slideDist * Math.sin(slideDirRad);

  const isStatic = Math.abs(acceleration) < 0.05;

  return (
    <>
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

        {inclineDeg > 0 ? (
          <>
            <polygon
              points={`${rampLeftX},${rampBaseY} ${rampRightX},${rampBaseY} ${rampRightX},${rampTopY}`}
              fill="#F3F0EA"
              stroke="var(--ink-2)"
              strokeWidth="2.5"
            />
            <text
              x={rampLeftX + 34}
              y={rampBaseY - 12}
              fill="var(--ink-2)"
              fontSize="12"
              fontFamily="var(--font-mono)"
            >
              {inclineDeg}°
            </text>
          </>
        ) : (
          <line
            x1={cx - 160}
            y1={baseY + blockH / 2 + 20}
            x2={cx + 160}
            y2={baseY + blockH / 2 + 20}
            stroke="var(--ink-2)"
            strokeWidth="2"
            strokeDasharray="8,4"
          />
        )}

        {/* Block, flush on the surface */}
        <g transform={`rotate(${-inclineDeg}, ${cx}, ${cy})`}>
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
        </g>

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
      </svg>

      {/* Play/Pause/Reset — kinematic slide driven by the computed acceleration */}
      <div
        style={{
          position: 'absolute', bottom: 14, left: 14,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 10, padding: '6px 8px', boxShadow: 'var(--shadow-sm)',
        }}
      >
        <button
          type="button"
          id="fbd-play-btn"
          className="btn btn-secondary btn-sm"
          disabled={isStatic}
          onClick={() => setPlaying((p) => !p)}
          title={isStatic ? 'Net force is ~0 — nothing to animate' : playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          id="fbd-reset-btn"
          className="btn btn-ghost btn-sm"
          onClick={() => { setPlaying(false); setElapsed(0); }}
          title="Reset position"
        >
          <RotateCcw size={13} />
        </button>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
          {isStatic ? 'static (Fnet ≈ 0)' : `a = ${acceleration.toFixed(2)} m/s²`}
        </span>
      </div>
    </>
  );
}
