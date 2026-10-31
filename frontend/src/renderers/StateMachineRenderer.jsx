import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { compileStateMachine } from "../engines/stateMachineCompiler";

/**
 * State machine renderer using Cytoscape.js.
 * TODO: style accepting states with double border, highlight current state.
 */
export default function StateMachineRenderer({ data }) {
  const containerRef = useRef(null);
  const cyRef        = useRef(null);
  const scene        = compileStateMachine(data);

  const [currentState, setCurrentState] = useState(scene.initial);
  const [inputSymbol,  setInputSymbol]  = useState("");

  // Mount Cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements:  scene.elements,
      style: [
        { selector: "node",          style: { label: "data(id)", "text-valign": "center" } },
        { selector: "edge",          style: { label: "data(label)", "curve-style": "bezier", "target-arrow-shape": "triangle" } },
        { selector: ".current",      style: { "background-color": "#4CAF50" } },
        { selector: ".accepting",    style: { "border-width": 4, "border-color": "#333" } },
      ],
      layout: { name: "circle" },
    });

    // TODO: apply .accepting class to accepting state nodes
    // TODO: apply .current class to currentState node

    return () => cyRef.current?.destroy();
  }, []);

  // Highlight current state whenever it changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("current");
    cy.getElementById(currentState).addClass("current");
  }, [currentState]);

  function step() {
    const transition = data.transitions.find(
      (t) => t.from === currentState && t.label === inputSymbol
    );
    if (transition) setCurrentState(transition.to);
    // else: no transition — stay (or show error)
  }

  return (
    <div>
      <div ref={containerRef} style={{ width: 500, height: 400, border: "1px solid #ccc" }} />
      <p>Current state: <strong>{currentState}</strong></p>
      <input
        value={inputSymbol}
        onChange={(e) => setInputSymbol(e.target.value)}
        placeholder="Enter input symbol"
        maxLength={1}
      />
      <button onClick={step}>Step</button>
    </div>
  );
}
