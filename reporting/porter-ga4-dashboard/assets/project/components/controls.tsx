/**
 * Report controls — compact date-range pill that opens a popover with the full
 * preset set + a custom range, compare pills (none / vs previous / vs last
 * year) and a theme toggle. Styled by the skin in globals.css.
 */
import { useEffect, useRef, useState } from 'react';
import { PRESETS, presetRange, type CompareMode, type Preset, type Range } from '../lib/useReport';
import type { AccountUniverse } from '../lib/porter';

function fmtRange(r: Range): string {
  const f = (s: string) => {
    const d = new Date(s + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
  return `${f(r.start)} – ${f(r.end)}`;
}

export function DateRangeControl({
  preset,
  setPreset,
  custom,
  setCustom,
}: {
  preset: Preset;
  setPreset: (p: Preset) => void;
  custom: Range;
  setCustom: (r: Range) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const range = preset === 'custom' ? custom : presetRange(preset);
  const label = preset === 'custom' ? fmtRange(custom) : PRESETS.find((p) => p.id === preset)?.label ?? fmtRange(range);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="control date-control" ref={ref}>
      <button className="date-pill" onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 9h18" />
        </svg>
        {label} · {fmtRange(range)}
        <span className="date-caret">▾</span>
      </button>
      {open && (
        <div className="date-popover" role="menu">
          <div className="date-popover-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={preset === p.id ? 'date-preset is-on' : 'date-preset'}
                onClick={() => {
                  setPreset(p.id);
                  setOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="date-popover-custom">
            <div className="date-popover-title">Custom range</div>
            <div className="date-inputs">
              <input
                type="date"
                value={custom.start}
                max={custom.end}
                onChange={(e) => {
                  setCustom({ ...custom, start: e.target.value });
                  setPreset('custom');
                }}
              />
              <span>to</span>
              <input
                type="date"
                value={custom.end}
                min={custom.start}
                onChange={(e) => {
                  setCustom({ ...custom, end: e.target.value });
                  setPreset('custom');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComparePills({ mode, setMode }: { mode: CompareMode; setMode: (m: CompareMode) => void }) {
  const OPTIONS: { id: CompareMode; label: string }[] = [
    { id: 'none', label: 'No compare' },
    { id: 'prev', label: 'vs Previous' },
    { id: 'year', label: 'vs Last year' },
  ];
  return (
    <div className="pills" role="group" aria-label="Comparison">
      {OPTIONS.map((o) => (
        <button key={o.id} className={mode === o.id ? 'pill pill--on' : 'pill'} onClick={() => setMode(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({ theme, setTheme }: { theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void }) {
  const dark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

/**
 * Source-account selector (unchanged template logic — kept for reports that
 * scope queries to a viewer-chosen subset of accounts_used).
 */
export function AccountSelector({
  universe,
  selectedIds,
  setSelectedIds,
  connectors,
  label = 'Accounts',
}: {
  universe: AccountUniverse;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  connectors?: string[];
  label?: string;
}) {
  const groups = connectors ?? universe.connectors;
  const toggle = (id: string) =>
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <div className="control account-selector" role="group" aria-label={label}>
      <span className="control-label">{label}</span>
      {groups.map((connector) => {
        const ids = universe.by_connector[connector] ?? [];
        const accounts = universe.accounts.filter((a) => ids.includes(a.id));
        if (accounts.length === 0) return null;
        return (
          <div key={connector} className="account-group">
            {groups.length > 1 && <div className="account-group-title">{connector}</div>}
            {accounts.map((a) => (
              <label key={a.id} className="account-option">
                <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggle(a.id)} />
                <span>{a.name || a.id}</span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Dimension-value filter dropdown (unchanged template logic). */
export function FilterSelect({
  label,
  value,
  setValue,
  options,
  allLabel = 'All',
}: {
  label: string;
  value: string | string[] | null;
  setValue: (v: string | null) => void;
  options: string[];
  allLabel?: string;
}) {
  const current = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  return (
    <div className="control filter-select">
      <span className="control-label">{label}</span>
      <select
        className="filter-select-input"
        value={current}
        onChange={(e) => setValue(e.target.value === '' ? null : e.target.value)}
        aria-label={label}
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
