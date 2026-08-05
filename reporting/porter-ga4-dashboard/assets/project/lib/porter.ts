/**
 * Porter bridge client (`porter:*@v2`).
 *
 * The report runs as an untrusted static SPA inside the Porter wrapper iframe.
 * It NEVER holds Porter tokens and (under CSP `connect-src 'none'`) cannot make
 * network requests in production — all data and commands flow over a postMessage
 * MessagePort brokered by the wrapper, which holds the auth/data tokens.
 *
 * Two runtime modes:
 *   - "embedded": inside the wrapper iframe (production). Handshake → MessagePort
 *                 → query() is an RPC; the wrapper executes it server-side.
 *   - "dev":      `next dev` / standalone. query() hits the local data simulator
 *                 (same `/internal/v1/query` contract) so the agent gets real
 *                 field-validation feedback while building locally.
 *
 * Because the production iframe is a sandboxed opaque origin, window.localStorage
 * /IndexedDB are unavailable — use porter.storage (an in-memory shim) instead.
 */

import { maskResult } from './mask';

export type Route = { path: string; title: string; icon?: string };

export type DateRange = { start: string; end: string };
export type Filter = { fieldName: string; operator: string; values: unknown[] };
export type SortItem = { field: string; direction: 'asc' | 'desc' };

/** Account identifier as returned by `list_accounts` (full DataSourceAccount). */
export type DataSourceAccount = {
  id: string;
  name: string;
  component_name: string;
  source_user_id: string;
  company_id: string;
};

/** One selectable source account, as exposed to the report's account selector by
 *  `porter.getAccounts()`. Trimmed on purpose: the query plane re-resolves the id
 *  against the report's trusted accounts_used, so the internal
 *  source_user_id/company_id never reach the report. */
export type AccountOption = {
  id: string;
  name: string;
  /** Connector slug this account belongs to (e.g. "facebook-ads"), for grouping. */
  connector: string;
};

/** The report's source-account universe (its declared accounts_used), for a
 *  source-account selector. `by_connector` maps a connector slug → the account
 *  ids under it, so the report can group one selector by source or render one
 *  selector per source. */
export type AccountUniverse = {
  accounts: AccountOption[];
  by_connector: Record<string, string[]>;
  connectors: string[];
};

/** A data request. Mirrors the runtime `/internal/v1/query` body (allowlist-gated). */
export type QuerySpec = {
  /** Connector slug, e.g. "facebook-ads". */
  connector?: string;
  /** Live accounts to query — a subset of the report's declared accounts_used.
   *  Only the `id` is required: the query plane re-resolves it to the trusted
   *  stored account, so an account selector can pass `[{ id }]` straight from
   *  porter.getAccounts(). */
  accounts?: Array<{ id: string } & Partial<DataSourceAccount>>;
  /** XOR with accounts: a materialized blend destination. */
  blend_query_destination_id?: string;
  blend_destination_date_column?: string;
  /** Metrics + dimensions (the runtime merges them). */
  fields: string[];
  date_range?: DateRange;
  filters?: Filter[][];
  sort?: SortItem[];
  limit?: number;
};

export type ChartData = {
  columns: string[];
  rows: Record<string, unknown>[];
  meta?: Record<string, unknown>;
};
export type QueryError = {
  error: { code: string; message: string; cause_type?: string; request_id?: string };
};
export type QueryResult = ChartData | QueryError;

export function isQueryError(r: QueryResult): r is QueryError {
  return (r as QueryError).error !== undefined;
}

export type ThemeState = { mode: 'light' | 'dark'; tokens?: Record<string, string> };
export type ReportState = {
  start?: string;
  end?: string;
  compare?: string;
  filters?: Filter[];
};

type PorterCtx = {
  reportId: string;
  route?: string;
  state?: ReportState;
  theme?: ThemeState;
  /** dev-only: where query() routes when not embedded. */
  simulatorUrl?: string;
  dev?: boolean;
};

