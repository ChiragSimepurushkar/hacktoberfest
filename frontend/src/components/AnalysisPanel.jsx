import { useState } from "react";

const SEVERITY_COLOR = { error: "red", warning: "orange", info: "blue" };

/** Gemma's Analysis side-panel. Props: audit { concept_explanation, detected_issues, inference_trace } */
export default function AnalysisPanel({ audit }) {
  const [traceOpen, setTraceOpen] = useState(false);
  if (!audit) return null;

  return (
    <aside>
      <h2>Gemma's Analysis</h2>
      <p>{audit.concept_explanation}</p>

      {audit.detected_issues.length > 0 && (
        <ul>
          {audit.detected_issues.map((d, i) => (
            <li key={i}>
              <span style={{ color: SEVERITY_COLOR[d.severity] }}>[{d.severity}]</span>{" "}
              <strong>{d.location}</strong>: {d.issue}
              {d.suggested_fix && <em> — {d.suggested_fix}</em>}
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setTraceOpen((o) => !o)}>
        {traceOpen ? "Hide" : "Show"} inference trace
      </button>
      {traceOpen && (
        <ul>
          {audit.inference_trace.map((t, i) => (
            <li key={i}>
              <code>{t.field}</code> ({t.source}): {t.reasoning}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
