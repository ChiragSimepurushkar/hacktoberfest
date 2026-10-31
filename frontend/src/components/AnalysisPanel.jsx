import { useState } from "react";

const SEVERITY_CONFIG = {
  error:   { bg: "rgba(248, 81, 73, 0.15)",  border: "#f85149", text: "#ff7b72", label: "ISSUE" },
  warning: { bg: "rgba(210, 153, 34, 0.15)", border: "#d29922", text: "#e3b341", label: "WARNING" },
  info:    { bg: "rgba(88, 166, 255, 0.15)", border: "#58a6ff", text: "#79c0ff", label: "NOTE" },
};

/**
 * Gemma's Analysis Side-Panel (Insight Layer)
 * Props: audit { concept_explanation, detected_issues, inference_trace }
 */
export default function AnalysisPanel({ audit }) {
  const [traceOpen, setTraceOpen] = useState(false);

  if (!audit) return null;

  const detectedIssues = audit.detected_issues || [];
  const inferenceTrace = audit.inference_trace || [];

  return (
    <aside
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "8px",
        padding: "1.25rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid #30363d", paddingBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>🧠</span>
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#f0f6fc", fontWeight: 600 }}>
            Gemma Insight Layer
          </h2>
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            background: "#1f6feb",
            color: "#ffffff",
            padding: "2px 8px",
            borderRadius: "12px",
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}
        >
          GEMMA-4
        </span>
      </div>

      {/* Concept Explanation Card */}
      {audit.concept_explanation && (
        <div
          style={{
            background: "#0d1117",
            border: "1px solid #21262d",
            borderLeft: "3px solid #58a6ff",
            borderRadius: "6px",
            padding: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#8b949e", fontWeight: 600, marginBottom: "4px" }}>
            Concept & Principles
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#c9d1d9", lineHeight: 1.5 }}>
            {audit.concept_explanation}
          </p>
        </div>
      )}

      {/* Detected Issues / Diagnostic Checks */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#8b949e", marginBottom: "0.5rem", textTransform: "uppercase" }}>
          Validation & Diagnostics ({detectedIssues.length})
        </div>

        {detectedIssues.length === 0 ? (
          <div style={{ fontSize: "0.8rem", color: "#3fb950", background: "rgba(63, 185, 80, 0.1)", border: "1px solid rgba(63, 185, 80, 0.3)", padding: "8px 12px", borderRadius: "6px" }}>
            ✓ No diagram errors or topology conflicts detected.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {detectedIssues.map((issue, i) => {
              const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
              return (
                <div
                  key={i}
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: "6px",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: cfg.text,
                        background: "#0d1117",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <strong style={{ fontSize: "0.8rem", color: "#f0f6fc" }}>
                      {issue.location}
                    </strong>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#c9d1d9", lineHeight: 1.4 }}>
                    {issue.issue}
                  </div>
                  {issue.suggested_fix && (
                    <div style={{ fontSize: "0.75rem", color: "#79c0ff", marginTop: "4px" }}>
                      💡 Fix: <em>{issue.suggested_fix}</em>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inference Trace Collapsible */}
      {inferenceTrace.length > 0 && (
        <div style={{ borderTop: "1px solid #30363d", paddingTop: "0.75rem" }}>
          <button
            onClick={() => setTraceOpen((o) => !o)}
            style={{
              width: "100%",
              background: "#21262d",
              border: "1px solid #30363d",
              color: "#c9d1d9",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>🔍 Model Inference Trace ({inferenceTrace.length} fields)</span>
            <span>{traceOpen ? "▲" : "▼"}</span>
          </button>

          {traceOpen && (
            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "6px" }}>
              {inferenceTrace.map((trace, i) => (
                <div
                  key={i}
                  style={{
                    background: "#0d1117",
                    border: "1px solid #21262d",
                    borderRadius: "4px",
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <code style={{ color: "#58a6ff", fontWeight: 600 }}>{trace.field}</code>
                    <span style={{ color: "#8b949e", fontSize: "0.7rem" }}>{trace.source}</span>
                  </div>
                  <div style={{ color: "#8b949e", lineHeight: 1.3 }}>{trace.reasoning}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
