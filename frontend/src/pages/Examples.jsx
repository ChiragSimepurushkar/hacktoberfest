import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Atom, Zap, GitBranch, ArrowRight } from 'lucide-react';
import { useRunStore } from '../store/run.js';
import { freeBodyFixture, circuitFixture, stateMachineFixture } from '../api/fixtures.js';

const EXAMPLES = [
  {
    id:      'free_body',
    icon:    Atom,
    title:   'Free-body diagram',
    subject: 'Physics',
    desc:    'A block on an inclined surface with gravity, normal force, and applied force.',
    chipCls: 'type-chip-physics',
    fixture: freeBodyFixture,
    features: ['Drag force vectors', 'Edit mass & friction', 'See net force live'],
  },
  {
    id:      'circuit',
    icon:    Zap,
    title:   'Circuit diagram',
    subject: 'Electronics · DC/AC',
    desc:    'Series resistor network driven by a 9V battery.',
    chipCls: 'type-chip-circuit',
    fixture: circuitFixture,
    features: ['Edit component values', 'See current/voltage', 'Real circuit math'],
  },
  {
    id:      'state_machine',
    icon:    GitBranch,
    title:   'State machine',
    subject: 'CS · Automata & Logic',
    desc:    'DFA accepting strings matching "0" followed by "1".',
    chipCls: 'type-chip-cs',
    fixture: stateMachineFixture,
    features: ['Step through transitions', 'Test input strings', 'Visualize states'],
  },
];

export default function Examples() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { setSuccess } = useRunStore();

  const typeParam   = searchParams.get('type');
  const autoRunParam = searchParams.get('autorun');

  // Auto-run if navigated with ?type=...&autorun=1
  useEffect(() => {
    if (typeParam && autoRunParam === '1') {
      const ex = EXAMPLES.find((e) => e.id === typeParam);
      if (ex) runExample(ex);
    }
  }, [typeParam, autoRunParam]);

  function runExample(ex) {
    setSuccess(ex.id, ex.fixture);
    navigate('/sim/current');
  }

  return (
    <div style={{ padding: '48px 56px 64px', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Try an example</p>
        <h1 className="display-lg" style={{ marginBottom: 10 }}>
          Examples
        </h1>
        <p className="body-lg" style={{ maxWidth: 480 }}>
          Run a bundled sample with zero network. Instantly opens the interactive simulation.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {EXAMPLES.map((ex, i) => (
          <ExampleCard
            key={ex.id}
            example={ex}
            onRun={() => runExample(ex)}
            delay={i * 60}
            highlighted={ex.id === typeParam}
          />
        ))}
      </div>
    </div>
  );
}

function ExampleCard({ example, onRun, delay, highlighted }) {
  const Icon = example.icon;

  return (
    <div
      className="card fade-in-up"
      style={{
        padding: 22,
        animationDelay: `${delay}ms`,
        outline: highlighted ? '2px solid var(--info)' : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <span
          className={`type-chip ${example.chipCls}`}
          style={{ padding: '7px 9px', borderRadius: 9, fontSize: 16 }}
        >
          <Icon size={16} />
        </span>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
            {example.title}
          </p>
          <p className="caption">{example.subject}</p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
        {example.desc}
      </p>

      {/* Features */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
        {example.features.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted)', flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>

      <button
        className="btn btn-secondary"
        id={`run-example-${example.id}`}
        onClick={onRun}
        type="button"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span>Try this example</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