type Handler<T> = (payload: T) => void;
const WRAPPER_MSG = /^porter:(ack|navigate|export-pdf|theme|state|rpc-result)@v2$/;

// If the wrapper never acks our `porter:ready@v2` within this window, the report
// is NOT embedded correctly (the handshake broke). We fail LOUD with
// `bridge_not_connected` instead of hanging or silently falling back to a dev
// fetch that a strict CSP turns into an opaque "Failed to fetch".
const HANDSHAKE_TIMEOUT_MS = 8000;

class PorterBridge {
  private ctx: PorterCtx = { reportId: 'dev' };
  private port: MessagePort | null = null;
  private ready = false;
  private bridgeFailed = false;
  private failErr: QueryResult | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private rpcSeq = 0;
  private pending = new Map<number, (r: unknown) => void>();
  private outbox: Record<string, unknown>[] = [];
  private navigateHandlers: Handler<string>[] = [];
  private exportHandlers: Handler<{ route?: string; mode?: string }>[] = [];
  private themeHandlers: Handler<ThemeState>[] = [];
  private mem = new Map<string, string>();

  /** In-memory storage shim (opaque-origin sandbox blocks Web Storage). */
  readonly storage = {
    getItem: (k: string) => (this.mem.has(k) ? this.mem.get(k)! : null),
    setItem: (k: string, v: string) => void this.mem.set(k, String(v)),
    removeItem: (k: string) => void this.mem.delete(k),
    clear: () => this.mem.clear(),
  };

  /** Call once on mount. Reads __PORTER_CTX, performs the wrapper handshake. */
  init(): PorterCtx {
    if (typeof window === 'undefined') return this.ctx;
    if (this.ready || this.bridgeFailed) return this.ctx; // idempotent
    const injected = (window as unknown as { __PORTER_CTX?: PorterCtx }).__PORTER_CTX;
    // dev is OPT-IN, never inferred from framing. `next dev` (NODE_ENV !==
    // 'production', or an explicit __PORTER_DEV__) hits the local simulator; a
    // static export (`next build`, NODE_ENV 'production') is ALWAYS embedded and
    // talks to the wrapper over the port. Inferring dev from `!isEmbedded` was a
    // footgun: any report that failed to embed silently fell to a dev fetch that
    // CSP blocks → an opaque "Failed to fetch" on every chart.
    const devFlag =
      (window as unknown as { __PORTER_DEV__?: boolean }).__PORTER_DEV__ === true ||
      process.env.NODE_ENV !== 'production';
    this.ctx = { ...this.ctx, ...(injected ?? {}), dev: devFlag };
    if (this.ctx.dev) {
      this.ctx.simulatorUrl ||= this.devSimulatorUrl();
      this.ready = true;
      return this.ctx;
    }
    window.addEventListener('message', this.onWindowMessage);
    // Announce readiness; the wrapper replies with porter:ack@v2 + a MessagePort.
    window.parent.postMessage({ type: 'porter:ready@v2' }, '*');
    // Loud failure if the ack never lands — the report is not embedded correctly.
    this.watchdog = setTimeout(() => {
      if (!this.ready) this.failBridge();
    }, HANDSHAKE_TIMEOUT_MS);
    return this.ctx;
  }

  /** The handshake never completed: reject queued + future queries with a clear
   *  bridge_not_connected error and flag the document so the wrapper/renderer can
   *  detect it (distinct from a field error or a slow chart). */
  private failBridge() {
    if (this.ready || this.bridgeFailed) return;
    this.bridgeFailed = true;
    this.failErr = {
      error: {
        code: 'bridge_not_connected',
        message:
          'the report bridge did not connect to the Porter wrapper (handshake timed out). ' +
          'Do not modify porter.init/the bridge, do not set window.__PORTER_DEV__, and fire ' +
          'queries only after mount — use the template bridge unchanged.',
      },
    };
    if (typeof document !== 'undefined')
      document.documentElement.setAttribute('data-porter-bridge', 'failed');
    this.outbox = [];
    for (const resolve of this.pending.values()) resolve(this.failErr);
    this.pending.clear();
  }

