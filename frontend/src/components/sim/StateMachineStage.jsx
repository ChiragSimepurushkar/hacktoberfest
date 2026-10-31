import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { compileStateMachine } from '../../engines/stateMachineCompiler.js';

/**
 * State machine stage using Cytoscape.js.
 *
 * Props:
 *   data        — raw extracted JSON
 *   controller  — SimController from mountInterface.createController()
 *                 When provided:
 *                   • registers a highlight handler so controller.highlight(stateId)
 *                     highlights that node (used by StateMachinePanel's step/reset)
 *                   • stage calls controller._fireSelect(stateId) when user clicks a node
 */
export default function StateMachineStage({ data, controller }) {
  const containerRef = useRef(null);
  const cyRef        = useRef(null);

  const scene = compileStateMachine(data);

  // ── Mount Cytoscape ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements:  scene.elements,
      style: [
        {
          selector: 'node',
          style: {
            label:              'data(id)',
            'text-valign':      'center',
            'text-halign':      'center',
            'background-color': '#FFFFFF',
            'border-width':     2,
            'border-color':     '#14181F',
            color:              '#14181F',
            'font-family':      'JetBrains Mono, monospace',
            'font-size':        13,
            'font-weight':      600,
            width:              44,
            height:             44,
          },
        },
        {
          selector: 'node.accepting',
          style: { 'border-width': 4, 'border-color': '#0B1B3A' },
        },
        {
          selector: 'node.current',
          style: {
            'background-color': '#0B1B3A',
            'border-color':     '#0B1B3A',
            color:              '#FFFFFF',
          },
        },
        {
          selector: 'node.highlighted',
          style: {
            'background-color': '#2F5FD0',
            'border-color':     '#2F5FD0',
            color:              '#FFFFFF',
          },
        },
        {
          selector: 'edge',
          style: {
            label:                    'data(label)',
            'curve-style':            'bezier',
            'target-arrow-shape':     'triangle',
            'target-arrow-color':     '#4A5160',
            'line-color':             '#4A5160',
            'font-family':            'JetBrains Mono, monospace',
            'font-size':              11,
            color:                    '#4A5160',
            'text-background-opacity': 1,
            'text-background-color':   '#FAF8F4',
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'edge.taken',
          style: {
            'line-color':         '#1F8A4C',
            'target-arrow-color': '#1F8A4C',
            color:                '#1F8A4C',
          },
        },
      ],
      layout: { name: 'circle', radius: 100 },
      zoomingEnabled: true,
      userZoomingEnabled: false,
    });

    // Apply accepting class
    (data.accepting || []).forEach((id) => {
      cyRef.current?.getElementById(id).addClass('accepting');
    });

    // Highlight initial state
    cyRef.current?.getElementById(data.initial).addClass('current');

    // Click → onSelect
    cyRef.current?.on('tap', 'node', (evt) => {
      controller?._fireSelect(evt.target.id());
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register controller highlight handler ───────────────────────────────
  useEffect(() => {
    if (!controller) return;

    controller._registerHighlight((stateId) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.nodes().removeClass('current');
      if (stateId) cy.getElementById(stateId).addClass('current');
    });

    return () => controller._registerHighlight(null);
  }, [controller]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
      aria-label={`State machine with ${data.states.length} states`}
    />
  );
}
