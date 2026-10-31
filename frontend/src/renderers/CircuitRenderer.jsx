import { useState, useEffect, useRef } from "react";
import { compileCircuit, solveCircuit } from "../engines/circuitCompiler";
import ParamSlider from "../components/controls/ParamSlider";

/**
 * Circuit diagram renderer.
 * Features live DC nodal circuit solving and animated electron flow.
 */
export default function CircuitRenderer({ data }) {
  const scene = compileCircuit(data);
  const [components, setComponents] = useState(scene.components);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const solution = solveCircuit(components, scene.source);

  function updateComponent(index, value) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, value } : c))
    );
  }

  // Interactive Circuit Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let t = 0;

    function render() {
      t += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sol = solveCircuit(components, scene.source);
      const battery = components.find((c) => c.type === "battery") || { value: 9 };
      const r1 = components.find((c) => c.label === "R1" || c.type === "resistor") || { value: 220 };
      const r2 = components.filter((c) => c.type === "resistor")[1] || { value: 330 };

      // Wire Rect Coordinates
      const rx = 120, ry = 60, rw = 340, rh = 180;

      // Draw Main Circuit Wire Loop
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.strokeRect(rx, ry, rw, rh);

      // Battery at (rx, ry + rh/2)
      const batY = ry + rh / 2;
      ctx.fillStyle = "#030712";
      ctx.fillRect(rx - 15, batY - 25, 30, 50);

      // Battery Plates
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(rx - 12, batY - 10); ctx.lineTo(rx + 12, batY - 10); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(rx - 6, batY + 10); ctx.lineTo(rx + 6, batY + 10); ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`+ ${battery.value}V -`, rx - 65, batY + 4);

      // Resistor R1 at top wire (rx + rw/2, ry)
      const r1X = rx + rw / 2;
      ctx.fillStyle = "#030712";
      ctx.fillRect(r1X - 40, ry - 15, 80, 30);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.5;
      drawZigZag(ctx, r1X - 35, ry, r1X + 35, ry);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "11px monospace";
      ctx.fillText(`R1 = ${r1.value}Ω`, r1X - 25, ry - 20);

      // Resistor R2 on right wire (rx + rw, ry + rh/2)
      const r2Y = ry + rh / 2;
      ctx.fillStyle = "#030712";
      ctx.fillRect(rx + rw - 15, r2Y - 35, 30, 70);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      drawZigZagVertical(ctx, rx + rw, r2Y - 30, rx + rw, r2Y + 30);
      ctx.fillStyle = "#10b981";
      ctx.font = "11px monospace";
      ctx.fillText(`R2 = ${r2.value}Ω`, rx + rw + 15, r2Y + 4);

      // Node Terminals
      drawNode(ctx, rx, ry, `Node B (${battery.value}V)`);
      drawNode(ctx, rx + rw, ry, `Node C (${(sol.nodeVoltages["C"] || 5.4).toFixed(1)}V)`);
      drawNode(ctx, rx, ry + rh, "Node A (0V / GND)");

      // Electron particle animation
      const perimeter = 2 * (rw + rh);
      const speed = Math.min(2.5, Math.max(0.2, (sol.currentMilliAmps / 10) * 1.2));
      const numElectrons = 12;

      ctx.fillStyle = "#00f2fe";
      ctx.shadowColor = "#00f2fe";
      ctx.shadowBlur = 8;
      for (let i = 0; i < numElectrons; i++) {
        const dist = ((i / numElectrons) * perimeter + t * speed * 30) % perimeter;
        const pt = getPointOnRect(dist, rx, ry, rw, rh);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [components, scene]);

  return (
    <div style={{ maxWidth: 620, background: "#0d1117", padding: "1rem", borderRadius: "12px", border: "1px solid #30363d", color: "#c9d1d9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#58a6ff" }}>Circuit Simulator (CircuitJS Engine)</h3>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "monospace" }}>
          <span style={{ background: "#161b22", padding: "2px 8px", borderRadius: "4px", border: "1px solid #30363d" }}>
            Current: <strong style={{ color: "#38bdf8" }}>{solution.currentMilliAmps.toFixed(2)} mA</strong>
          </span>
          <span style={{ background: "#161b22", padding: "2px 8px", borderRadius: "4px", border: "1px solid #30363d" }}>
            Req: <strong style={{ color: "#34d399" }}>{solution.equivalentResistance.toFixed(0)} Ω</strong>
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={580}
        height={300}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px", border: "1px solid #21262d" }}
      />

      {/* Component value sliders */}
      <div style={{ marginTop: "1rem" }}>
        <h4 style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "0.5rem" }}>Interactive Component Netlist</h4>
        {components.map((c, i) => {
          const traceEntry = data?.audit?.inference_trace?.find(
            (t) => t.field === `components[${i}].value`
          );
          return (
            <ParamSlider
              key={`${c.label || c.type}-${i}`}
              label={`${c.label || c.type} (${c.type === "battery" ? "V" : "Ω"})`}
              value={c.value}
              min={c.type === "battery" ? 1 : 10}
              max={c.type === "battery" ? 24 : 1000}
              step={c.type === "battery" ? 0.5 : 10}
              onChange={(v) => updateComponent(i, v)}
              inferred={traceEntry?.source === "inferred"}
            />
          );
        })}
      </div>
    </div>
  );
}

function drawZigZag(ctx, x1, y1, x2, y2) {
  const steps = 6;
  const dx = (x2 - x1) / steps;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) {
    const yOff = (i % 2 === 1) ? -8 : 8;
    ctx.lineTo(x1 + i * dx, y1 + yOff);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawZigZagVertical(ctx, x1, y1, x2, y2) {
  const steps = 6;
  const dy = (y2 - y1) / steps;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) {
    const xOff = (i % 2 === 1) ? -8 : 8;
    ctx.lineTo(x1 + xOff, y1 + i * dy);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawNode(ctx, x, y, label) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "10px monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(label, x + 8, y + 12);
}

function getPointOnRect(d, rx, ry, rw, rh) {
  if (d < rw) return { x: rx + d, y: ry };
  d -= rw;
  if (d < rh) return { x: rx + rw, y: ry + d };
  d -= rh;
  if (d < rw) return { x: rx + rw - d, y: ry + rh };
  d -= rw;
  return { x: rx, y: ry + rh - d };
}
