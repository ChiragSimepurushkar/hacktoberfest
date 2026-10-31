import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { compileFreeBody } from "../engines/freeBodyCompiler";
import ParamSlider from "../components/controls/ParamSlider";

/**
 * Free-body diagram renderer.
 * TODO: wire up Matter.js for actual physics simulation.
 * Currently renders a placeholder Three.js scene.
 */
export default function FreeBodyRenderer({ data }) {
  const scene = compileFreeBody(data);
  const [forces, setForces] = useState(scene.forces);

  function updateForce(index, magnitude) {
    setForces((prev) => prev.map((f, i) => (i === index ? { ...f, magnitude } : f)));
    // TODO: call scene engine's onParamChange with updated forces
  }

  return (
    <div>
      {/* Three.js canvas — placeholder until Matter.js wired */}
      <Canvas style={{ height: 400, width: 600 }}>
        <ambientLight />
        <OrbitControls />
        {/* TODO: render box (mass) + ArrowHelpers for each force */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="skyblue" />
        </mesh>
      </Canvas>

      {/* Force sliders */}
      {forces.map((f, i) => {
        const traceEntry = data?.audit?.inference_trace?.find(
          (t) => t.field === `forces[${i}].magnitude` || (f.label && t.field.includes(f.label))
        );
        return (
          <ParamSlider
            key={f.label}
            label={`${f.label} (N)`}
            value={f.magnitude}
            min={0}
            max={100}
            step={0.5}
            onChange={(v) => updateForce(i, v)}
            inferred={traceEntry?.source === "inferred"}
            reasoning={traceEntry?.reasoning || ""}
          />
        );
      })}
    </div>
  );
}
