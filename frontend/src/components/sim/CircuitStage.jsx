import { compileCircuit } from '../../engines/circuitCompiler.js';

/**
 * Circuit diagram stage.
 * Renders a simple SVG schematic from the compiled node/component data.
 * TODO: Replace with CircuitJS iframe embed once Dev B confirms embedding method.
 */
export default function CircuitStage({ data }) {
  const scene = compileCircuit(data);
  const { nodes, components } = scene;

  const W = 500;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;

  // Position nodes in a circle
  const nodePositions = {};
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    const r = Math.min(cx, cy) - 60;
    nodePositions[node] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0 }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label={`Circuit diagram with ${components.length} components`}
    >
      {/* Component edges */}
      {components.map((c, i) => {
        const from = nodePositions[c.node_a];
        const to   = nodePositions[c.node_b];
        if (!from || !to) return null;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const color = c.type === 'battery' ? 'var(--vec-gravity)' : 'var(--info)';

        return (
          <g key={i}>
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color} strokeWidth="2"
              strokeDasharray={c.type === 'battery' ? '' : '6,3'}
            />
            {/* Component label */}
            <rect
              x={mx - 32} y={my - 10}
              width={64} height={20}
              rx="4"
              fill="white"
              stroke={color}
              strokeWidth="1"
            />
            <text
              x={mx} y={my + 5}
              textAnchor="middle"
              fill={color}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fontWeight="600"
            >
              {c.type === 'battery'
                ? `${c.value}V`
                : `${c.value}Ω`}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = nodePositions[node];
        return (
          <g key={node}>
            <circle cx={pos.x} cy={pos.y} r={16} fill="white" stroke="var(--navy)" strokeWidth="2" />
            <text
              x={pos.x} y={pos.y + 5}
              textAnchor="middle"
              fill="var(--navy)"
              fontSize="12"
              fontFamily="var(--font-mono)"
              fontWeight="700"
            >
              {node}
            </text>
          </g>
        );
      })}

      {/* Label */}
      <text x={10} y={H - 10} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">
        Circuit — {components.length} components
      </text>
    </svg>
  );
}
