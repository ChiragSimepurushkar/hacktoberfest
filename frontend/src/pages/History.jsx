import { Clock, Upload, Trash2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

// History is stored client-side. This is a placeholder for the idb-keyval implementation.
// For now, render a friendly empty state.
export default function History() {
  // TODO: load from IndexedDB using idb-keyval
  const runs = [];

  return (
    <div style={{ padding: '48px 56px 64px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Past runs</p>
        <h1 className="display-lg" style={{ marginBottom: 10 }}>History</h1>
        <p className="body-md">Reopen any previous simulation right from where you left off.</p>
      </div>

      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <RunList runs={runs} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="card"
      style={{
        padding: '64px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <span style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'var(--sunken)', border: '1px solid var(--line)',
        display: 'grid', placeItems: 'center',
        color: 'var(--muted)', fontSize: 22,
      }}>
        <Clock size={22} />
      </span>
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
          Nothing here yet.
        </p>
        <p className="body-sm" style={{ marginBottom: 20 }}>
          After your first analysis, your runs will appear here.
        </p>
      </div>
      <Link to="/new" className="btn btn-primary" id="history-upload-btn">
        <Upload size={15} />
        Upload a page
      </Link>
    </div>
  );
}

function RunList({ runs }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {runs.map((run) => (
        <RunRow key={run.id} run={run} />
      ))}
    </div>
  );
}

function RunRow({ run }) {
  return (
    <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {run.thumbnail && (
        <img
          src={run.thumbnail}
          alt=""
          aria-hidden="true"
          style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid var(--line)' }}
        />
      )}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{run.title}</p>
        <p className="caption">{run.time}</p>
      </div>
      <Link
        to={`/sim/${run.id}`}
        className="btn btn-ghost btn-sm"
        id={`history-open-${run.id}`}
      >
        <RotateCcw size={13} />
        Open
      </Link>
      <button
        className="btn btn-ghost btn-icon"
        id={`history-delete-${run.id}`}
        type="button"
        aria-label="Delete run"
        style={{ color: 'var(--err)' }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
