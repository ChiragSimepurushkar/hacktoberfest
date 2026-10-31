/**
 * /dev/kit — Living style guide for all UI components.
 * Only visible in development. Useful for QA without Storybook.
 */
import { useState } from 'react';
import { Atom, Zap, GitBranch, Check, Copy, AlertTriangle } from 'lucide-react';

export default function DevKit() {
  return (
    <div style={{ padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Dev</p>
      <h1 className="display-lg" style={{ marginBottom: 8 }}>Component Kit</h1>
      <p className="body-md" style={{ marginBottom: 48 }}>Living style guide. All components and states.</p>

      <Section title="Typography">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Eyebrow / Mono uppercase label</p>
        <h2 className="display-xl">Display XL (Italic Serif)</h2>
        <h3 className="display-lg">Display LG (Italic Serif)</h3>
        <p className="body-lg">Body Large — 16px Inter</p>
        <p className="body-md">Body Medium — 14px Inter</p>
        <p className="body-sm">Body Small — 13px Inter</p>
        <p className="caption">Caption — 12px, muted</p>
        <p className="mono" style={{ fontSize: 14 }}>Mono — JetBrains Mono, tabular nums: 42.4 N</p>
      </Section>

      <Section title="Buttons">
        <Row>
          <button className="btn btn-primary" type="button">Primary</button>
          <button className="btn btn-secondary" type="button">Secondary</button>
          <button className="btn btn-ghost" type="button">Ghost</button>
          <button className="btn btn-primary" disabled type="button">Disabled</button>
        </Row>
        <Row>
          <button className="btn btn-primary btn-sm" type="button">Small Primary</button>
          <button className="btn btn-secondary btn-sm" type="button">Small Secondary</button>
        </Row>
      </Section>

      <Section title="Badges">
        <Row>
          <span className="badge badge-ok">Read directly</span>
          <span className="badge badge-info">Inferred</span>
          <span className="badge badge-muted">Computed</span>
          <span className="badge badge-warn">Warning</span>
          <span className="badge badge-err">Error</span>
        </Row>
      </Section>

      <Section title="Type Chips">
        <Row>
          <span className="type-chip type-chip-physics"><Atom size={12} /> Physics</span>
          <span className="type-chip type-chip-circuit"><Zap size={12} /> Electronics</span>
          <span className="type-chip type-chip-cs"><GitBranch size={12} /> CS</span>
        </Row>
      </Section>

      <Section title="Graph paper">
        <div
          className="graph-paper"
          style={{ height: 120, borderRadius: 12, border: '1px solid var(--line)' }}
        />
      </Section>

      <Section title="Skeleton">
        <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '40%' }} />
      </Section>

      <Section title="Cards">
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--ink)' }}>Standard card with border and soft shadow.</p>
        </div>
      </Section>

      <Section title="Colour palette">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['--paper',   '#FAF8F4'],
            ['--surface', '#FFFFFF'],
            ['--sunken',  '#F3F0EA'],
            ['--line',    '#E7E2D9'],
            ['--ink',     '#14181F'],
            ['--ink-2',   '#4A5160'],
            ['--muted',   '#8A8F99'],
            ['--navy',    '#0B1B3A'],
            ['--accent',  '#D9531E'],
            ['--info',    '#2F5FD0'],
            ['--ok',      '#1F8A4C'],
            ['--warn',    '#B7791F'],
            ['--err',     '#C0392B'],
          ].map(([name, value]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: value,
                border: '1px solid var(--line)',
                marginBottom: 4,
              }} />
              <p style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                {name.replace('--', '')}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 16,
        paddingBottom: 8, borderBottom: '1px solid var(--line)',
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>;
}
