import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { compileStateMachine, stepTransition, simulateStream } from '../../engines/stateMachineCompiler.js';

/**
 * Interactive State Machine (DFA) Stage using Cytoscape.js.
 * Features:
 *  - Live node stepping and stream simulation
 *  - Add / remove states and transitions dynamically (DFA Editor tab)
 *  - Toggle accepting states via checkbox
 *  - Tab switcher between Simulator and DFA Editor panels
 */
export default function StateMachineStage({ data, onParamChange }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  // ── Live mutable DFA data (starts from prop, then user edits) ──
  const [dfa, setDfa] = useState(() => ({
    states:      data?.states      || ['q0', 'q1', 'q2'],
    initial:     data?.initial     || 'q0',
    accepting:   data?.accepting   || ['q2'],
    transitions: data?.transitions || [
      { from: 'q0', label: '0', to: 'q1' },
      { from: 'q1', label: '1', to: 'q2' },
    ],
  }));

  // ── Simulator state ──
  const [current,   setCurrent]   = useState(dfa.initial);
  const [trace,     setTrace]     = useState([dfa.initial]);
  const [testInput, setTestInput] = useState('');
  const [status,    setStatus]    = useState('READY');

  // ── Editor state ──
  const [newState,   setNewState]   = useState('');
  const [newFrom,    setNewFrom]    = useState('');
  const [newSymbol,  setNewSymbol]  = useState('');
  const [newTo,      setNewTo]      = useState('');
  const [panelMode,  setPanelMode]  = useState('sim'); // 'sim' | 'edit'
  const [editorMsg,  setEditorMsg]  = useState('');

  // ── Build Cytoscape elements from current DFA ──
  function buildElements(dfaData) {
    const nodes = (dfaData.states || []).map((id) => ({ data: { id } }));
    const edges = (dfaData.transitions || []).map((t, i) => ({
      data: {
        id:     `e_${t.from}_${t.to}_${t.label}_${i}`,
        source:  t.from,
        target:  t.to,
        label:   t.label,
      },
    }));
    return [...nodes, ...edges];
  }

  // ── Initialize / re-initialize Cytoscape whenever DFA structure changes ──
  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current?.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements:  buildElements(dfa),
      style: [
        {
          selector: 'node',
          style: {
            label:              'data(id)',
            'text-valign':      'center',
            'text-halign':      'center',
            'background-color': '#FFFFFF',
            'border-width':     2,
            'border-color':     '#1e293b',
            color:              '#1e293b',
            'font-family':      'monospace',
            'font-size':        14,
            'font-weight':      'bold',
            width:              48,
            height:             48,
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
            'border-color':     '#1d4ed8',
            color:              '#FFFFFF',
          },
        },
        {
          selector: 'edge',
          style: {
            label:                     'data(label)',
            'curve-style':             'bezier',
            'target-arrow-shape':      'triangle',
            'target-arrow-color':      '#64748b',
            'line-color':              '#64748b',
            'font-family':             'monospace',
            'font-size':               13,
            'font-weight':             'bold',
            color:                     '#2563eb',
            'text-background-opacity': 1,
            'text-background-color':   '#ffffff',
            'text-background-padding': '3px',
          },
        },
        {
          selector: 'edge.active-edge',
          style: {
            'line-color':         '#2563eb',
            'target-arrow-color': '#2563eb',
            width:                3.5,
          },
        },
      ],
      layout:              { name: 'circle', radius: 110 },
      zoomingEnabled:      false,
      userZoomingEnabled:  false,
      autoungrabify:       true,
    });

    const cy = cyRef.current;
    dfa.accepting.forEach((id) => cy.getElementById(id).addClass('accepting'));
    cy.getElementById(current).addClass('current');

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [dfa]); // Re-mount when DFA structure changes

  // ── Highlight current node on state changes ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('current');
    cy.getElementById(current).addClass('current');

    if (current === 'TRAP')           setStatus('REJECTED');
    else if (dfa.accepting.includes(current)) setStatus('ACCEPTED');
    else                              setStatus('IN PROGRESS');
  }, [current, dfa]);

  // ── Simulation controls ──
  function handleStep(symbol) {
    const cy   = cyRef.current;
    const next = stepTransition(current, symbol, dfa.transitions);
    if (next) {
      const edge = cy?.edges().filter(
        (e) => e.data('source') === current && e.data('target') === next && e.data('label') === symbol
      );
      edge?.addClass('active-edge');
      setTimeout(() => edge?.removeClass('active-edge'), 400);
      setCurrent(next);
      setTrace((prev) => [...prev, `${symbol} -> ${next}`]);
    } else {
      setCurrent('TRAP');
      setTrace((prev) => [...prev, `${symbol} -> [NO TRANSITION / REJECT]`]);
    }
  }

  function handleReset() {
    setCurrent(dfa.initial);
    setTrace([dfa.initial]);
    setStatus('READY');
  }

  function handleRunStream() {
    if (!testInput) return;
    handleReset();
    let state    = dfa.initial;
    let newTrace = [state];
    for (let i = 0; i < testInput.length; i++) {
      const sym  = testInput[i];
      const next = stepTransition(state, sym, dfa.transitions);
      if (next) {
        state = next;
        newTrace.push(`${sym} -> ${state}`);
      } else {
        state = 'TRAP';
        newTrace.push(`${sym} -> [REJECT]`);
        break;
      }
    }
    setCurrent(state);
    setTrace(newTrace);
  }

  // ── DFA Editor helpers ──
  function flashMsg(msg) {
    setEditorMsg(msg);
    setTimeout(() => setEditorMsg(''), 2500);
  }

  function addState() {
    const name = newState.trim();
    if (!name) return flashMsg('Enter a state name.');
    if (dfa.states.includes(name)) return flashMsg(`State "${name}" already exists.`);
    setDfa((prev) => ({ ...prev, states: [...prev.states, name] }));
    setNewState('');
    flashMsg(`State "${name}" added.`);
  }

  function removeState(id) {
    if (id === dfa.initial) return flashMsg('Cannot remove the initial state.');
    setDfa((prev) => ({
      ...prev,
      states:      prev.states.filter((s) => s !== id),
      accepting:   prev.accepting.filter((s) => s !== id),
      transitions: prev.transitions.filter((t) => t.from !== id && t.to !== id),
    }));
    if (current === id) handleReset();
    flashMsg(`State "${id}" removed.`);
  }

  function toggleAccepting(id) {
    setDfa((prev) => ({
      ...prev,
      accepting: prev.accepting.includes(id)
        ? prev.accepting.filter((s) => s !== id)
        : [...prev.accepting, id],
    }));
  }

  function addTransition() {
    const from   = newFrom.trim();
    const symbol = newSymbol.trim();
    const to     = newTo.trim();
    if (!from || !symbol || !to) return flashMsg('Fill all three fields: From, Symbol, To.');
    if (!dfa.states.includes(from)) return flashMsg(`State "${from}" not found.`);
    if (!dfa.states.includes(to))   return flashMsg(`State "${to}" not found.`);
    setDfa((prev) => ({
      ...prev,
      transitions: [...prev.transitions, { from, label: symbol, to }],
    }));
    setNewFrom(''); setNewSymbol(''); setNewTo('');
    flashMsg(`Transition ${from} --(${symbol})--> ${to} added.`);
  }

  function removeTransition(idx) {
    setDfa((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((_, i) => i !== idx),
    }));
  }

  const inputStyle = {
    padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 5,
    fontSize: 12, fontFamily: 'monospace', outline: 'none',
    background: '#f8fafc', color: '#1e293b',
  };

  const tabBtnStyle = (active) => ({
    flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'monospace',
    background: active ? '#2563eb' : 'transparent',
    color:      active ? '#ffffff' : '#475569',
    borderRadius: 0,
  });

  const smallBtnStyle = (bg = '#2563eb') => ({
    background: bg, color: '#fff', border: 'none',
    borderRadius: 5, padding: '5px 10px', fontSize: 11,
    cursor: 'pointer', fontWeight: 700,
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column' }}>

      {/* Cytoscape Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 280 }}
        aria-label="Interactive State Machine Automaton"
      />

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 0, borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
        <button onClick={() => setPanelMode('sim')}  style={tabBtnStyle(panelMode === 'sim')}>Simulator</button>
        <button onClick={() => setPanelMode('edit')} style={tabBtnStyle(panelMode === 'edit')}>DFA Editor</button>
      </div>

      {/* ── SIMULATOR PANEL ── */}
      {panelMode === 'sim' && (
        <div style={{
          background: 'rgba(255,255,255,0.97)', borderTop: '1px solid #e2e8f0',
          padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 10,
          alignItems: 'center', fontSize: 12, fontFamily: 'monospace',
        }}>

          {/* Manual step buttons */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>Step:</span>
            {['0', '1'].map((sym) => (
              <button key={sym} onClick={() => handleStep(sym)} style={{
                background: sym === '0' ? '#eff6ff' : '#f5f3ff',
                color:      sym === '0' ? '#1d4ed8' : '#6d28d9',
                border:     `1px solid ${sym === '0' ? '#bfdbfe' : '#ddd6fe'}`,
                padding: '4px 10px', borderRadius: 5, fontWeight: 700, cursor: 'pointer',
              }}>
                Input '{sym}'
              </button>
            ))}
            <button onClick={handleReset} style={{
              background: '#f8fafc', color: '#475569',
              border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: 5, cursor: 'pointer',
            }}>Reset</button>
          </div>

          {/* Custom stream input */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>Run String:</span>
            <input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="e.g. 01101"
              style={{ ...inputStyle, width: 90 }}
              onKeyDown={(e) => e.key === 'Enter' && handleRunStream()}
            />
            <button onClick={handleRunStream} style={smallBtnStyle('#16a34a')}>Run</button>
          </div>

          {/* Preset streams */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[{ s: '01', label: "Run '01'" }, { s: '00', label: "Run '00'" }].map(({ s, label }) => (
              <button key={s} onClick={() => { setTestInput(s); setTimeout(handleRunStream, 10); }} style={{
                background: s === '01' ? '#f0fdf4' : '#fef2f2',
                color:      s === '01' ? '#15803d' : '#b91c1c',
                border:     `1px solid ${s === '01' ? '#bbf7d0' : '#fecaca'}`,
                padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600,
              }}>{label}</button>
            ))}
          </div>

          {/* Status badge */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>State:</span>
            <strong style={{ color: '#2563eb' }}>{current}</strong>
            <span style={{
              padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: 11,
              background: status === 'ACCEPTED' ? '#dcfce7' : status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
              color:      status === 'ACCEPTED' ? '#15803d' : status === 'REJECTED' ? '#b91c1c' : '#475569',
            }}>
              {status}
            </span>
          </div>

          {/* Trace */}
          {trace.length > 1 && (
            <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 5, padding: '4px 8px', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Trace: </span>
              <span style={{ color: '#1e293b' }}>{trace.join('  ')}</span>
            </div>
          )}
        </div>
      )}

      {/* ── DFA EDITOR PANEL ── */}
      {panelMode === 'edit' && (
        <div style={{
          background: '#ffffff', borderTop: '1px solid #e2e8f0',
          padding: '12px 14px', overflowY: 'auto', maxHeight: 260,
          fontSize: 12, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {editorMsg && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '4px 8px', color: '#92400e', fontSize: 11 }}>
              {editorMsg}
            </div>
          )}

          {/* Add State row */}
          <div>
            <div style={{ color: '#475569', fontWeight: 700, marginBottom: 5 }}>Add State</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={newState} onChange={(e) => setNewState(e.target.value)}
                placeholder="State name (e.g. q3)" style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && addState()} />
              <button onClick={addState} style={smallBtnStyle('#2563eb')}>Add</button>
            </div>
          </div>

          {/* States list */}
          <div>
            <div style={{ color: '#475569', fontWeight: 700, marginBottom: 5 }}>States</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dfa.states.map((s) => (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#f1f5f9', borderRadius: 5, padding: '3px 8px',
                  border: `1px solid ${dfa.accepting.includes(s) ? '#16a34a' : '#cbd5e1'}`,
                }}>
                  <span style={{ color: dfa.accepting.includes(s) ? '#15803d' : '#1e293b', fontWeight: 700 }}>{s}</span>
                  {s === dfa.initial && <span style={{ color: '#d97706', fontSize: 10 }}>init</span>}
                  <label title="Toggle accepting" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#64748b' }}>
                    <input
                      type="checkbox"
                      checked={dfa.accepting.includes(s)}
                      onChange={() => toggleAccepting(s)}
                    />
                    acc
                  </label>
                  {s !== dfa.initial && (
                    <button onClick={() => removeState(s)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#dc2626', fontWeight: 700, fontSize: 14, lineHeight: 1, padding: '0 2px',
                    }} title={`Remove ${s}`}>x</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Transition row */}
          <div>
            <div style={{ color: '#475569', fontWeight: 700, marginBottom: 5 }}>Add Transition</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={newFrom}   onChange={(e) => setNewFrom(e.target.value)}   placeholder="From"   style={{ ...inputStyle, width: 58 }} />
              <span style={{ color: '#64748b' }}>--</span>
              <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="Sym"    style={{ ...inputStyle, width: 44 }} />
              <span style={{ color: '#64748b' }}>{'-->'}</span>
              <input value={newTo}     onChange={(e) => setNewTo(e.target.value)}     placeholder="To"     style={{ ...inputStyle, width: 58 }} />
              <button onClick={addTransition} style={smallBtnStyle('#16a34a')}>Add</button>
            </div>
          </div>

          {/* Transitions list */}
          <div>
            <div style={{ color: '#475569', fontWeight: 700, marginBottom: 5 }}>Transitions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {dfa.transitions.map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f8fafc', borderRadius: 4, padding: '3px 8px', fontSize: 11,
                }}>
                  <span>
                    <strong>{t.from}</strong>
                    <span style={{ color: '#64748b' }}>{` --(${t.label})--> `}</span>
                    <strong>{t.to}</strong>
                  </span>
                  <button onClick={() => removeTransition(i)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#dc2626', fontWeight: 700, fontSize: 14, padding: '0 2px',
                  }} title="Remove transition">x</button>
                </div>
              ))}
              {dfa.transitions.length === 0 && (
                <span style={{ color: '#94a3b8', fontSize: 11 }}>No transitions defined.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
