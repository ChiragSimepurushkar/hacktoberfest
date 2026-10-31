import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, ToggleLeft, ToggleRight, Wifi, WifiOff, Loader, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../store/settings.js';
import { checkHealth } from '../api/client.js';

export default function SettingsPage() {
  const { demoMode, toggleDemoMode, apiUrl, setApiUrl } = useSettingsStore();
  const [health, setHealth] = useState(null); // 'online' | 'warming' | 'offline' | null

  useEffect(() => {
    if (apiUrl) {
      checkHealth(apiUrl).then(setHealth);
    }
  }, [apiUrl]);

  function clearHistory() {
    if (confirm('Clear all history? This cannot be undone.')) {
      // TODO: clear IndexedDB store
      alert('History cleared.');
    }
  }

  return (
    <div style={{ padding: '48px 56px 64px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Configuration</p>
        <h1 className="display-lg" style={{ marginBottom: 10 }}>Settings</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Demo mode */}
        <SettingCard id="demo-mode-card">
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Demo mode</p>
            <p className="body-sm">
              Use bundled fixture data instead of the live API.
              The simulation works fully offline.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            id="demo-mode-toggle"
            onClick={toggleDemoMode}
            type="button"
            aria-pressed={demoMode}
            aria-label={`Demo mode: ${demoMode ? 'on' : 'off'}`}
            style={{ color: demoMode ? 'var(--ok)' : 'var(--muted)', padding: 0 }}
          >
            {demoMode
              ? <ToggleRight size={32} />
              : <ToggleLeft  size={32} />}
          </button>
        </SettingCard>

        {/* Backend status */}
        <SettingCard id="backend-status-card">
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Backend status</p>
            <p className="body-sm">
              {apiUrl ? apiUrl : 'No API URL configured (VITE_API_URL).'}
            </p>
          </div>
          <HealthIndicator status={health} apiUrl={apiUrl} onRefresh={() => checkHealth(apiUrl).then(setHealth)} />
        </SettingCard>

        {/* Clear history */}
        <SettingCard id="clear-history-card">
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Clear history</p>
            <p className="body-sm">Permanently delete all saved runs from this browser.</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            id="clear-history-btn"
            onClick={clearHistory}
            type="button"
            style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
          >
            <Trash2 size={13} />
            Clear
          </button>
        </SettingCard>

        {/* Keyboard shortcuts */}
        <SettingCard id="shortcuts-card">
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Keyboard shortcuts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['?', 'Open settings'],
                ['Escape', 'Close panels / go back'],
                ['⌘ + V / Ctrl + V', 'Paste image on Upload page'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <kbd style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    padding: '2px 7px', borderRadius: 5,
                    background: 'var(--sunken)', border: '1px solid var(--line)',
                    color: 'var(--ink-2)', whiteSpace: 'nowrap',
                  }}>
                    {key}
                  </kbd>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  );
}

function SettingCard({ children, id }) {
  return (
    <div
      id={id}
      className="card"
      style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
    >
      {children}
    </div>
  );
}

function HealthIndicator({ status, apiUrl, onRefresh }) {
  if (!apiUrl) {
    return <span className="badge badge-muted">Not configured</span>;
  }

  if (status === null) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={onRefresh} type="button" id="check-health-btn">
        <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
        Check
      </button>
    );
  }

  const configs = {
    online:  { label: 'Online',     cls: 'badge-ok',   icon: <Wifi size={11} /> },
    warming: { label: 'Warming up', cls: 'badge-warn',  icon: <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> },
    offline: { label: 'Offline',    cls: 'badge-err',   icon: <WifiOff size={11} /> },
  };

  const cfg = configs[status] || configs.offline;
  return (
    <span className={`badge ${cfg.cls}`} style={{ gap: 4 }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
