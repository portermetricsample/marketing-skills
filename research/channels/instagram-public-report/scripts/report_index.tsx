/**
 * Instagram public report — composition path, fully baked data.
 *
 * Like examples/meta-ads-research, this report QUERIES NOTHING: the whole dataset
 * (profile, posts, creators, thumbnails) was gathered from Instagram public data
 * while building and is frozen into report_data.ts. Created with an empty
 * allowlist (connectors_used=[], accounts_used=[]) — a competitor is not a Porter
 * account. The bridge handshake below is the standard shell contract (see
 * examples/composition-reference); it just never calls query().
 */
import { useEffect, useState } from 'react';
import { porter, type Route } from '../lib/porter';
import { REPORT_HTML, BRAND } from '../report_data';

const ROUTES: Route[] = [{ path: 'report', title: 'Instagram' }];

function applyTheme(mode?: 'light' | 'dark') {
  if (typeof document !== 'undefined' && mode) document.documentElement.setAttribute('data-theme', mode);
}

export default function Home() {
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    porter.init();
    applyTheme(porter.initialTheme?.mode);
    porter.announceRoutes(ROUTES, 'report');
    porter.emitRouteChanged('report', BRAND);
    const offExport = porter.onExportPdf(() => setPrintMode(true));
    const offTheme = porter.onTheme((t) => applyTheme(t.mode));
    return () => {
      offExport();
      offTheme();
    };
  }, []);

  useEffect(() => {
    if (!printMode) return;
    const t = setTimeout(() => {
      porter.emitResize(document.documentElement.scrollHeight);
      porter.emitExportReady(1);
    }, 500);
    return () => clearTimeout(t);
  }, [printMode]);

  return <div className={printMode ? 'is-printing' : ''} dangerouslySetInnerHTML={{ __html: REPORT_HTML }} />;
}
