import { useEffect, useRef, useState } from 'react';
import { compileCircuit, solveCircuit } from '../../engines/circuitCompiler.js';

/**
 * Authentic Schematic Circuit Diagram Stage.
 * Renders an electronic engineering schematic with orthogonal wires,
 * DC voltage source, IEC/zigzag resistor symbols, animated current flow,
 * voltage probes, and live nodal telemetry.
 */
export default function CircuitStage({ data, onParamChange }) {
  const scene = compileCircuit(data || {});
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 650, h: 420 });

  // Local state for interactive editing
  const batteryComp = scene.components.find((c) => c.type === 'battery') || { value: 10, label: 'V1' };
  const resistors = scene.components.filter((c) => c.type === 'resistor');

  const [vs, setVs] = useState(batteryComp.value || 10);
  const [r1, setR1] = useState(resistors[0]?.value || 2);
  const [r2, setR2] = useState(resistors[1]?.value || 4);
  const [r3, setR3] = useState(resistors[2]?.value || 6);

  // Recalculate live solution with local parameters
  const currentComponents = [
    { type: 'battery', value: vs, label: 'V1', node_a: 'GND', node_b: 'N1' },
    { type: 'resistor', value: r1, label: 'R1', node_a: 'N1', node_b: 'N2' },
    { type: 'resistor', value: r2, label: 'R2', node_a: 'N2', node_b: 'GND' },
    { type: 'resistor', value: r3, label: 'R3', node_a: 'N2', node_b: 'GND' },
  ];
  const sol = solveCircuit(currentComponents, 'V1');

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

  // Schematic Layout Coordinates
  const cx = size.w / 2;
  const cy = size.h / 2 - 15;

  const leftX = cx - 190;
  const midX = cx + 20;
  const rightX = cx + 180;

  const topY = cy - 85;
  const botY = cy + 95;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400, overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        aria-label="Schematic Series-Parallel Circuit Diagram"
      >
        <defs>
          {/* Arrow marker for current flow */}
          <marker id="current-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 7 3 L 0 6 Z" fill="#2563eb" />
          </marker>

          {/* Electron glow filter */}
          <filter id="electron-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
        </defs>

        {/* ── 1. WIRING RAILS (ORTHOGONAL LINES) ── */}

        {/* Top Rail Left to Middle: From Battery to R1 to Junction N2 */}
        <line x1={leftX} y1={topY} x2={leftX + 70} y2={topY} stroke="#1e293b" strokeWidth="2.5" />
        <line x1={leftX + 150} y1={topY} x2={rightX} y2={topY} stroke="#1e293b" strokeWidth="2.5" />

        {/* Vertical Left Rail: Voltage Source Wire */}
        <line x1={leftX} y1={topY} x2={leftX} y2={cy - 30} stroke="#1e293b" strokeWidth="2.5" />
        <line x1={leftX} y1={cy + 30} x2={leftX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

        {/* Vertical Middle Rail: R2 Branch */}
        <line x1={midX} y1={topY} x2={midX} y2={cy - 28} stroke="#1e293b" strokeWidth="2.5" />
        <line x1={midX} y1={cy + 28} x2={midX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

        {/* Vertical Right Rail: R3 Branch */}
        <line x1={rightX} y1={topY} x2={rightX} y2={cy - 28} stroke="#1e293b" strokeWidth="2.5" />
        <line x1={rightX} y1={cy + 28} x2={rightX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

        {/* Bottom Common Return (GND Rail) */}
        <line x1={leftX} y1={botY} x2={rightX} y2={botY} stroke="#1e293b" strokeWidth="2.5" />

        {/* ── 2. JUNCTION NODES (DOTS) ── */}
        <circle cx={midX} cy={topY} r="4.5" fill="#0f172a" />
        <circle cx={rightX} cy={topY} r="4.5" fill="#0f172a" />
        <circle cx={midX} cy={botY} r="4.5" fill="#0f172a" />
        <circle cx={rightX} cy={botY} r="4.5" fill="#0f172a" />

        {/* ── 3. DC VOLTAGE SOURCE (LEFT BRANCH) ── */}
        <g transform={`translate(${leftX}, ${cy})`}>
          <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#d97706" strokeWidth="2.5" />
          {/* Plus and Minus symbols */}
          <text x="0" y="-8" textAnchor="middle" fill="#dc2626" fontSize="16" fontWeight="bold">+</text>
          <text x="0" y="16" textAnchor="middle" fill="#475569" fontSize="18" fontWeight="bold">−</text>
          {/* Label Badge */}
          <g transform="translate(-54, 4)">
            <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
            <text x="0" y="4" textAnchor="middle" fill="#b45309" fontSize="12" fontWeight="bold" fontFamily="monospace">
              {vs} V
            </text>
          </g>
        </g>

        {/* ── 4. RESISTOR R1 (SERIES - TOP RAIL) ── */}
        <g transform={`translate(${leftX + 110}, ${topY})`}>
          {/* Resistor IEC/Zigzag Symbol */}
          <path
            d="M -40 0 L -30 0 L -25 -10 L -15 10 L -5 -10 L 5 10 L 15 -10 L 25 10 L 30 0 L 40 0"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Value Badge */}
          <g transform="translate(0, -24)">
            <rect x="-34" y="-11" width="68" height="22" rx="4" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
            <text x="0" y="4" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="monospace">
              R₁ = {r1} Ω
            </text>
          </g>
          {/* Current Arrow above R1 */}
          <line x1="-20" y1="20" x2="20" y2="20" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
          <text x="0" y="34" textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="bold" fontFamily="monospace">
            I₁ = {sol.currentAmps.toFixed(2)} A
          </text>
        </g>

        {/* ── 5. RESISTOR R2 (PARALLEL - MIDDLE VERTICAL BRANCH) ── */}
        <g transform={`translate(${midX}, ${cy})`}>
          {/* Vertical Zigzag Resistor */}
          <path
            d="M 0 -28 L 0 -20 L -10 -15 L 10 -5 L -10 5 L 10 15 L 0 20 L 0 28"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Value Badge */}
          <g transform="translate(38, 0)">
            <rect x="-30" y="-11" width="60" height="22" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
            <text x="0" y="4" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold" fontFamily="monospace">
              R₂ = {r2} Ω
            </text>
          </g>
          {/* Current Branch indicator */}
          <g transform="translate(-24, 0)">
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
            <text x="-6" y="4" textAnchor="end" fill="#15803d" fontSize="10" fontWeight="bold" fontFamily="monospace">
              I₂={sol.branchCurrents['R2'] ? sol.branchCurrents['R2'].toFixed(2) : (sol.currentAmps * (r3 / (r2 + r3))).toFixed(2)}A
            </text>
          </g>
        </g>

        {/* ── 6. RESISTOR R3 (PARALLEL - RIGHT VERTICAL BRANCH) ── */}
        <g transform={`translate(${rightX}, ${cy})`}>
          {/* Vertical Zigzag Resistor */}
          <path
            d="M 0 -28 L 0 -20 L -10 -15 L 10 -5 L -10 5 L 10 15 L 0 20 L 0 28"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Value Badge */}
          <g transform="translate(38, 0)">
            <rect x="-30" y="-11" width="60" height="22" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
            <text x="0" y="4" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold" fontFamily="monospace">
              R₃ = {r3} Ω
            </text>
          </g>
          {/* Current Branch indicator */}
          <g transform="translate(-24, 0)">
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#current-arrow)" />
            <text x="-6" y="4" textAnchor="end" fill="#15803d" fontSize="10" fontWeight="bold" fontFamily="monospace">
              I₃={sol.branchCurrents['R3'] ? sol.branchCurrents['R3'].toFixed(2) : (sol.currentAmps * (r2 / (r2 + r3))).toFixed(2)}A
            </text>
          </g>
        </g>

        {/* ── 7. VOLTAGE PROBE TAGS (PINS) ── */}
        {/* Source Rail Voltage Probe */}
        <g transform={`translate(${leftX + 25}, ${topY - 14})`}>
          <rect x="-24" y="-9" width="48" height="18" rx="3" fill="#dc2626" />
          <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
            {vs.toFixed(1)}V
          </text>
        </g>

        {/* Junction Voltage Probe (Vp) */}
        <g transform={`translate(${midX + 70}, ${topY - 14})`}>
          <rect x="-26" y="-9" width="52" height="18" rx="3" fill="#2563eb" />
          <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
            Vp={sol.nodeVoltages['MID'] ? sol.nodeVoltages['MID'].toFixed(2) : (vs - sol.currentAmps * r1).toFixed(2)}V
          </text>
        </g>

        {/* Ground Symbol (Bottom Rail) */}
        <g transform={`translate(${cx}, ${botY + 2})`}>
          <line x1="0" y1="0" x2="0" y2="10" stroke="#475569" strokeWidth="2" />
          <line x1="-12" y1="10" x2="12" y2="10" stroke="#475569" strokeWidth="2" />
          <line x1="-8" y1="14" x2="8" y2="14" stroke="#475569" strokeWidth="1.5" />
          <line x1="-4" y1="18" x2="4" y2="18" stroke="#475569" strokeWidth="1" />
          <text x="22" y="16" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="monospace">GND (0.0V)</text>
        </g>
      </svg>

      {/* ── 8. LIVE SCHEMATIC TELEMETRY HUD (MATCHING STUDENT NOTEBOOK) ── */}
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
          <span style={{ color: '#64748b' }}>Parallel Rp: </span>
          <strong style={{ color: '#16a34a' }}>
            {sol.parallelResistance ? sol.parallelResistance.toFixed(2) : ((r2 * r3) / (r2 + r3)).toFixed(2)} Ω
          </strong>
        </div>

        <div>
          <span style={{ color: '#64748b' }}>Total Req: </span>
          <strong style={{ color: '#0f172a' }}>{sol.equivalentResistance.toFixed(2)} Ω</strong>
        </div>

        <div>
          <span style={{ color: '#64748b' }}>Total Current (I): </span>
          <strong style={{ color: '#2563eb' }}>{sol.currentAmps.toFixed(2)} A</strong>
        </div>

        <div>
          <span style={{ color: '#64748b' }}>Branch Vp: </span>
          <strong style={{ color: '#b45309' }}>
            {sol.nodeVoltages['MID'] ? sol.nodeVoltages['MID'].toFixed(2) : (vs - sol.currentAmps * r1).toFixed(2)} V
          </strong>
        </div>

        <div>
          <span style={{ color: '#64748b' }}>Total Power: </span>
          <strong style={{ color: '#7c3aed' }}>{sol.powerWatts.toFixed(1)} W</strong>
        </div>
      </div>
    </div>
  );
}
