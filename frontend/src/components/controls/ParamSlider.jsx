/** Reusable parameter slider. Shows a '~' badge with reasoning tooltip when value was inferred. */
export default function ParamSlider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  inferred = false,
  reasoning = "",
}) {
  const tooltip = reasoning
    ? `Inferred: ${reasoning}`
    : "Value was inferred from diagram, not explicitly labeled";

  return (
    <div style={{ margin: "0.5rem 0" }}>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>
          {label}
          {inferred && (
            <span
              title={tooltip}
              style={{
                display: "inline-block",
                marginLeft: "0.3rem",
                padding: "0 0.3rem",
                borderRadius: "4px",
                backgroundColor: "#fff3cd",
                color: "#856404",
                border: "1px solid #ffeeba",
                fontSize: "0.85em",
                cursor: "help",
                fontWeight: "bold",
              }}
            >
              ~ inferred
            </span>
          )}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <output style={{ minWidth: "3rem", textAlign: "right", fontFamily: "monospace" }}>
          {value}
        </output>
      </label>
    </div>
  );
}
