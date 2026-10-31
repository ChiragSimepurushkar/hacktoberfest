import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Copy, Check, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useRunStore } from '../store/run.js';
import TutorChatbot from '../components/chat/TutorChatbot.jsx';

const SEVERITY_CONFIG = {
  error:   { label: 'Error',   color: 'var(--err)',  bg: '#FEF2F2', border: '#FECACA', icon: '✕' },
  warning: { label: 'Warning', color: 'var(--warn)', bg: '#FFFBEB', border: '#FDE68A', icon: '!' },
  info:    { label: 'Info',    color: 'var(--info)', bg: '#EFF6FF', border: '#BFDBFE', icon: 'i' },
};

const SOURCE_BADGE = {
  read_directly: { label: 'Read directly', cls: 'badge-ok' },
  inferred:      { label: 'Inferred',      cls: 'badge-info' },
  computed:      { label: 'Computed',      cls: 'badge-muted' },
};

export default function Analysis() {
  const { id }     = useParams();
  const { diagramType, extractedData, imageUrl } = useRunStore();
  const audit      = extractedData?.audit;

  if (!audit) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-2)' }}>No analysis data available.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 840, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link to={`/sim/${id}`} className="back-btn" id="analysis-back-btn" style={{ marginBottom: 12, display: 'inline-flex' }}>
          <ChevronLeft size={15} /> Back to simulation
        </Link>
        <h1 className="display-lg" style={{ marginBottom: 6 }}>Analysis & AI Tutor</h1>
        <p className="body-md">How Gemma understood your diagram, verified calculations, and tutor dialogue.</p>
      </div>

      {/* 1. Concept explanation */}
      <Card id="concept-card" style={{ marginBottom: 16 }}>
        <SectionLabel>Concept Explanation</SectionLabel>
        <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.65 }}>
          {audit.concept_explanation}
        </p>
      </Card>

      {/* 2. Detected issues */}
      <Card id="issues-card" style={{ marginBottom: 16 }}>
        <SectionLabel>
          Detected Issues
          {audit.detected_issues?.length > 0 && (
            <span
              className="badge badge-warn"
              style={{ marginLeft: 8, fontWeight: 600 }}
            >
              {audit.detected_issues.length}
            </span>
          )}
        </SectionLabel>
        {(!audit.detected_issues || audit.detected_issues.length === 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ok)', fontSize: 14 }}>
            <CheckCircle2 size={16} />
            No issues found. Everything checks out.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {audit.detected_issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} simId={id} />
            ))}
          </div>
        )}
      </Card>

      {/* 3. Extracted values */}
      <Card id="extracted-values-card" style={{ marginBottom: 16 }}>
        <SectionLabel>Extracted Values & Inference Trace</SectionLabel>
        {(!audit.inference_trace || audit.inference_trace.length === 0) ? (
          <p className="body-sm">No trace data available.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Field', 'Source', 'Reasoning'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '6px 10px',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--muted)',
                    borderBottom: '1px solid var(--line)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.inference_trace.map((t, i) => {
                const badge = SOURCE_BADGE[t.source] || SOURCE_BADGE.computed;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>
                      {t.field}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                      {t.reasoning}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* 4. Original photo */}
      {imageUrl && (
        <Card id="original-photo-card" style={{ marginBottom: 16 }}>
          <SectionLabel>Original Photo</SectionLabel>
          <img
            src={imageUrl}
            alt="Original notebook page"
            style={{
              maxHeight: 280, maxWidth: '100%', borderRadius: 8,
              objectFit: 'contain', cursor: 'zoom-in', border: '1px solid var(--line)',
            }}
            onClick={() => window.open(imageUrl, '_blank')}
          />
          <p className="caption" style={{ marginTop: 6 }}>Click to enlarge</p>
        </Card>
      )}

      {/* 5. Raw JSON */}
      <Card id="raw-json-card" style={{ marginBottom: 16 }}>
        <RawJson data={extractedData} />
      </Card>

      {/* 6. Gemma 4 AI Lab Tutor Chatbot */}
      <TutorChatbot diagramType={diagramType} extractedData={extractedData} />

    </div>
  );
}

/* ── Sub-components ── */

function Card({ children, id, style }) {
  return (
    <div
      id={id}
      className="card"
      style={{ padding: '18px 20px', ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--muted)',
      fontFamily: 'var(--font-mono)', marginBottom: 10,
      display: 'flex', alignItems: 'center',
    }}>
      {children}
    </p>
  );
}

function IssueCard({ issue, simId }) {
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          background: cfg.color, color: 'white',
          fontSize: 10, fontWeight: 700,
        }}>
          {cfg.icon}
        </span>
        <strong style={{ fontSize: 13, color: 'var(--navy)' }}>
          {issue.location || 'Observation'}
        </strong>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink)', margin: '0 0 6px', lineHeight: 1.5 }}>
        {issue.issue}
      </p>
      {issue.suggested_fix && (
        <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, fontStyle: 'italic' }}>
          Suggested fix: {issue.suggested_fix}
        </p>
      )}
    </div>
  );
}

function RawJson({ data }) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(data, null, 2);

  function copy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, textAlign: 'left',
        }}
        id="raw-json-toggle"
        aria-expanded={open}
      >
        <SectionLabel>Raw Extracted JSON</SectionLabel>
        {open ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
      </button>

      {open && (
        <div style={{ position: 'relative', marginTop: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            id="copy-json-btn"
            onClick={copy}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre style={{
            background: 'var(--sunken)', borderRadius: 8,
            padding: '36px 14px 14px',
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--ink-2)', overflowX: 'auto',
            lineHeight: 1.6, maxHeight: 400, overflowY: 'auto',
            border: '1px solid var(--line)',
          }}>
            {json}
          </pre>
        </div>
      )}
    </>
  );
}
