/** Reusable parameter slider. Shows a '~' badge when value was inferred. */
export default function ParamSlider({ label, value, min, max, step = 0.1, onChange, inferred = false }) {
  return (
    <div>
      <label>
        {label} {inferred && <span title="Value was inferred from diagram, not explicitly labeled">~</span>}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <output>{value}</output>
      </label>
    </div>
  );
}
