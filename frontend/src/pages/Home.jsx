import { Link } from 'react-router-dom';
import { ArrowRight, Upload } from 'lucide-react';
import { useRunStore } from '../store/run.js';
import { freeBodyFixture, circuitFixture, stateMachineFixture } from '../api/fixtures.js';
import { useNavigate } from 'react-router-dom';

/* ─── Example card data ─── */
const EXAMPLES = [
  {
    id:       'free_body',
    image:    '/images/example-freebody.png',
    title:    'Free-body diagrams',
    subject:  'Physics · Forces & motion',
    desc:     'Explore forces acting on an object and see how changing their magnitude or direction affects motion.',
    chipCls:  'type-chip-physics',
    fixture:  freeBodyFixture,
  },
  {
    id:       'circuit',
    image:    '/images/example-circuit.png',
    title:    'Circuit diagrams',
    subject:  'Electronics · Voltage & current',
    desc:     'Turn circuit sketches into interactive models. Explore component values and observe electrical behavior.',
    chipCls:  'type-chip-circuit',
    fixture:  circuitFixture,
  },
  {
    id:       'state_machine',
    image:    '/images/example-statemachine.png',
    title:    'State machines',
    subject:  'Computer science · Automata',
    desc:     'Explore how states and transitions work by running a finite-state machine and testing input sequences.',
    chipCls:  'type-chip-cs',
    fixture:  stateMachineFixture,
  },
];

/* ─── Footer features ─── */
const FOOTER_FEATURES = [
  { icon: '✦', title: 'Powered by Gemma 4',        desc: 'Understands handwritten diagrams.' },
  { icon: '⚙', title: 'Real Open-Source Engines',  desc: 'Physics, circuits and automata.' },
  { icon: '⚡', title: 'Live, Editable Simulations', desc: 'Not a video — a running model.' },
  { icon: '📖', title: 'Built for Learning',         desc: 'Explore, interact, and understand.' },
];

export default function Home() {
  const navigate = useNavigate();
  const { setSuccess, reset } = useRunStore();

  function handleUploadClick() { reset(); }

  function runExample(ex) {
    setSuccess(ex.id, ex.fixture);
    navigate('/sim/current');
  }

  return (
    <div className="home-page">

      {/* ══════════════════════════════════════════
          HERO — two-column
      ══════════════════════════════════════════ */}
      <section className="hero-section" aria-label="Introduction">
        {/* Left: copy */}
        <div className="hero-copy fade-in">
          <p className="eyebrow" style={{ marginBottom: 16 }}>Turn your notes into</p>

          <h1 className="display-xl hero-headline">
            Live<br />simulations
            <span style={{ color: 'var(--accent)' }}>.</span>
          </h1>

          <p className="body-lg hero-desc">
            Photograph a handwritten diagram and watch it come to life.
            Powered by Gemma&nbsp;4 and real open-source simulation engines.
          </p>

          {/* CTAs */}
          <div className="hero-ctas">
            <Link
              to="/new"
              className="btn btn-primary hero-cta-primary"
              id="hero-upload-btn"
              onClick={handleUploadClick}
            >
              <Upload size={16} aria-hidden="true" />
              Create a simulation
            </Link>
            <Link to="/examples" className="btn btn-secondary" id="hero-examples-btn">
              Try an example
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Supported types */}
          <p className="hero-support-label">
            Physics · Circuits · State machines
          </p>
        </div>

        {/* Right: hero illustration */}
        <div className="hero-image-wrap" aria-hidden="true">
          <img
            src="/images/hero-notebook.png"
            alt=""
            className="hero-img"
            draggable="false"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EXAMPLE CARDS
      ══════════════════════════════════════════ */}
      <section className="examples-section" aria-label="Diagram type examples">
        <p className="eyebrow" style={{ marginBottom: 20 }}>Try an example</p>

        <div className="examples-grid">
          {EXAMPLES.map((ex, i) => (
            <ExampleCard
              key={ex.id}
              example={ex}
              delay={i * 70}
              onRun={() => runExample(ex)}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER FEATURE STRIP — single line
      ══════════════════════════════════════════ */}
      <footer className="feature-strip" aria-label="Key features">
        {FOOTER_FEATURES.map((f, i) => (
          <div key={f.title} className="feature-item">
            {i > 0 && <span className="feature-divider" aria-hidden="true" />}
            <span className="feature-icon" aria-hidden="true">{f.icon}</span>
            <span className="feature-title">{f.title}</span>
            <span className="feature-desc">{f.desc}</span>
          </div>
        ))}
      </footer>

      <style>{HOME_CSS}</style>
    </div>
  );
}

