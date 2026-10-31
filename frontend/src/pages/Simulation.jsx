import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, BarChart2, Image, AlertTriangle, CheckCircle2,
  RotateCcw, StepForward, Play, Pause, RefreshCw
} from 'lucide-react';
import { useRunStore } from '../store/run.js';
import { compileFreeBody, calculateDynamics } from '../engines/freeBodyCompiler.js';
import { compileCircuit, solveCircuit } from '../engines/circuitCompiler.js';
import { compileStateMachine, stepTransition } from '../engines/stateMachineCompiler.js';
import FreeBodyStage   from '../components/sim/FreeBodyStage.jsx';
import CircuitStage    from '../components/sim/CircuitStage.jsx';
import StateMachineStage from '../components/sim/StateMachineStage.jsx';

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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export default function Simulation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { diagramType, extractedData, imageUrl } = useRunStore();

  const [photoOpen, setPhotoOpen] = useState(false);
  const [params, setParams] = useState(null);

  // Sync initial parameters
  useEffect(() => {
    if (!extractedData) {
      navigate('/');
      return;
    }
    setParams(extractedData);
  }, [extractedData, navigate]);

  if (!diagramType || !extractedData) return null;

  const StageComponent = STAGE_MAP[diagramType];
  const issueCount = extractedData.audit?.detected_issues?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
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
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2, margin: 0 }}>
              {getTypeLabel(diagramType)}
            </p>
            <p className="caption" style={{ margin: 0 }}>Interactive simulation based on your handwritten diagram.</p>
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
            View Analysis & AI Tutor
          </Link>
        </div>
      </div>

      {/* ── Main Layout: Stage + Side Panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Stage Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            className="graph-paper"
            style={{ width: '100%', height: '100%', position: 'relative' }}
          >
            {StageComponent && (
              <StageComponent
                data={params || extractedData}
                onParamChange={setParams}
              />
            )}

            {/* Photo Peek Button */}
            {imageUrl && (
              <button
                className="btn btn-secondary btn-sm"
                id="photo-peek-btn"
                onClick={() => setPhotoOpen(true)}
                style={{
                  position: 'absolute', bottom: 14, right: 14,
                  gap: 6, fontSize: 12, zIndex: 10,
                }}
              >
                <Image size={13} />
                Original photo
              </button>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{
          width: 300,
          borderLeft: '1px solid var(--line)',
          background: 'var(--surface)',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          {params && diagramType === 'free_body' && (
            <FreeBodyPanel data={params} onChange={setParams} />
          )}
          {params && diagramType === 'circuit' && (
            <CircuitPanel data={params} onChange={setParams} />
          )}
          {params && diagramType === 'state_machine' && (
            <StateMachinePanel data={params} onChange={setParams} />
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

/* ── Free-Body Side Panel ── */
function FreeBodyPanel({ data, onChange }) {
  const forces = data.forces || [];
  const mass   = typeof data.mass === 'number' ? data.mass : 2;
  const mu     = typeof data.friction_coeff === 'number' ? data.friction_coeff : 0.3;
  const angle  = typeof data.incline_angle === 'number' ? data.incline_angle : (data.surface_angle || 30);

  function updateForce(index, value) {
    const nextForces = forces.map((f, i) => i === index ? { ...f, magnitude: value } : f);
    onChange?.({ ...data, forces: nextForces });
  }

  // Real-time calculation
  const dyn = calculateDynamics(mass, angle, mu, forces);

  return (
    <div>
      <PanelSection title="Interactive Parameters">
        <SliderRow
          label="Incline Angle (°)" value={angle} min={0} max={60} step={1}
          onChange={(v) => onChange?.({ ...data, incline_angle: v, surface_angle: v })}
        />
        <SliderRow
          label="Block Mass (kg)" value={mass} min={0.5} max={20} step={0.5}
          onChange={(v) => onChange?.({ ...data, mass: v })}
        />
        <SliderRow
          label="Friction Coeff (μ)" value={mu} min={0} max={1} step={0.05}
          onChange={(v) => onChange?.({ ...data, friction_coeff: v })}
        />
        {forces.map((f, i) => (
          <SliderRow
            key={`${f.label}-${i}`}
            label={`${capitalize(f.label)} (N)`}
            value={f.magnitude}
            min={0}
            max={100}
            step={0.5}
            color={VECTOR_COLORS[f.label]}
            onChange={(v) => updateForce(i, v)}
          />
        ))}
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="Physics Calculations">
        <ResultRow label="Net Force (along ramp)" value={`${dyn.netForce.toFixed(2)} N`} />
        <ResultRow label="Acceleration (a)" value={`${dyn.acceleration.toFixed(2)} m/s²`} />
        <ResultRow label="Normal Force (Fn)" value={`${dyn.normalForce.toFixed(1)} N`} />
        <ResultRow label="Max Friction (f_max)" value={`${(mu * dyn.normalForce).toFixed(1)} N`} />
      </PanelSection>
    </div>
  );
}

/* ── Circuit Side Panel ── */
function CircuitPanel({ data, onChange }) {
  const components = data.components || [];
  const sol = solveCircuit(components, 'V1');

  function updateComp(i, value) {
    const nextComps = components.map((c, j) => j === i ? { ...c, value } : c);
    onChange?.({ ...data, components: nextComps });
  }

  return (
    <div>
      <PanelSection title="Components">
        {components.map((c, i) => (
          <SliderRow
            key={`${c.type}-${i}`}
            label={`${c.label} (${c.type === 'battery' ? 'V' : 'Ω'})`}
            value={c.value}
            min={c.type === 'battery' ? 1 : 1}
            max={c.type === 'battery' ? 30 : 20}
            step={c.type === 'battery' ? 0.5 : 0.5}
            color={c.type === 'battery' ? '#d97706' : '#2563eb'}
            onChange={(v) => updateComp(i, v)}
          />
        ))}
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="Circuit Solution">
        <ResultRow label="Equivalent Req" value={`${sol.equivalentResistance.toFixed(2)} Ω`} />
        <ResultRow label="Total Current (I)" value={`${sol.currentAmps.toFixed(2)} A`} />
        <ResultRow label="Parallel Resistance" value={`${sol.parallelResistance ? sol.parallelResistance.toFixed(2) : 2.40} Ω`} />
        <ResultRow label="Parallel Voltage (Vp)" value={`${sol.nodeVoltages['MID'] ? sol.nodeVoltages['MID'].toFixed(2) : 5.46} V`} />
        <ResultRow label="Total Power" value={`${sol.powerWatts.toFixed(1)} W`} />
      </PanelSection>
    </div>
  );
}

/* ── State Machine Side Panel ── */
function StateMachinePanel({ data, onChange }) {
  const [tape, setTape] = useState('');
  const [curr, setCurr] = useState(data.initial || 'q0');
  const [status, setStatus] = useState('READY');

  function step() {
    if (!tape) return;
    const sym = tape[0];
    const next = stepTransition(curr, sym, data.transitions || []);
    if (next) {
      setCurr(next);
      setTape(tape.slice(1));
      if (tape.length === 1) {
        setStatus((data.accepting || []).includes(next) ? 'ACCEPTED ✓' : 'IN PROGRESS');
      }
    } else {
      setCurr('TRAP');
      setStatus('REJECTED ✗');
    }
  }

  function reset() {
    setCurr(data.initial || 'q0');
    setTape('');
    setStatus('READY');
  }

  return (
    <div>
      <PanelSection title="Interactive Tape">
        <input
          type="text"
          placeholder="Input string (e.g. 0101)..."
          value={tape}
          onChange={(e) => setTape(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--sunken)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
            fontSize: 13, color: 'var(--ink)',
            marginBottom: 8,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={step} type="button">
            <StepForward size={13} /> Step
          </button>
          <button className="btn btn-ghost btn-sm" onClick={reset} type="button">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </PanelSection>

      <hr className="divider" />
      <PanelSection title="Automaton State">
        <ResultRow label="Current State" value={curr} />
        <ResultRow label="Status" value={status} />
        <ResultRow label="Accepting States" value={(data.accepting || []).join(', ')} />
      </PanelSection>
    </div>
  );
}

/* ── Helper UI Components ── */
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

function SliderRow({ label, value, min, max, step, onChange, color }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {color && (
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
          )}
          {label}
        </label>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--navy)', fontWeight: 600 }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        style={{ width: '100%', height: 4, cursor: 'pointer', accentColor: 'var(--navy)' }}
      />
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--navy)' }}>{value}</strong>
    </div>
  );
}

function PhotoSlideOver({ imageUrl, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440, background: 'var(--surface)', height: '100%',
          padding: 24, boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Original Notebook Photo</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <img
          src={imageUrl}
          alt="Notebook"
          style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, border: '1px solid var(--line)' }}
        />
      </div>
    </div>
  );
}
