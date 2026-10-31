import { useState } from "react";
import Upload from "./components/Upload";
import AnalysisPanel from "./components/AnalysisPanel";
import FreeBodyRenderer from "./renderers/FreeBodyRenderer";
import CircuitRenderer from "./renderers/CircuitRenderer";
import StateMachineRenderer from "./renderers/StateMachineRenderer";

// TODO: swap this import for the live /extract API response
// import fixtureData from "../../fixtures/free_body.json";

const RENDERERS = {
  free_body:     FreeBodyRenderer,
  circuit:       CircuitRenderer,
  state_machine: StateMachineRenderer,
};

export default function App() {
  const [status, setStatus] = useState("idle");       // idle | loading | success | error | unsupported
  const [diagramType, setDiagramType] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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
    <div>
      <h1>Lab Twin</h1>
      <Upload onExtract={handleExtract} loading={status === "loading"} />

      {status === "success" && Renderer && (
        <div style={{ display: "flex", gap: "1rem" }}>
          <Renderer data={extractedData} />
          <AnalysisPanel audit={extractedData.audit} />
        </div>
      )}

      {status === "unsupported" && <p>Diagram type not supported. Try a free-body, circuit, or state machine.</p>}
      {status === "error"       && <p>Error: {errorMessage}</p>}
    </div>
  );
}