/* ─── Example Card component ─── */
function ExampleCard({ example, delay, onRun }) {
  return (
    <div
      className="example-card fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Diagram image */}
      <div className="example-card-img-wrap">
        <img
          src={example.image}
          alt={`${example.title} handwritten diagram`}
          className="example-card-img"
        />
      </div>

      {/* Text content */}
      <div className="example-card-body">
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
          {example.title}
        </p>
        <p className="caption" style={{ marginBottom: 10, color: 'var(--muted)' }}>
          {example.subject}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          {example.desc}
        </p>
      </div>

      {/* CTA */}
      <button
        className="example-card-cta"
        id={`try-example-${example.id}`}
        onClick={onRun}
        type="button"
      >
        <span>Try this example</span>
        <ArrowRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ─── Scoped CSS for Home page ─── */
const HOME_CSS = `
/* ── Page shell ── */
.home-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* ══ HERO ══ */
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 0;
  padding: 52px 56px 48px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.hero-copy {
  max-width: 480px;
  padding-right: 24px;
}

.hero-headline {
  margin-bottom: 20px;
  line-height: 1.02;
}

.hero-desc {
  margin-bottom: 32px;
  max-width: 400px;
}

.hero-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.hero-cta-primary {
  padding: 11px 22px;
  font-size: 15px;
}

.hero-support-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}

.hero-image-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
}

.hero-img {
  width: 100%;
  max-width: 620px;
  height: auto;
  object-fit: contain;
  display: block;
  user-select: none;
  pointer-events: none;
}

/* ══ EXAMPLES ══ */
.examples-section {
  padding: 0 56px 48px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* Card */
.example-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition:
    transform 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out);
}

.example-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.example-card-img-wrap {
  width: 100%;
  aspect-ratio: 3 / 2;
  background: var(--sunken);
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}

.example-card-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.example-card-body {
  padding: 16px 18px 12px;
  flex: 1;
}

.example-card-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 18px;
  background: none;
  border: none;
  border-top: 1px solid var(--line);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  color: var(--info);
  cursor: pointer;
  transition: background 150ms var(--ease-out), color 150ms var(--ease-out);
  text-align: left;
}

.example-card-cta:hover {
  background: var(--sunken);
  color: var(--navy);
}

.example-card-cta:focus-visible {
  outline: 2px solid var(--info);
  outline-offset: -2px;
}

/* ══ FEATURE STRIP ══ */
.feature-strip {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0;
  padding: 16px 56px;
  border-top: 1px solid var(--line);
  margin-top: auto;
  background: var(--surface);
  overflow-x: auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 4px 0;
}

.feature-divider {
  display: block;
  width: 1px;
  height: 16px;
  background: var(--line);
  margin: 0 20px;
  flex-shrink: 0;
}

.feature-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.feature-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}

.feature-desc {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

/* ══ RESPONSIVE ══ */

/* Tablet (md) */
@media (max-width: 1023px) {
  .hero-section {
    padding: 36px 32px 32px;
    gap: 24px;
  }
  .hero-image-wrap { padding-left: 0; }
  .examples-section { padding: 0 32px 40px; }
  .feature-strip { padding: 14px 32px; }
}

/* Large phone / small tablet */
@media (max-width: 767px) {
  .hero-section {
    grid-template-columns: 1fr;
    padding: 32px 20px 24px;
    gap: 28px;
  }
  .hero-copy { max-width: 100%; padding-right: 0; }
  .hero-desc { max-width: 100%; }
  .hero-image-wrap { justify-content: center; }
  .hero-img { max-width: 460px; }

  .examples-section { padding: 0 20px 32px; }
  .examples-grid { grid-template-columns: 1fr; gap: 12px; }
  .example-card-img-wrap { aspect-ratio: 16 / 9; }

  .feature-strip {
    flex-wrap: wrap;
    gap: 8px;
    padding: 14px 20px;
  }
  .feature-divider { display: none; }
  .feature-item { flex: 1 1 45%; }
}

/* Phone */
@media (max-width: 480px) {
  .hero-section { padding: 24px 16px 20px; gap: 20px; }
  .hero-ctas { flex-direction: column; }
  .hero-cta-primary { width: 100%; justify-content: center; }
  .examples-section { padding: 0 16px 24px; }
  .feature-strip { padding: 12px 16px; }
  .feature-item { flex: 1 1 100%; }
}
`;
