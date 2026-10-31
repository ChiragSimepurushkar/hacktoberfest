import { useState } from "react";
import Upload from "./components/Upload";
import AnalysisPanel from "./components/AnalysisPanel";
import FreeBodyRenderer from "./renderers/FreeBodyRenderer";
import CircuitRenderer from "./renderers/CircuitRenderer";
import StateMachineRenderer from "./renderers/StateMachineRenderer";

import freeBodyFixture from "../../fixtures/free_body.json";
import circuitFixture from "../../fixtures/circuit.json";
import stateMachineFixture from "../../fixtures/state_machine.json";

const RENDERERS = {
  free_body:     FreeBodyRenderer,
  circuit:       CircuitRenderer,
  state_machine: StateMachineRenderer,
};

export default function App() {
  const [status, setStatus] = useState("success");       // default to success for instant fixture demo
  const [diagramType, setDiagramType] = useState("free_body");
  const [extractedData, setExtractedData] = useState(freeBodyFixture);
  const [errorMessage, setErrorMessage] = useState("");

  function loadFixture(type, fixture) {
    setDiagramType(type);
    setExtractedData(fixture);
    setStatus("success");
  }

  async function handleExtract(formData) {
    setStatus("loading");
    try {
      const res  = await fetch("/extract", { method: "POST", body: formData });
      const json = await res.json();

      if (json.status === "ok") {
        setDiagramType(json.diagram_type);
        setExtractedData(json.data);
        setStatus("success");
      } else if (json.status === "unsupported") {
        setStatus("unsupported");
      } else {
        setErrorMessage(json.message || "Unknown error");
        setStatus("error");
      }
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  }

  const Renderer = RENDERERS[diagramType];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem", fontFamily: "system-ui, -apple-system, sans-serif", color: "#e6edf3" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #30363d", paddingBottom: "1rem", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#58a6ff" }}>Lab Twin // Simulation Engines</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#8b949e" }}>Track B: Deterministic Compilers & Simulation Harness</p>
        </div>
        
        {/* Step 0 Fixture Selector Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => loadFixture("free_body", freeBodyFixture)}
            style={{
              background: diagramType === "free_body" ? "#1f6feb" : "#21262d",
              color: "#fff",
              border: "1px solid #30363d",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 500
            }}
          >
            1. Free-Body Fixture
          </button>
          <button
            onClick={() => loadFixture("circuit", circuitFixture)}
            style={{
              background: diagramType === "circuit" ? "#1f6feb" : "#21262d",
              color: "#fff",
              border: "1px solid #30363d",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 500
            }}
          >
            2. Circuit Fixture
          </button>
          <button
            onClick={() => loadFixture("state_machine", stateMachineFixture)}
            style={{
              background: diagramType === "state_machine" ? "#1f6feb" : "#21262d",
              color: "#fff",
              border: "1px solid #30363d",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 500
            }}
          >
            3. State Machine Fixture
          </button>
        </div>
      </header>

      <div style={{ marginBottom: "1rem" }}>
        <Upload onExtract={handleExtract} loading={status === "loading"} />
      </div>

      {status === "success" && Renderer && extractedData && (
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 580px" }}>
            <Renderer data={extractedData} />
          </div>
          <div style={{ flex: "1 1 340px", maxWidth: 420 }}>
            <AnalysisPanel audit={extractedData.audit} />
          </div>
        </div>
      )}

      {status === "unsupported" && <p style={{ color: "#f85149" }}>Diagram type not supported. Try a free-body, circuit, or state machine.</p>}
      {status === "error"       && <p style={{ color: "#f85149" }}>Error: {errorMessage}</p>}
    </div>
  );
}
