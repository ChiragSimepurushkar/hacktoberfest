import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Circle, Loader } from 'lucide-react';
import { useRunStore } from '../store/run.js';
import { useSettingsStore } from '../store/settings.js';
import { extractFromApi } from '../api/client.js';
import { extractFromFixture } from '../api/fixtures.js';
import Stepper from '../components/ui/Stepper.jsx';

const STEPS = [
  { key: 'classify',  label: 'Classifying diagram type' },
  { key: 'extract',   label: 'Extracting elements and values' },
  { key: 'validate',  label: 'Validating structure' },
  { key: 'prepare',   label: 'Preparing simulation' },
];

// Time-based step labels (ms from request start)
const STEP_TIMING = [0, 1200, 2400, 3600];

export default function Analyzing() {
  const navigate  = useNavigate();
  const { imageFile, imageUrl, startAnalyzing, setSuccess, setError, setUnsupported, cancelAnalysis } = useRunStore();
  const { demoMode, apiUrl } = useSettingsStore();

  const [activeStep, setActiveStep]   = useState(0);
  const [doneSteps, setDoneSteps]     = useState(new Set());
  const [errorMsg, setErrorMsg]       = useState(null);
  const timerIds = useRef([]);
  const hasRun   = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!imageFile && !demoMode) {
      navigate('/new');
      return;
    }

    const controller = startAnalyzing();

    // Time-based step advancement (fallback while waiting for SSE)
    STEP_TIMING.forEach((ms, i) => {
      const id = setTimeout(() => {
        setActiveStep(i);
        setDoneSteps((prev) => {
          const next = new Set(prev);
          if (i > 0) next.add(i - 1);
          return next;
        });
      }, ms);
      timerIds.current.push(id);
    });

    const run = async () => {
      try {
        let result;
        if (demoMode) {
          result = await extractFromFixture(imageFile, controller.signal);
        } else {
          result = await extractFromApi(imageFile, controller.signal, apiUrl);
        }

        // Mark all steps done
        timerIds.current.forEach(clearTimeout);
        setDoneSteps(new Set([0, 1, 2, 3]));
        setActiveStep(3);

        if (result.status === 'unsupported') {
          setUnsupported();
          setErrorMsg('unsupported');
          return;
        }

        if (result.status === 'error') {
          setError(result.message);
          setErrorMsg(result.message);
          return;
        }

        setSuccess(result.diagram_type, result.data);

        // Short delay then navigate
        await new Promise((r) => setTimeout(r, 350));
        navigate('/sim/current');

      } catch (err) {
        timerIds.current.forEach(clearTimeout);
        if (err.name === 'AbortError') return; // user cancelled
        const msg = err.message || 'Something went wrong.';
        setError(msg);
        setErrorMsg(msg);
      }
    };

    run();

    return () => {
      timerIds.current.forEach(clearTimeout);
    };
  }, []);

  function handleCancel() {
    timerIds.current.forEach(clearTimeout);
    cancelAnalysis();
    navigate('/new');
  }

  if (errorMsg) {
    return <AnalyzingError message={errorMsg} onRetry={() => { hasRun.current = false; navigate('/new'); }} />;
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Stepper current={2} steps={['Upload', 'Analyze', 'Simulate']} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 48,
          gap: 32,
        }}
      >
        {/* Thumbnail with scan line */}
        {imageUrl && (
          <div
            style={{
              position: 'relative',
              width: 160,
              height: 120,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <img
              src={imageUrl}
              alt="Uploaded diagram"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Animated scan line */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--info), transparent)',
                animation: 'scanLine 1.8s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Text */}
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            Analyzing your diagram…
          </h1>
          <p className="body-sm" style={{ marginBottom: 28 }}>
            Gemma&nbsp;4 is reading your notes and extracting structure.
          </p>

          {/* Progress steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 24 }}>
            {STEPS.map((step, i) => {
              const isDone   = doneSteps.has(i);
              const isActive = activeStep === i && !isDone;
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: i > activeStep && !isDone ? 0.35 : 1,
                    transition: 'opacity var(--duration-base)',
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                  ) : isActive ? (
                    <Loader size={16} style={{ color: 'var(--info)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Circle size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isDone ? 'var(--ok)' : isActive ? 'var(--ink)' : 'var(--muted)',
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="caption" style={{ marginBottom: 20 }}>
            This usually takes a few seconds…
          </p>

          <button
            className="btn btn-ghost btn-sm"
            id="cancel-analysis-btn"
            onClick={handleCancel}
            type="button"
          >
            <X size={13} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyzingError({ message, onRetry }) {
  const isUnsupported = message === 'unsupported';

  return (
    <div style={{ padding: '80px 40px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--sunken)', border: '1px solid var(--line)',
        display: 'grid', placeItems: 'center',
        margin: '0 auto 20px', color: 'var(--err)',
        fontSize: 22,
      }}>⚠</div>

      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
        {isUnsupported ? 'Diagram not recognized' : 'Analysis failed'}
      </h1>
      <p className="body-sm" style={{ marginBottom: 28 }}>
        {isUnsupported
          ? "We couldn't find a free-body, circuit or state-machine diagram on this page."
          : message}
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" id="retry-btn" onClick={onRetry} type="button">
          Try another photo
        </button>
        <a href="/examples" className="btn btn-secondary" id="see-examples-btn">
          See examples
        </a>
      </div>
    </div>
  );
}