  private devSimulatorUrl(): string {
    const env = (window as unknown as { __PORTER_SIMULATOR_URL__?: string }).__PORTER_SIMULATOR_URL__;
    return env || 'http://localhost:8787/internal/v1/query';
  }

  private onWindowMessage = (e: MessageEvent) => {
    const data = e.data as { type?: string };
    if (!data || typeof data.type !== 'string' || !WRAPPER_MSG.test(data.type)) return;
    // The wrapper is the only legitimate framer; in the opaque-origin sandbox
    // e.origin is "null", so we verify the source is our parent window.
    if (e.source !== window.parent) return;
    if (data.type === 'porter:ack@v2') {
      this.port = e.ports[0] ?? null;
      const ack = data as unknown as { ctx?: PorterCtx };
      if (ack.ctx) this.ctx = { ...this.ctx, ...ack.ctx };
      if (this.port) {
        this.port.onmessage = this.onPortMessage;
        this.ready = true;
        if (this.watchdog) {
          clearTimeout(this.watchdog);
          this.watchdog = null;
        }
        this.flushOutbox();
      }
      return;
    }
    this.dispatchControl(data.type, data as Record<string, unknown>);
  };

  private onPortMessage = (e: MessageEvent) => {
    const data = e.data as { type?: string; id?: number; body?: unknown };
    if (data?.type === 'porter:rpc-result@v2' && typeof data.id === 'number') {
      const resolve = this.pending.get(data.id);
      if (resolve) {
        this.pending.delete(data.id);
        resolve(data.body);
      }
      return;
    }
    if (typeof data?.type === 'string') this.dispatchControl(data.type, data as Record<string, unknown>);
  };

  private dispatchControl(type: string, data: Record<string, unknown>) {
    switch (type) {
      case 'porter:navigate@v2':
        this.navigateHandlers.forEach((h) => h(String(data.route ?? '')));
        break;
      case 'porter:export-pdf@v2':
        this.exportHandlers.forEach((h) => h({ route: data.route as string, mode: data.mode as string }));
        break;
      case 'porter:theme@v2':
        if (data.theme) this.themeHandlers.forEach((h) => h(data.theme as ThemeState));
        break;
    }
  }

  private postWrapper(msg: Record<string, unknown>) {
    if (this.ctx.dev) return; // standalone/dev: no wrapper to talk to
    if (this.port) {
      this.port.postMessage(msg);
      return;
    }
    // Handshake not finished yet — queue and flush once the MessagePort lands.
    // (Posting to window.parent here would race ahead of the port and be lost.)
    this.outbox.push(msg);
  }

  private flushOutbox() {
    if (!this.port) return;
    for (const m of this.outbox) this.port.postMessage(m);
    this.outbox = [];
  }

  // ---- Data -------------------------------------------------------------
  /**
   * Request data.
   *
   * MASKED SAMPLE REPORT: this is a fully-masked copy of a real GA4 dashboard.
   * It holds NO live data and must never reach the data plane, so every query is
   * answered locally by the synthetic-data engine (lib/mask.ts) and NO bridge RPC
   * is ever sent. Consequence for the audit: 0 charts are recorded and 0 errors,
   * so it passes with no live account behind the report — while the bridge still
   * handshakes normally (init/getAccounts are untouched).
   */
  async query(spec: QuerySpec): Promise<QueryResult> {
    return maskResult(spec);
  }

