import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, BarChart2, Image, AlertTriangle, CheckCircle2,
  RotateCcw, StepForward, X,
} from 'lucide-react';
import { useRunStore }    from '../store/run.js';
import { createController } from '../engines/mountInterface.js';
import FreeBodyStage      from '../components/sim/FreeBodyStage.jsx';
import CircuitStage       from '../components/sim/CircuitStage.jsx';
import StateMachineStage  from '../components/sim/StateMachineStage.jsx';

const STAGE_MAP = {
  free_body:     FreeBodyStage,
  circuit:       CircuitStage,
  state_machine: StateMachineStage,
};

function getTypeLabel(type) {
  return {
    free_body:     'Free-body Diagram',
    circuit:       'Circuit Diagram',
    state_machine: 'State Machine',
  }[type] || 'Simulation';
}

/* ═══════════════════════════════════════════════════════════════
   Main Simulation page
════════════════════════════════════════════════════════════════ */
export default function Simulation() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { diagramType, extractedData, imageUrl } = useRunStore();

  const [photoOpen, setPhotoOpen] = useState(false);

  // ── Create SimController once per run ─────────────────────────────────
  const controllerRef = useRef(null);
  const [params,  setParams]  = useState([]);
  const [results, setResults] = useState({});

  useEffect(() => {
    if (!extractedData) { navigate('/'); return; }

    // Destroy previous
    controllerRef.current?.destroy();

    // Create new controller via mount interface
    const ctrl = createController(diagramType, extractedData);
    controllerRef.current = ctrl;

    if (ctrl) {
      // Seed local param state from controller
      setParams(ctrl.getParams());

      // Subscribe to result updates
      const unsub = ctrl.onResults((r) => setResults(r));

      // When a feature is clicked on the stage, highlight its slider
      ctrl.onSelect?.((path) => {
        // Flash the slider for the selected path
        const el = document.getElementById(`slider-${CSS.escape(path)}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('slider-flash');
          setTimeout(() => el.classList.remove('slider-flash'), 800);
        }
      });

      return () => { unsub(); ctrl.destroy(); };
    }
  }, [diagramType, extractedData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!diagramType || !extractedData) return null;

  const StageComponent = STAGE_MAP[diagramType];
  const issueCount     = extractedData.audit?.detected_issues?.length || 0;
  const ctrl           = controllerRef.current;

  // Called by slider rows when a value changes
  function handleSetParam(path, value) {
    ctrl?.setParam(path, value);
    setParams((prev) => prev.map((p) => (p.path === path ? { ...p, value } : p)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52,
        borderBottom: '1px solid var(--line)', background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" className="back-btn" id="sim-back-btn">
            <ChevronLeft size={15} /> Back
          </Link>
          <span style={{ width: 1, height: 18, background: 'var(--line)' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
              {getTypeLabel(diagramType)}
            </p>
            <p className="caption">Interactive simulation based on your handwritten diagram.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {issueCount > 0 ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              background: '#FFFBEB', border: '1px solid #FDE68A',
              fontSize: 12, fontWeight: 500, color: 'var(--warn)',
            }}>
              <AlertTriangle size={12} />
              {issueCount} issue{issueCount > 1 ? 's' : ''} found
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              background: '#ECFDF5', border: '1px solid #A7F3D0',
              fontSize: 12, fontWeight: 500, color: 'var(--ok)',
            }}>
              <CheckCircle2 size={12} />
              No issues found
            </span>
          )}
          <Link to={`/sim/${id}/analysis`} className="btn btn-secondary btn-sm" id="view-analysis-btn">
            <BarChart2 size={14} /> View Analysis
          </Link>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Stage area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div className="graph-paper" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {StageComponent && (
              <StageComponent
                data={extractedData}
                controller={ctrl}
              />
            )}

            {imageUrl && (
              <button
                className="btn btn-secondary btn-sm"
                id="photo-peek-btn"
                onClick={() => setPhotoOpen(true)}
                style={{ position: 'absolute', bottom: 14, right: 14, gap: 6, fontSize: 12 }}
              >
                <Image size={13} /> Original photo
              </button>
            )}
          </div>
        </div>

        {/* Side panel — driven by controller.getParams() */}
        <div style={{
          width: 280,
          borderLeft: '1px solid var(--line)',
          background: 'var(--surface)',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          {diagramType === 'state_machine'
            ? <StateMachinePanel controller={ctrl} data={extractedData} />
            : <GenericParamPanel
                params={params}
                results={results}
                onSetParam={handleSetParam}
                controller={ctrl}
              />
          }
        </div>
      </div>

      {/* Photo slide-over */}
      {photoOpen && (
        <PhotoSlideOver imageUrl={imageUrl} onClose={() => setPhotoOpen(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Generic slider panel — works for free_body and circuit
   Driven entirely by ParamDef[] from controller.getParams()
════════════════════════════════════════════════════════════════ */
function GenericParamPanel({ params, results, onSetParam, controller }) {
  // Group params by their `group` field
  const groups = {};
  params.forEach((p) => {
    const g = p.group || 'Parameters';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });

  return (
    <div>
      {Object.entries(groups).map(([groupName, groupParams]) => (
        <div key={groupName}>
          <PanelSection title={groupName}>
            {groupParams.map((p) => (
              <SliderRow
                key={p.path}
                param={p}
                onChange={(v) => onSetParam(p.path, v)}
                onFocus={() => controller?.highlight?.(p.path)}
                onBlur={() => controller?.highlight?.(null)}
              />
            ))}
          </PanelSection>
          <hr className="divider" />
        </div>
      ))}

      {Object.keys(results).length > 0 && (
        <PanelSection title="Results">
          {Object.entries(results).map(([label, value]) => (
            <ResultRow key={label} label={label} value={value} />
          ))}
        </PanelSection>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   State-machine panel — uses controller's step/reset/getCurrentState
════════════════════════════════════════════════════════════════ */
function StateMachinePanel({ controller, data }) {
  const [input,    setInput]    = useState('');
  const [current,  setCurrent]  = useState(data.initial);
  const [history,  setHistory]  = useState([data.initial]);
  const [accepted, setAccepted] = useState(null);

  function step() {
    if (!input || !controller) return;
    const symbol = input[0];
    const moved  = controller.step(symbol);
    if (moved) {
      const next = controller.getCurrentState();
      setCurrent(next);
      setHistory((h) => [...h, next]);
      setInput(input.slice(1));
      if (input.length === 1) {
        setAccepted((data.accepting || []).includes(next));
      }
    }
  }

  function reset() {
    controller?.reset();
    setCurrent(data.initial);
    setHistory([data.initial]);
    setInput('');
    setAccepted(null);
  }

  return (
    <div>
      <PanelSection title="Input Tape">
        <input
          className="field"
          type="text"
          id="sm-input"
          placeholder="Enter input string…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--sunken)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
            fontSize: 14, color: 'var(--ink)',
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" id="sm-step-btn" onClick={step} type="button">
            <StepForward size={13} /> Step
          </button>
          <button className="btn btn-ghost btn-sm" id="sm-reset-btn" onClick={reset} type="button">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="State">
        <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Current: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--navy)' }}>{current}</strong>
        </p>
        {accepted !== null && (
          <span
            className={`badge ${accepted ? 'badge-ok' : 'badge-err'}`}
            style={{ marginTop: 8, display: 'inline-flex' }}
          >
            {accepted ? '✓ Accepted' : '✗ Rejected'}
          </span>
        )}
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="Trace">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {history.map((s, i) => (
            <span key={i} style={{
              padding: '2px 6px', borderRadius: 4,
              background: i === history.length - 1 ? 'var(--navy)' : 'var(--sunken)',
              color: i === history.length - 1 ? 'white' : 'var(--ink-2)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>
              {s}
            </span>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared panel primitives
════════════════════════════════════════════════════════════════ */
function PanelSection({ title, children }) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 12,
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

/**
 * SliderRow — driven by a ParamDef object.
 * Highlights the corresponding stage feature on focus/hover.
 */
function SliderRow({ param, onChange, onFocus, onBlur }) {
  const { path, label, unit, min, max, step, value, inferred, inferredReason, color } = param;
  const [local, setLocal] = useState(value);
  const [tip,   setTip]   = useState(false);

  // Keep local in sync when controller updates externally
  useEffect(() => { setLocal(value); }, [value]);

  function handleChange(e) {
    const v = parseFloat(e.target.value);
    setLocal(v);
    onChange?.(v);
  }

  const sliderId = `slider-${path}`;

  return (
    <div id={sliderId}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {color && (
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
          )}
          {label}{unit ? ` (${unit})` : ''}
          {inferred && (
            <span
              style={{
                position: 'relative', width: 8, height: 8, borderRadius: '50%',
                background: 'var(--info)', display: 'inline-block', cursor: 'help',
              }}
              title={inferredReason || 'Inferred from diagram'}
              onMouseEnter={() => setTip(true)}
              onMouseLeave={() => setTip(false)}
              aria-label="This value was inferred from the diagram"
            >
              {tip && inferredReason && (
                <span style={{
                  position: 'absolute', bottom: 14, left: -60, width: 160,
                  background: 'var(--ink)', color: '#fff', borderRadius: 6,
                  padding: '5px 8px', fontSize: 11, zIndex: 100,
                  lineHeight: 1.4, pointerEvents: 'none',
                }}>
                  {inferredReason}
                </span>
              )}
            </span>
          )}
        </label>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
          {local}
        </span>
      </div>
      <input
        type="range"
        className="slider-track"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        aria-label={`${label}${unit ? ' in ' + unit : ''}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={local}
      />
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

function PhotoSlideOver({ imageUrl, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        background: 'rgba(20,24,31,.35)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 400, height: '100%', background: 'var(--surface)',
          borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(20,24,31,.12)',
          animation: 'fadeIn 200ms var(--ease-out)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Original photo</p>
          <button className="btn btn-ghost btn-icon" id="close-photo-btn" onClick={onClose} type="button" aria-label="Close photo">
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
          <img
            src={imageUrl}
            alt="Original notebook photo"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      </div>
    </div>
  );
}
