/** Stepper — shows Upload → Analyze → Simulate progress bar */
export default function Stepper({ steps, current }) {
  return (
    <div
      className="stepper"
      role="list"
      aria-label="Progress steps"
      style={{ gap: 0 }}
    >
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone   = stepNum < current;
        const isActive = stepNum === current;
        const cls      = isDone ? 'done' : isActive ? 'active' : '';

        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`stepper-step ${cls}`}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="stepper-num">
                {isDone ? '✓' : stepNum}
              </span>
              <span>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="stepper-divider" />}
          </div>
        );
      })}
    </div>
  );
}
