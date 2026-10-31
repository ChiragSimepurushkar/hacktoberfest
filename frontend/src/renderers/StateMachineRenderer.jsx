import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { compileStateMachine, stepTransition, simulateStream } from "../engines/stateMachineCompiler";

/**
 * State machine renderer using Cytoscape.js.
 * Highlights current state, double-rings accepting states, and steps transition streams.
 */
export default function StateMachineRenderer({ data }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const scene = compileStateMachine(data);

  const [currentState, setCurrentState] = useState(scene.initial);
  const [inputSymbol, setInputSymbol] = useState("");
  const [testString, setTestString] = useState("01");
  const [executionLog, setExecutionLog] = useState("");

  // Mount Cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: scene.elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#ffffff",
            "font-family": "monospace",
            "font-weight": "bold",
            "background-color": "#1e293b",
            "border-width": 2,
            "border-color": "#475569",
            width: 50,
            height: 50,
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(label)",
            color: "#38bdf8",
            "font-size": 13,
            "font-family": "monospace",
            "font-weight": "bold",
            "line-color": "#475569",
            "target-arrow-color": "#475569",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: ".accepting",
          style: {
            "border-width": 6,
            "border-style": "double",
            "border-color": "#10b981",
          },
        },
        {
          selector: ".current",
          style: {
            "background-color": "#0284c7",
            "border-color": "#38bdf8",
            "border-width": 4,
          },
        },
      ],
      layout: {
        name: "circle",
        padding: 50,
      },
    });

    return () => cyRef.current?.destroy();
  }, [data]);

  // Highlight current state whenever it updates
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("current");
    cy.getElementById(currentState).addClass("current");
  }, [currentState]);

  function stepSingle() {
    if (!inputSymbol) return;
    const next = stepTransition(currentState, inputSymbol, data.transitions);
    if (next) {
      setCurrentState(next);
      setExecutionLog(`Read '${inputSymbol}' ➔ Transitioned to state ${next}`);
    } else {
      setExecutionLog(`Trap state: No transition from ${currentState} on '${inputSymbol}'`);
    }
    setInputSymbol("");
  }

  function runFullString() {
    if (!testString) return;
    const result = simulateStream(scene.initial, testString, data.transitions, data.accepting);
    setCurrentState(result.finalState);
    if (result.isAccepted) {
      setExecutionLog(`String '${testString}' ACCEPTED ✓ (Ended in accepting state ${result.finalState})`);
    } else {
      setExecutionLog(`String '${testString}' REJECTED ✗ (Ended in state ${result.finalState})`);
    }
  }

  const isAccepting = data.accepting.includes(currentState);

  return (
    <div style={{ maxWidth: 620, background: "#0d1117", padding: "1rem", borderRadius: "12px", border: "1px solid #30363d", color: "#c9d1d9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#58a6ff" }}>State Machine Automaton (Cytoscape.js)</h3>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "monospace" }}>
          <span style={{ background: "#161b22", padding: "2px 8px", borderRadius: "4px", border: "1px solid #30363d" }}>
            State: <strong style={{ color: "#38bdf8" }}>{currentState}</strong>
          </span>
          <span style={{ background: "#161b22", padding: "2px 8px", borderRadius: "4px", border: "1px solid #30363d" }}>
            Accepting: <strong style={{ color: isAccepting ? "#34d399" : "#fbbf24" }}>{isAccepting ? "YES" : "NO"}</strong>
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ width: "100%", height: 320, background: "#030712", borderRadius: "8px", border: "1px solid #21262d" }}
      />

      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {/* Single Step Input */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            placeholder="Single symbol (0 or 1)"
            maxLength={1}
            style={{ width: 140, background: "#161b22", border: "1px solid #30363d", color: "#fff", padding: "6px 10px", borderRadius: "6px", fontFamily: "monospace" }}
          />
          <button
            onClick={stepSingle}
            style={{ background: "#238636", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >
            Step
          </button>
        </div>

        {/* Full String Runner */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Stream string e.g. 0101"
            style={{ flex: 1, background: "#161b22", border: "1px solid #30363d", color: "#fff", padding: "6px 10px", borderRadius: "6px", fontFamily: "monospace" }}
          />
          <button
            onClick={runFullString}
            style={{ background: "#1f6feb", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >
            Run Stream
          </button>
        </div>

        {executionLog && (
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#58a6ff", fontFamily: "monospace" }}>
            {executionLog}
          </p>
        )}
      </div>
    </div>
  );
}
