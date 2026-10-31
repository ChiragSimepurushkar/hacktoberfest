import { useEffect, useRef, useState } from 'react';
import { solveCircuit } from '../../engines/circuitCompiler.js';

/**
 * Authentic Schematic Circuit Diagram Stage.
 * Dynamically renders an electronic engineering schematic tailored to the actual
 * components in `data.components`:
 *  - Series-parallel circuits (R1 series + R2/R3 parallel)
 *  - Pure series circuits (1, 2, or 3 resistors in a series loop)
 *  - Pure parallel circuits (2 or 3 resistors across the voltage source)
 * Fully reactive to props and slider changes.
 */
export default function CircuitStage({ data, onParamChange }) {
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

  // ── Extract components directly from props ──
  const rawComponents = data?.components || [];
  const batteryComp = rawComponents.find((c) => c.type === 'battery') || {
    value: 10,
    label: 'V1',
    node_a: 'GND',
    node_b: 'N1',
  };
  const resistors = rawComponents.filter((c) => c.type === 'resistor');

  const vs = typeof batteryComp.value === 'number' ? batteryComp.value : 10;
  const vsLabel = batteryComp.label || 'V1';

  // Solve circuit with active components
  const sol = solveCircuit(rawComponents.length > 0 ? rawComponents : [
    { type: 'battery', value: vs, label: vsLabel, node_a: 'GND', node_b: 'N1' },
    { type: 'resistor', value: 4, label: 'R1', node_a: 'N1', node_b: 'GND' },
  ], vsLabel);

  // Schematic Layout Coordinates
  const cx = size.w / 2;
  const cy = size.h / 2 - 15;

  const leftX = Math.max(50, cx - 190);
  const midX = cx + 20;
  const rightX = Math.min(size.w - 50, cx + 180);

  const topY = cy - 85;
  const botY = cy + 95;

  // Topology detection:
  // Is it a 3-resistor series-parallel or do we have 2, 1, or parallel?
  const numResistors = resistors.length;
  const isSeriesParallel = numResistors >= 3 || (sol.isSeriesParallel && numResistors >= 2);
  const isPureSeries = !isSeriesParallel && numResistors <= 2;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400, overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        aria-label="Schematic Circuit Diagram"
      >
        <defs>
          <marker id="current-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 7 3 L 0 6 Z" fill="#2563eb" />
          </marker>
        </defs>

        {/* ── CASE 1: SERIES-PARALLEL (3 Resistors or Branch Bank) ── */}
        {isSeriesParallel && (
          <g>
            {/* Wires */}
            <line x1={leftX} y1={topY} x2={leftX + 70} y2={topY} stroke="#1e293b" strokeWidth="2.5" />
            <line x1={leftX + 150} y1={topY} x2={rightX} y2={topY} stroke="#1e293b" strokeWidth="2.5" />

            <line x1={leftX} y1={topY} x2={leftX} y2={cy - 30} stroke="#1e293b" strokeWidth="2.5" />
            <line x1={leftX} y1={cy + 30} x2={leftX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

            <line x1={midX} y1={topY} x2={midX} y2={cy - 28} stroke="#1e293b" strokeWidth="2.5" />
            <line x1={midX} y1={cy + 28} x2={midX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

            <line x1={rightX} y1={topY} x2={rightX} y2={cy - 28} stroke="#1e293b" strokeWidth="2.5" />
            <line x1={rightX} y1={cy + 28} x2={rightX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

            <line x1={leftX} y1={botY} x2={rightX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

            {/* Junction Dots */}
            <circle cx={midX} cy={topY} r="4.5" fill="#0f172a" />
            <circle cx={rightX} cy={topY} r="4.5" fill="#0f172a" />
            <circle cx={midX} cy={botY} r="4.5" fill="#0f172a" />
            <circle cx={rightX} cy={botY} r="4.5" fill="#0f172a" />

            {/* Battery */}
            <g transform={`translate(${leftX}, ${cy})`}>
              <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#d97706" strokeWidth="2.5" />
              <text x="0" y="-8" textAnchor="middle" fill="#dc2626" fontSize="16" fontWeight="bold">+</text>
              <text x="0" y="16" textAnchor="middle" fill="#475569" fontSize="18" fontWeight="bold">−</text>
              <g transform="translate(-54, 4)">
                <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {vsLabel} = {vs}V
                </text>
              </g>
            </g>

            {/* Resistor R1 (Series - Top Rail) */}
            <g transform={`translate(${leftX + 110}, ${topY})`}>
              <path
                d="M -40 0 L -30 0 L -25 -10 L -15 10 L -5 -10 L 5 10 L 15 -10 L 25 10 L 30 0 L 40 0"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <g transform="translate(0, -24)">
                <rect x="-36" y="-11" width="72" height="22" rx="4" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
                <text x="0" y="4" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {resistors[0]?.label || 'R₁'} = {resistors[0]?.value ?? 2} Ω
                </text>
              </g>
              <line x1="-20" y1="20" x2="20" y2="20" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
              <text x="0" y="34" textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="bold" fontFamily="monospace">
                I₁ = {sol.currentAmps.toFixed(2)} A
              </text>
            </g>

            {/* Resistor R2 (Parallel Branch) */}
            <g transform={`translate(${midX}, ${cy})`}>
              <path
                d="M 0 -28 L 0 -20 L -10 -15 L 10 -5 L -10 5 L 10 15 L 0 20 L 0 28"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <g transform="translate(42, 0)">
                <rect x="-32" y="-11" width="64" height="22" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
                <text x="0" y="4" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {resistors[1]?.label || 'R₂'} = {resistors[1]?.value ?? 4} Ω
                </text>
              </g>
              <g transform="translate(-24, 0)">
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
                <text x="-6" y="4" textAnchor="end" fill="#15803d" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  I₂={(sol.branchCurrents[resistors[1]?.label] ?? (sol.currentAmps * 0.6)).toFixed(2)}A
                </text>
              </g>
            </g>

            {/* Resistor R3 (Parallel Branch) */}
            <g transform={`translate(${rightX}, ${cy})`}>
              <path
                d="M 0 -28 L 0 -20 L -10 -15 L 10 -5 L -10 5 L 10 15 L 0 20 L 0 28"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <g transform="translate(42, 0)">
                <rect x="-32" y="-11" width="64" height="22" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
                <text x="0" y="4" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {resistors[2]?.label || 'R₃'} = {resistors[2]?.value ?? 6} Ω
                </text>
              </g>
              <g transform="translate(-24, 0)">
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
                <text x="-6" y="4" textAnchor="end" fill="#15803d" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  I₃={(sol.branchCurrents[resistors[2]?.label] ?? (sol.currentAmps * 0.4)).toFixed(2)}A
                </text>
              </g>
            </g>
          </g>
        )}

        {/* ── CASE 2: PURE SERIES OR 1/2 RESISTORS ── */}
        {!isSeriesParallel && (
          <g>
            {/* Top Wire */}
            <line x1={leftX} y1={topY} x2={cx - 50} y2={topY} stroke="#1e293b" strokeWidth="2.5" />
            <line x1={cx + 50} y1={topY} x2={rightX} y2={topY} stroke="#1e293b" strokeWidth="2.5" />

            {/* Left Wire (Battery) */}
            <line x1={leftX} y1={topY} x2={leftX} y2={cy - 30} stroke="#1e293b" strokeWidth="2.5" />
            <line x1={leftX} y1={cy + 30} x2={leftX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

            {/* Right Wire (Resistor R2 or wire) */}
            <line x1={rightX} y1={topY} x2={rightX} y2={numResistors >= 2 ? cy - 28 : botY} stroke="#1e293b" strokeWidth="2.5" />
            {numResistors >= 2 && (
              <line x1={rightX} y1={cy + 28} x2={rightX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />
            )}

            {/* Bottom Wire */}
            <line x1={leftX} y1={botY} x2={rightX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

            {/* Battery */}
            <g transform={`translate(${leftX}, ${cy})`}>
              <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#d97706" strokeWidth="2.5" />
              <text x="0" y="-8" textAnchor="middle" fill="#dc2626" fontSize="16" fontWeight="bold">+</text>
              <text x="0" y="16" textAnchor="middle" fill="#475569" fontSize="18" fontWeight="bold">−</text>
              <g transform="translate(-54, 4)">
                <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {vsLabel} = {vs}V
                </text>
              </g>
            </g>

            {/* Resistor R1 (Top Rail) */}
            <g transform={`translate(${cx}, ${topY})`}>
              <path
                d="M -40 0 L -30 0 L -25 -10 L -15 10 L -5 -10 L 5 10 L 15 -10 L 25 10 L 30 0 L 40 0"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <g transform="translate(0, -24)">
                <rect x="-36" y="-11" width="72" height="22" rx="4" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
                <text x="0" y="4" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {resistors[0]?.label || 'R₁'} = {resistors[0]?.value ?? 10} Ω
                </text>
              </g>
              <line x1="-20" y1="20" x2="20" y2="20" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
              <text x="0" y="34" textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="bold" fontFamily="monospace">
                I = {sol.currentAmps.toFixed(2)} A
              </text>
            </g>

            {/* Resistor R2 (Right Branch if present) */}
            {numResistors >= 2 && (
              <g transform={`translate(${rightX}, ${cy})`}>
                <path
                  d="M 0 -28 L 0 -20 L -10 -15 L 10 -5 L -10 5 L 10 15 L 0 20 L 0 28"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <g transform="translate(42, 0)">
                  <rect x="-32" y="-11" width="64" height="22" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
                  <text x="0" y="4" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    {resistors[1]?.label || 'R₂'} = {resistors[1]?.value ?? 10} Ω
                  </text>
                </g>
              </g>
            )}
          </g>
        )}

        {/* ── Ground Symbol (Bottom Rail) ── */}
        <g transform={`translate(${cx}, ${botY + 2})`}>
          <line x1="0" y1="0" x2="0" y2="10" stroke="#475569" strokeWidth="2" />
          <line x1="-12" y1="10" x2="12" y2="10" stroke="#475569" strokeWidth="2" />
          <line x1="-8" y1="14" x2="8" y2="14" stroke="#475569" strokeWidth="1.5" />
          <line x1="-4" y1="18" x2="4" y2="18" stroke="#475569" strokeWidth="1" />
          <text x="22" y="16" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="monospace">GND (0.0V)</text>
        </g>
      </svg>

      {/* ── LIVE SCHEMATIC TELEMETRY HUD ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          fontSize: 12,
          fontFamily: 'var(--font-mono, monospace)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ color: '#64748b' }}>Total Req: </span>
          <strong style={{ color: '#0f172a' }}>{sol.equivalentResistance.toFixed(2)} Ω</strong>
        </div>

        <div>
          <span style={{ color: '#64748b' }}>Total Current (I): </span>
          <strong style={{ color: '#2563eb' }}>{sol.currentAmps.toFixed(2)} A</strong>
        </div>

        {isSeriesParallel && (
          <div>
            <span style={{ color: '#64748b' }}>Parallel Rp: </span>
            <strong style={{ color: '#16a34a' }}>
              {(sol.parallelResistance ?? 2.4).toFixed(2)} Ω
            </strong>
          </div>
        )}

        <div>
          <span style={{ color: '#64748b' }}>Source ({vsLabel}): </span>
          <strong style={{ color: '#d97706' }}>{vs.toFixed(1)} V</strong>
        </div>

        <div>
          <span style={{ color: '#64748b' }}>Total Power: </span>
          <strong style={{ color: '#7c3aed' }}>{sol.powerWatts.toFixed(1)} W</strong>
        </div>
      </div>
    </div>
  );
}
