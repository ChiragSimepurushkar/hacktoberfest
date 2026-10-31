import { useState } from "react";
import { compileCircuit } from "../engines/circuitCompiler";
import ParamSlider from "../components/controls/ParamSlider";

/**
 * Circuit diagram renderer.
 * TODO: embed CircuitJS iframe for live simulation.
 * Currently renders a simple SVG node-component list as placeholder.
 */
export default function CircuitRenderer({ data }) {
  const scene = compileCircuit(data);
  const [components, setComponents] = useState(scene.components);

  function updateComponent(index, value) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, value } : c)));
    // TODO: push updated value to CircuitJS simulation
  }

  return (
    <div>
      {/* TODO: replace with CircuitJS iframe embed */}
      <svg width={400} height={200} style={{ border: "1px solid #ccc" }}>
        <text x={10} y={20} fontSize={12}>Circuit placeholder — CircuitJS embed goes here</text>
        {scene.nodes.map((n, i) => (
          <circle key={n} cx={60 + i * 80} cy={100} r={20} fill="#eee" stroke="#333" />
        ))}
        {scene.nodes.map((n, i) => (
          <text key={`l${n}`} x={50 + i * 80} y={105} fontSize={12}>{n}</text>
        ))}
      </svg>

      {/* Component value sliders */}
      {components.map((c, i) => (
        <ParamSlider
          key={`${c.label}-${i}`}
          label={`${c.label || c.type} (${c.type === "battery" ? "V" : "Ω"})`}
          value={c.value}
          min={0}
          max={c.type === "battery" ? 30 : 10000}
          step={c.type === "battery" ? 0.1 : 10}
          onChange={(v) => updateComponent(i, v)}
          inferred={false}
        />
      ))}
    </div>
  );
}
