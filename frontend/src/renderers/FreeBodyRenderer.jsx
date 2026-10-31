import { useState, useEffect, useRef } from "react";
import { compileFreeBody, calculateDynamics } from "../engines/freeBodyCompiler";
import ParamSlider from "../components/controls/ParamSlider";

/**
 * Free-body diagram renderer.
 * Powered by deterministic physics compiler and real-time vector dynamics.
 */
export default function FreeBodyRenderer({ data }) {
  const scene = compileFreeBody(data);
  const [forces, setForces] = useState(scene.forces);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Dynamic simulation parameters
  const dynamics = calculateDynamics(
    scene.mass,
    scene.inclineAngleDeg,
    scene.frictionCoeff,
    forces
  );

  function updateForce(index, magnitude) {
    setForces((prev) =>
      prev.map((f, i) => (i === index ? { ...f, magnitude } : f))
    );
  }

  // Interactive 60 FPS Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let t = 0;
    let blockOffset = 0;
    let blockVel = 0;

    function render() {
      t += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark technical background
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = "#0e1a2e";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Physics dynamics calculation
      const dyn = calculateDynamics(scene.mass, scene.inclineAngleDeg, scene.frictionCoeff, forces);
      blockVel += dyn.acceleration * 0.02;
      blockOffset += blockVel * 0.7;
      if (blockOffset > 100) { blockOffset = 100; blockVel = 0; }
      if (blockOffset < -100) { blockOffset = -100; blockVel = 0; }

      const thetaRad = dyn.inclineAngleRad;
      const baseX = 120;
      const baseY = 290;
      const len = 380;
      const topX = baseX + len * Math.cos(thetaRad);
      const topY = baseY - len * Math.sin(thetaRad);

      // Incline wedge
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(topX, topY);
      ctx.lineTo(topX, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Incline angle label
      ctx.strokeStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(baseX, baseY, 35, 0, -thetaRad, true);
      ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "11px monospace";
      ctx.fillText(`θ = ${scene.inclineAngleDeg}°`, baseX + 45, baseY - 8);

      // Block position
      const blockDist = len * 0.5 + blockOffset;
      const cx = baseX + blockDist * Math.cos(thetaRad);
      const cy = baseY - blockDist * Math.sin(thetaRad) - 22;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-thetaRad);

      // Block
      ctx.fillStyle = "#0284c7";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.fillRect(-22, -22, 44, 44);
      ctx.strokeRect(-22, -22, 44, 44);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${scene.mass} kg`, 0, 4);

      // Normal Force vector (drawn perpendicular upward)
      drawArrow(ctx, 0, -22, 0, -dyn.normalForce * 2.2, "#22c55e", `N=${dyn.normalForce.toFixed(1)}N`);

      // Applied Force vector (drawn along incline)
      if (dyn.appliedForce > 0) {
        drawArrow(ctx, 22, 0, dyn.appliedForce * 2.5, 0, "#00f2fe", `F_app=${dyn.appliedForce}N`);
      }

      ctx.restore();

      // Gravity vector (downward in world space)
      drawArrow(ctx, cx, cy, 0, dyn.gravityForce * 2.2, "#ef4444", `mg=${dyn.gravityForce.toFixed(1)}N`);

      animRef.current = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [forces, scene]);

  return (
    <div style={{ maxWidth: 620, background: "#0d1117", padding: "1rem", borderRadius: "12px", border: "1px solid #30363d", color: "#c9d1d9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#58a6ff" }}>Free-Body Diagram Dynamics</h3>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "monospace" }}>
          <span style={{ background: "#161b22", padding: "2px 8px", borderRadius: "4px", border: "1px solid #30363d" }}>
            F_net: <strong style={{ color: "#38bdf8" }}>{dynamics.netForce.toFixed(1)} N</strong>
          </span>
          <span style={{ background: "#161b22", padding: "2px 8px", borderRadius: "4px", border: "1px solid #30363d" }}>
            Accel: <strong style={{ color: dynamics.isStatic ? "#34d399" : "#fbbf24" }}>{dynamics.acceleration.toFixed(2)} m/s²</strong>
          </span>
        </div>
      </div>

      {/* Physics Canvas */}
      <canvas
        ref={canvasRef}
        width={580}
        height={320}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px", border: "1px solid #21262d" }}
      />

      {/* Interactive Force Sliders */}
      <div style={{ marginTop: "1rem" }}>
        <h4 style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "0.5rem" }}>Interactive Force Vectors</h4>
        {forces.map((f, i) => {
          const traceEntry = data?.audit?.inference_trace?.find(
            (t) => t.field === `forces[${i}].magnitude`
          );
          return (
            <ParamSlider
              key={f.label}
              label={`${f.label} (N)`}
              value={f.magnitude}
              min={0}
              max={60}
              step={0.5}
              onChange={(v) => updateForce(i, v)}
              inferred={traceEntry?.source === "inferred"}
            />
          );
        })}
      </div>
    </div>
  );
}

function drawArrow(ctx, startX, startY, dx, dy, color, label) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + dx, startY + dy);
  ctx.stroke();

  const angle = Math.atan2(dy, dx);
  const headLen = 7;
  ctx.beginPath();
  ctx.moveTo(startX + dx, startY + dy);
  ctx.lineTo(startX + dx - headLen * Math.cos(angle - Math.PI / 6), startY + dy - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(startX + dx - headLen * Math.cos(angle + Math.PI / 6), startY + dy - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = "10px monospace";
    ctx.fillText(label, startX + dx + 6, startY + dy);
  }
}
