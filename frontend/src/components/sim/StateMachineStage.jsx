import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { compileStateMachine, stepTransition, simulateStream } from '../../engines/stateMachineCompiler.js';

/**
 * Interactive State Machine (DFA) Stage using Cytoscape.js.
 * Features live node stepping, stream simulation, visual transition animation,
 * and acceptance indicators.
 */
export default function StateMachineStage({ data }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [current, setCurrent] = useState(data?.initial || 'q0');
  const [trace, setTrace] = useState([data?.initial || 'q0']);
  const [testInput, setTestInput] = useState('');
  const [status, setStatus] = useState('READY');

  const scene = compileStateMachine(data || {});

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: scene.elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(id)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#FFFFFF',
            'border-width': 2,
            'border-color': '#1e293b',
            color: '#1e293b',
            'font-family': 'monospace',
            'font-size': 14,
            'font-weight': 'bold',
            width: 48,
            height: 48,
          },
        },
        {
          selector: 'node.accepting',
          style: {
            'border-width': 5,
            'border-color': '#16a34a',
            'border-style': 'double',
          },
        },
        {
          selector: 'node.current',
          style: {
            'background-color': '#2563eb',
            'border-color': '#1d4ed8',
            color: '#FFFFFF',
          },
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#64748b',
            'line-color': '#64748b',
            'font-family': 'monospace',
            'font-size': 13,
            'font-weight': 'bold',
            color: '#2563eb',
            'text-background-opacity': 1,
            'text-background-color': '#ffffff',
            'text-background-padding': '3px',
          },
        },
        {
          selector: 'edge.active-edge',
          style: {
            'line-color': '#2563eb',
            'target-arrow-color': '#2563eb',
            width: 3.5,
          },
        },
      ],
      layout: { name: 'circle', radius: 110 },
      zoomingEnabled: false,
      userZoomingEnabled: false,
      autoungrabify: true,
    });

    // Mark accepting states
    (data.accepting || []).forEach((id) => {
      cyRef.current?.getElementById(id).addClass('accepting');
    });

    // Mark initial state
    cyRef.current?.getElementById(current).addClass('current');

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]);

  // Update Cytoscape highlight when current state changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('current');
    cy.getElementById(current).addClass('current');

    const isAcc = (data.accepting || []).includes(current);
    if (current === 'TRAP') {
      setStatus('REJECTED');
    } else if (isAcc) {
      setStatus('ACCEPTED ✓');
    } else {
      setStatus('IN PROGRESS');
    }
  }, [current, data]);

  function handleStep(symbol) {
    const cy = cyRef.current;
    const next = stepTransition(current, symbol, data.transitions || []);
    if (next) {
      // Highlight edge temporarily
      const edge = cy?.edges().filter((e) => e.data('source') === current && e.data('target') === next && e.data('label') === symbol);
      edge?.addClass('active-edge');
      setTimeout(() => edge?.removeClass('active-edge'), 400);

      setCurrent(next);
      setTrace((prev) => [...prev, `${symbol} → ${next}`]);
    } else {
      setCurrent('TRAP');
      setTrace((prev) => [...prev, `${symbol} → [NO TRANSITION / REJECT]`]);
    }
  }

  function handleReset() {
    setCurrent(data.initial || 'q0');
    setTrace([data.initial || 'q0']);
    setStatus('READY');
  }

  function handleRunStream(streamStr) {
    handleReset();
    let state = data.initial || 'q0';
    let newTrace = [state];

    for (let i = 0; i < streamStr.length; i++) {
      const sym = streamStr[i];
      const next = stepTransition(state, sym, data.transitions || []);
      if (next) {
        state = next;
        newTrace.push(`${sym} → ${state}`);
      } else {
        state = 'TRAP';
        newTrace.push(`${sym} → [REJECT]`);
        break;
      }
    }
    setCurrent(state);
    setTrace(newTrace);
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      {/* Cytoscape Container */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, bottom: 64 }}
        aria-label="Interactive State Machine Automaton"
      />

      {/* Interactive Controls Overlay Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '8px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {/* Step buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: 11 }}>Step:</span>
          <button
            onClick={() => handleStep('0')}
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '4px 10px',
              borderRadius: 5,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Input '0'
          </button>
          <button
            onClick={() => handleStep('1')}
            style={{
              background: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              padding: '4px 10px',
              borderRadius: 5,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Input '1'
          </button>
          <button
            onClick={handleReset}
            style={{
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '4px 8px',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>

        {/* Preset test streams */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: 11 }}>Streams:</span>
          <button
            onClick={() => handleRunStream('01')}
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Run '01' (Accept)
          </button>
          <button
            onClick={() => handleRunStream('00')}
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Run '00' (Reject)
          </button>
        </div>

        {/* State Badge & Result */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b' }}>State: </span>
            <strong style={{ color: '#2563eb' }}>{current}</strong>
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 11,
              background: status === 'ACCEPTED ✓' ? '#dcfce7' : status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
              color: status === 'ACCEPTED ✓' ? '#15803d' : status === 'REJECTED' ? '#b91c1c' : '#475569',
            }}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
