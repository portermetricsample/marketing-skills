/**
 * GA4-styled multi-page report shell: Google app bar (GA logo mark), left rail
 * navigation like the GA4 UI, and four views — Conversions · Audiences ·
 * Content · Time Matrix. Pattern A navigation: the report ships its own nav, so
 * no announceRoutes; the URL stays in sync via emitRouteChanged.
 */
import { useEffect, useState } from 'react';
import { porter } from '../lib/porter';
import { useDateRange, type CompareMode } from '../lib/useReport';
import { DateRangeControl, ComparePills, ThemeToggle } from '../components/controls';
import { PROPERTY_LABEL } from '../lib/ga4';
import Conversions from '../components/views/conversions';
import Audiences from '../components/views/audiences';
import Content from '../components/views/content';
import TimeMatrixView from '../components/views/timematrix';

const ROUTES = [
  { path: 'conversions', title: 'Conversions' },
  { path: 'audiences', title: 'Audiences' },
  { path: 'content', title: 'Content' },
  { path: 'time-matrix', title: 'Time matrix' },
];

function GaLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-label="Google Analytics">
      <rect x="16.5" y="2.5" width="5.5" height="19" rx="2.75" fill="#f9ab00" />
      <rect x="9.25" y="9.5" width="5.5" height="12" rx="2.75" fill="#e37400" />
      <circle cx="4.75" cy="18.75" r="2.75" fill="#e37400" />
    </svg>
  );
}

const ICONS: Record<string, JSX.Element> = {
  conversions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  audiences: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14.5c2.8 0 4.5 1.9 4.5 4.5" />
    </svg>
  ),
  content: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  'time-matrix': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
};

export default function Home() {
  const [route, setRoute] = useState('conversions');
  const [printMode, setPrintMode] = useState(false);
  const { preset, setPreset, custom, setCustom, range } = useDateRange('30d');
  const [compare, setCompare] = useState<CompareMode>('prev');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const ctx = porter.init();
    const start = ctx.route && ROUTES.some((r) => r.path === ctx.route) ? ctx.route : 'conversions';
    setRoute(start);
    // seed compare from the wrapper URL state, theme from the wrapper theme
    const st = porter.initialState ?? {};
    setTheme(porter.initialTheme?.mode === 'dark' ? 'dark' : 'light');
    if (st.compare === 'none' || st.compare === 'prev' || st.compare === 'year') setCompare(st.compare);
    const offNav = porter.onNavigate((r) => setRoute(ROUTES.some((x) => x.path === r) ? r : 'conversions'));
    const offExport = porter.onExportPdf(() => setPrintMode(true));
    const offTheme = porter.onTheme((t) => setTheme(t.mode === 'dark' ? 'dark' : 'light'));
    return () => {
      offNav();
      offExport();
      offTheme();
    };
  }, []);

  // apply the theme; round-trip range + compare through the wrapper URL state
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    porter.emitState({ start: range.start, end: range.end, compare });
  }, [range.start, range.end, compare]);

  useEffect(() => {
    if (printMode) return;
    porter.emitRouteChanged(route, ROUTES.find((r) => r.path === route)?.title);
  }, [route, printMode]);

  useEffect(() => {
    if (!printMode) return;
    const t = setTimeout(() => {
      porter.emitResize(document.documentElement.scrollHeight);
      porter.emitExportReady(ROUTES.length);
    }, 800);
    return () => clearTimeout(t);
  }, [printMode]);

  const view = (r: string) =>
    r === 'audiences' ? (
      <Audiences range={range} compare={compare} />
    ) : r === 'content' ? (
      <Content range={range} compare={compare} />
    ) : r === 'time-matrix' ? (
      <TimeMatrixView range={range} />
    ) : (
      <Conversions range={range} compare={compare} />
    );

  return (
    <div className={printMode ? 'app is-printing' : 'app'}>
      <header className="appbar">
        <span className="logo">
          <GaLogo />
          <span className="logo-name">Google <b>Analytics</b></span>
        </span>
        <span className="property">
          <span className="prop-name">{PROPERTY_LABEL}</span>
          <br />
          GA4 property · masked sample data
        </span>
      </header>
      <div className="body">
        {!printMode && (
          <nav className="sidenav" aria-label="Report pages">
            <div className="nav-section">Reports</div>
            {ROUTES.map((r) => (
              <button key={r.path} className={route === r.path ? 'nav-item is-on' : 'nav-item'} onClick={() => setRoute(r.path)}>
                {ICONS[r.path]}
                {r.title}
              </button>
            ))}
          </nav>
        )}
        <main className="content">
          <div className="page-head">
            <h1>{printMode ? 'Google Analytics report' : ROUTES.find((r) => r.path === route)?.title}</h1>
            <span className="sub">
              {range.start} – {range.end}
              {compare === 'prev' ? ' · compared to previous period' : compare === 'year' ? ' · compared to last year' : ''}
            </span>
          </div>
          {!printMode && (
            <div className="controls-bar">
              <DateRangeControl preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ComparePills mode={compare} setMode={setCompare} />
                <ThemeToggle theme={theme} setTheme={setTheme} />
              </div>
            </div>
          )}
          {printMode ? (
            <>
              <Conversions range={range} compare={compare} />
              <Audiences range={range} compare={compare} />
              <Content range={range} compare={compare} />
              <TimeMatrixView range={range} />
            </>
          ) : (
            view(route)
          )}
          <div className="report-footer">
            Masked sample dashboard · figures are synthetic and do not represent any real property · rates (engagement, key event rate) are derived client-side from base counts.
          </div>
        </main>
      </div>
    </div>
  );
}