  private async queryDev(spec: QuerySpec): Promise<QueryResult> {
    try {
      const res = await fetch(this.ctx.simulatorUrl!, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(spec),
      });
      return (await res.json()) as QueryResult;
    } catch (err) {
      return { error: { code: 'transport_error', message: String(err) } };
    }
  }

  /**
   * The report's source-account universe (its declared accounts_used), for a
   * source-account selector. Embedded → wrapper RPC (the wrapper reads it from
   * the report doc); dev → the local simulator. Selecting a subset and passing
   * it as `spec.accounts` NARROWS which accounts the queries run against — the
   * plane rejects any id outside accounts_used, so this is not a filter but a
   * source-account scope.
   */
  async getAccounts(): Promise<AccountUniverse> {
    if (this.ctx.dev) return this.getAccountsDev();
    if (this.bridgeFailed) return { accounts: [], by_connector: {}, connectors: [] };
    const body = await new Promise<unknown>((resolve) => {
      const id = ++this.rpcSeq;
      this.pending.set(id, resolve);
      this.postWrapper({ type: 'porter:rpc@v2', id, method: 'accounts' });
    });
    return normalizeUniverse(body);
  }

  private async getAccountsDev(): Promise<AccountUniverse> {
    try {
      const url = this.ctx.simulatorUrl!.replace(/\/query$/, '/accounts');
      const res = await fetch(url, { method: 'GET' });
      return normalizeUniverse(await res.json());
    } catch {
      return { accounts: [], by_connector: {}, connectors: [] };
    }
  }

  // ---- Navigation -------------------------------------------------------
  get initialRoute(): string | undefined {
    return this.ctx.route;
  }
  announceRoutes(routes: Route[], current: string) {
    this.postWrapper({ type: 'porter:routes@v2', routes, current });
  }
  onNavigate(h: Handler<string>): () => void {
    this.navigateHandlers.push(h);
    return () => {
      this.navigateHandlers = this.navigateHandlers.filter((x) => x !== h);
    };
  }
  emitRouteChanged(path: string, title?: string) {
    this.postWrapper({ type: 'porter:route-changed@v2', path, title });
  }

  // ---- PDF export -------------------------------------------------------
  onExportPdf(h: Handler<{ route?: string; mode?: string }>): () => void {
    this.exportHandlers.push(h);
    return () => {
      this.exportHandlers = this.exportHandlers.filter((x) => x !== h);
    };
  }
  /** Call after the print layout has settled so the renderer can capture. */
  emitExportReady(pageCount: number) {
    this.postWrapper({ type: 'porter:export-ready@v2', pageCount });
    if (typeof document !== 'undefined')
      document.documentElement.setAttribute('data-porter-render-state', 'complete');
  }

  // ---- Theme / state / resize ------------------------------------------
  get initialTheme(): ThemeState | undefined {
    return this.ctx.theme;
  }
  get initialState(): ReportState | undefined {
    return this.ctx.state;
  }
  onTheme(h: Handler<ThemeState>): () => void {
    this.themeHandlers.push(h);
    return () => {
      this.themeHandlers = this.themeHandlers.filter((x) => x !== h);
    };
  }
  emitState(state: ReportState) {
    this.postWrapper({ type: 'porter:state@v2', ...state });
  }
  emitResize(height: number) {
    this.postWrapper({ type: 'porter:resize@v2', height });
  }

  get reportId(): string {
    return this.ctx.reportId;
  }
  get isDev(): boolean {
    return this.ctx.dev === true;
  }
}

/** Coerce an /api/accounts (or a query error) body into a safe AccountUniverse. */
function normalizeUniverse(body: unknown): AccountUniverse {
  const empty: AccountUniverse = { accounts: [], by_connector: {}, connectors: [] };
  if (!body || typeof body !== 'object' || 'error' in (body as Record<string, unknown>)) return empty;
  const b = body as Partial<AccountUniverse>;
  const accounts = Array.isArray(b.accounts)
    ? b.accounts
        .filter((a): a is AccountOption => !!a && typeof (a as AccountOption).id === 'string')
        .map((a) => ({ id: a.id, name: a.name ?? '', connector: a.connector ?? '' }))
    : [];
  const by_connector = b.by_connector && typeof b.by_connector === 'object' ? b.by_connector : {};
  const connectors = Array.isArray(b.connectors) ? b.connectors : Object.keys(by_connector);
  return { accounts, by_connector, connectors };
}

export const porter = new PorterBridge();
