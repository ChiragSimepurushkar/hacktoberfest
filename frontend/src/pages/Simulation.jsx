import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, BarChart2, Image, AlertTriangle, CheckCircle2,
  Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp,
  Info, X
} from 'lucide-react';
import { useRunStore } from '../store/run.js';
import { compileFreeBody }    from '../engines/freeBodyCompiler.js';
import { compileCircuit, solveCircuit } from '../engines/circuitCompiler.js';
import { compileStateMachine } from '../engines/stateMachineCompiler.js';
import FreeBodyStage   from '../components/sim/FreeBodyStage.jsx';
import CircuitStage    from '../components/sim/CircuitStage.jsx';
import StateMachineStage from '../components/sim/StateMachineStage.jsx';
import { canonicalForceKey, prettyForceLabel } from '../lib/forceLabels.js';

const STAGE_MAP = {
  free_body:     FreeBodyStage,
  circuit:       CircuitStage,
  state_machine: StateMachineStage,
};

const VECTOR_COLORS = {
  gravity:  '#D9531E',
  normal:   '#2F5FD0',
  applied:  '#C0392B',
  friction: '#1F8A4C',
  net:      '#14181F',
};

function getTypeLabel(type) {
  return {
    free_body:     'Free-body Diagram',
    circuit:       'Circuit Diagram',
    state_machine: 'State Machine',
  }[type] || 'Simulation';
}

export default function Simulation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { diagramType, extractedData } = useRunStore();

  const [photoOpen, setPhotoOpen]   = useState(false);
  const [params, setParams]         = useState(null);
  const { imageUrl }                = useRunStore();

  // Load data
  useEffect(() => {
    if (!extractedData) {
      navigate('/');
      return;
    }
    setParams(extractedData);
  }, [extractedData]);

  if (!diagramType || !extractedData || !params) return null;

  const StageComponent = STAGE_MAP[diagramType];
  const issueCount     = extractedData.audit?.detected_issues?.length || 0;

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
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                background: '#FFFBEB', border: '1px solid #FDE68A',
                fontSize: 12, fontWeight: 500, color: 'var(--warn)',
              }}
            >
              <AlertTriangle size={12} />
              {issueCount} issue{issueCount > 1 ? 's' : ''} found
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                background: '#ECFDF5', border: '1px solid #A7F3D0',
                fontSize: 12, fontWeight: 500, color: 'var(--ok)',
              }}
            >
              <CheckCircle2 size={12} />
              No issues found
            </span>
          )}
          <Link
            to={`/sim/${id}/analysis`}
            className="btn btn-secondary btn-sm"
            id="view-analysis-btn"
          >
            <BarChart2 size={14} />
            View Analysis
          </Link>
        </div>
      </div>

      {/* ── Main layout: stage + side panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Stage area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            className="graph-paper"
            style={{ width: '100%', height: '100%', position: 'relative' }}
          >
            {StageComponent && (
              <StageComponent data={params} />
            )}

            {/* Photo peek button */}
            {imageUrl && (
              <button
                className="btn btn-secondary btn-sm"
                id="photo-peek-btn"
                onClick={() => setPhotoOpen(true)}
                style={{
                  position: 'absolute', bottom: 14, right: 14,
                  gap: 6, fontSize: 12,
                }}
              >
                <Image size={13} />
                Original photo
              </button>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          width: 280,
          borderLeft: '1px solid var(--line)',
          background: 'var(--surface)',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          {diagramType === 'free_body' && (
            <FreeBodyPanel data={params} onChange={setParams} />
          )}
          {diagramType === 'circuit' && (
            <CircuitPanel data={params} onChange={setParams} />
          )}
          {diagramType === 'state_machine' && (
            <StateMachinePanel data={params} />
          )}
        </div>
      </div>

      {/* Photo Slide-over */}
      {photoOpen && (
        <PhotoSlideOver imageUrl={imageUrl} onClose={() => setPhotoOpen(false)} />
      )}
    </div>
  );
}

