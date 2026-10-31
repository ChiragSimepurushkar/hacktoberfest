import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, Camera, RotateCcw, ArrowRight, Atom, Zap, GitBranch } from 'lucide-react';
import { useRunStore } from '../store/run.js';
import Stepper from '../components/ui/Stepper.jsx';

const MAX_SIZE_MB = 15;
const ACCEPT      = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

const EXAMPLE_SHORTCUTS = [
  { label: 'Free-body diagram', icon: Atom,      type: 'free_body' },
  { label: 'Circuit diagram',   icon: Zap,       type: 'circuit' },
  { label: 'State machine',     icon: GitBranch, type: 'state_machine' },
];

export default function Upload() {
  const navigate = useNavigate();
  const { setImage, imageUrl } = useRunStore();
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [error, setError]       = useState(null);
  const [preview, setPreview]   = useState(imageUrl || null);
  const [fileName, setFileName] = useState('');

  function processFile(file) {
    if (!file) return;

    // Size check
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    // Type check
    if (!file.type.startsWith('image/')) {
      setError('Unsupported file type. Please upload a JPG, PNG, WebP, or HEIC image.');
      return;
    }

    setError(null);
    setFileName(file.name);

    const url = URL.createObjectURL(file);
    setPreview(url);
    setImage(file, url);
  }

  const handleFileInput = (e) => processFile(e.target.files?.[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }, []);

  const handlePaste = useCallback((e) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.kind === 'file');
    if (item) processFile(item.getAsFile());
  }, []);

  function handleAnalyze() {
    navigate('/analyze');
  }

  function handleRetake() {
    setPreview(null);
    setFileName('');
    setError(null);
    useRunStore.getState().reset();
  }

  function handleExampleShortcut(type) {
    navigate(`/examples?type=${type}&autorun=1`);
  }

  return (
    <div
      style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}
      onPaste={handlePaste}
    >
      {/* Stepper */}
      <div style={{ marginBottom: 32 }}>
        <Stepper current={1} steps={['Upload', 'Analyze', 'Simulate']} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 32, alignItems: 'start' }}>

        {/* ── Drop zone / Preview ── */}
        <div>
          {!preview ? (
            <DropZone
              dragOver={dragOver}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClickBrowse={() => fileRef.current?.click()}
            />
          ) : (
            <PreviewCard
              preview={preview}
              fileName={fileName}
              onRetake={handleRetake}
              onAnalyze={handleAnalyze}
            />
          )}

          {error && (
            <p
              role="alert"
              style={{
                marginTop: 10,
                fontSize: 13,
                color: 'var(--err)',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              ⚠ {error}
            </p>
          )}
        </div>

        {/* ── Example shortcuts ── */}
        <div>
          <p className="caption" style={{ marginBottom: 10, fontWeight: 600, color: 'var(--ink)' }}>
            Try an example
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EXAMPLE_SHORTCUTS.map(({ label, icon: Icon, type }) => (
              <button
                key={type}
                id={`example-shortcut-${type}`}
                className="card"
                onClick={() => handleExampleShortcut(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  textAlign: 'left',
                  transition: 'background var(--duration-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sunken)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} style={{ color: 'var(--ink-2)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
                </div>
                <ArrowRight size={13} style={{ color: 'var(--muted)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        aria-hidden="true"
        id="file-browse-input"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        aria-hidden="true"
        id="file-camera-input"
      />
    </div>
  );
}

/* ── Sub-components ── */

function DropZone({ dragOver, onDragOver, onDragLeave, onDrop, onClickBrowse }) {
  return (
    <div
      className="graph-paper"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClickBrowse}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: `2px dashed ${dragOver ? 'var(--info)' : 'var(--line)'}`,
        padding: '56px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color var(--duration-fast), background var(--duration-fast)',
        background: dragOver ? 'rgba(47,95,208,.04)' : undefined,
        minHeight: 280,
      }}
      role="button"
      tabIndex={0}
      aria-label="Upload notebook page: drag and drop, paste, or click to browse"
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClickBrowse()}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--sunken)',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-2)',
        }}
      >
        <CloudUpload size={22} />
      </span>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          Upload your notebook page
        </p>
        <p className="body-sm">Drag & drop, paste from clipboard, or click to browse</p>
        <p className="caption" style={{ marginTop: 4 }}>JPG, PNG or HEIC · max {MAX_SIZE_MB} MB</p>
      </div>
      <button
        className="btn btn-primary btn-sm"
        id="choose-image-btn"
        onClick={(e) => { e.stopPropagation(); onClickBrowse(); }}
        type="button"
        style={{ marginTop: 8 }}
      >
        <CloudUpload size={14} />
        Choose image
      </button>
    </div>
  );
}

function PreviewCard({ preview, fileName, onRetake, onAnalyze }) {
  return (
    <div
      className="card"
      style={{
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, overflow: 'hidden', maxHeight: 340 }}>
        <img
          src={preview}
          alt="Preview of uploaded notebook page"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'var(--sunken)' }}
        />
      </div>
      {fileName && (
        <p className="caption" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)', fontFamily: 'var(--font-mono)' }}>
          {fileName}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-secondary btn-sm" id="retake-btn" onClick={onRetake} type="button">
          <RotateCcw size={13} />
          Retake
        </button>
        <button className="btn btn-primary" id="analyze-btn" onClick={onAnalyze} type="button">
          Analyze
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