/* ── Free-body side panel ── */
function FreeBodyPanel({ data, onChange }) {
  function updateForce(index, key, value) {
    onChange((prev) => ({
      ...prev,
      forces: prev.forces.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
    }));
  }

  const forces = data.forces || [];
  const mass   = data.mass   || 0;
  const mu     = data.friction_coeff || 0;

  // Same projection the Play animation uses, so the two never disagree.
  const scene = compileFreeBody(data);
  const netF  = scene.netAlongSurface;
  const accel = scene.accelerationAlongSurface;

  const inclineAngle = scene.inclineAngleDeg;

  return (
    <div>
      <PanelSection title="Parameters">
        {data.surface === 'incline' && (
          <SliderRow
            label="Incline Angle (°)" value={inclineAngle} min={0} max={60} step={1}
            onChange={(v) => onChange((p) => ({ ...p, incline_angle: v, surface_angle: v }))}
          />
        )}
        <SliderRow
          label="Mass (kg)" value={mass} min={0.1} max={50} step={0.1}
          onChange={(v) => onChange((p) => ({ ...p, mass: v }))}
        />
        <SliderRow
          label="Friction μ" value={mu} min={0} max={1} step={0.01}
          onChange={(v) => onChange((p) => ({ ...p, friction_coeff: v }))}
        />
        {forces.map((f, i) => {
          const trace = data.audit?.inference_trace?.find((t) => t.field === `forces[${i}].magnitude`);
          return (
            <SliderRow
              key={`${f.label}-${i}`}
              label={`${prettyForceLabel(f.label)} force (N)`}
              value={f.magnitude}
              min={0}
              max={200}
              step={0.5}
              inferred={trace?.source === 'inferred'}
              inferredReason={trace?.reasoning}
              color={VECTOR_COLORS[canonicalForceKey(f.label)]}
              onChange={(v) => updateForce(i, 'magnitude', v)}
            />
          );
        })}
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="Results">
        <ResultRow label="Net Force (parallel)" value={`${netF.toFixed(1)} N`} />
        <ResultRow label="Acceleration" value={`${accel.toFixed(2)} m/s²`} />
        <ResultRow label="Object mass" value={`${mass} kg`} />
      </PanelSection>
    </div>
  );
}

/* ── Circuit side panel ── */
function CircuitPanel({ data, onChange }) {
  const components = data.components || [];
  const sol = solveCircuit(components, data.source);

  function updateComp(i, value) {
    onChange((prev) => ({
      ...prev,
      components: prev.components.map((c, j) => (j === i ? { ...c, value } : c)),
    }));
  }

  return (
    <div>
      <PanelSection title="Parameters">
        {components.map((c, i) => (
          <SliderRow
            key={`${c.type}-${i}`}
            label={`${c.label || capitalize(c.type)} (${c.type === 'battery' ? 'V' : 'Ω'})`}
            value={c.value}
            min={0}
            max={c.type === 'battery' ? 30 : 10000}
            step={c.type === 'battery' ? 0.1 : 10}
            onChange={(v) => updateComp(i, v)}
          />
        ))}
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="Circuit Solution">
        <ResultRow label="Equivalent R" value={`${sol.equivalentResistance.toFixed(2)} Ω`} />
        {sol.isSeriesParallel && (
          <ResultRow label="Parallel R" value={`${sol.parallelResistance.toFixed(2)} Ω`} />
        )}
        <ResultRow label="Total Current" value={`${sol.currentAmps.toFixed(2)} A`} />
        <ResultRow label="Power" value={`${sol.powerWatts.toFixed(2)} W`} />
      </PanelSection>
    </div>
  );
}

/* ── State machine side panel ── */
function StateMachinePanel({ data }) {
  const [input, setInput] = useState('');
  const [current, setCurrent] = useState(data.initial);
  const [history, setHistory] = useState([data.initial]);
  const [accepted, setAccepted] = useState(null);

  function step() {
    if (!input) return;
    const symbol = input[0];
    const trans  = (data.transitions || []).find((t) => t.from === current && t.label === symbol);
    if (trans) {
      setCurrent(trans.to);
      setHistory((h) => [...h, trans.to]);
      setInput(input.slice(1));
      if (input.length === 1) {
        setAccepted((data.accepting || []).includes(trans.to));
      }
    }
  }

  function reset() {
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

/* ── Shared panel pieces ── */
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

function SliderRow({ label, value, min, max, step, onChange, inferred, inferredReason, color }) {
  const [local, setLocal] = useState(value);
  const [tip, setTip]     = useState(false);

  function handleChange(e) {
    const v = parseFloat(e.target.value);
    setLocal(v);
    onChange?.(v);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {color && (
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
          )}
          {label}
          {inferred && (
            <span
              style={{
                position: 'relative',
                width: 8, height: 8, borderRadius: '50%',
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
        aria-label={label}
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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
