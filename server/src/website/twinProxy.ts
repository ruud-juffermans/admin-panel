import { Router, type Request, type Response } from 'express';
import { asyncRoute } from '../http.js';

// Reverse proxy from /api/website/admin/twin/* to the digital twin's bearer-
// guarded /api/admin/* (PRD T1). The admin UI only ever holds the panel's
// session cookie; this is the one place the twin token is attached, so it
// never reaches a browser build. Only the paths below are forwarded —
// anything else is a 404 here, before any network call.

export interface TwinProxyOptions {
  baseUrl: string; // e.g. http://digital-twin:3000
  token: string; // TWIN_ADMIN_TOKEN
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface Rule {
  method: 'GET' | 'POST' | 'PATCH';
  pattern: RegExp;
}

// Allow-list, mirroring the twin's admin router. Path params are validated
// here with the same character classes the twin uses.
const THREAD = '[A-Za-z0-9_-]{1,64}';
const ID = '[0-9]{1,10}';
export const TWIN_ALLOW_LIST: Rule[] = [
  { method: 'GET', pattern: /^\/approvals$/ },
  { method: 'POST', pattern: new RegExp(`^/approvals/${THREAD}$`) },
  { method: 'GET', pattern: /^\/stats\/overview$/ },
  { method: 'GET', pattern: /^\/stats\/timeseries$/ },
  // Performance (latency, TTFT, retries, errors) and the per-turn waterfall.
  { method: 'GET', pattern: /^\/stats\/performance$/ },
  { method: 'GET', pattern: /^\/turns$/ },
  { method: 'GET', pattern: new RegExp(`^/turns/${ID}/trace$`) },
  { method: 'GET', pattern: /^\/threads$/ },
  { method: 'GET', pattern: new RegExp(`^/threads/${THREAD}$`) },
  { method: 'GET', pattern: /^\/unanswered$/ },
  { method: 'PATCH', pattern: new RegExp(`^/unanswered/${ID}$`) },
  { method: 'GET', pattern: /^\/guard-incidents$/ },
  { method: 'GET', pattern: /^\/feedback$/ },
  { method: 'GET', pattern: /^\/contact-messages$/ },
  { method: 'GET', pattern: /^\/evals$/ },
  { method: 'GET', pattern: new RegExp(`^/evals/${ID}$`) },
  { method: 'GET', pattern: /^\/budget$/ },
  { method: 'GET', pattern: /^\/knowledge$/ },
  { method: 'GET', pattern: /^\/prompt$/ },
  // LLM provider funds (PRD F1): live balances and per-provider spend.
  { method: 'GET', pattern: /^\/providers$/ },
  { method: 'GET', pattern: /^\/providers\/spend$/ },
];

export function isAllowed(method: string, path: string): boolean {
  return TWIN_ALLOW_LIST.some((rule) => rule.method === method && rule.pattern.test(path));
}

// Query parameters we forward (the twin validates values). Anything else is dropped.
const FORWARDED_QUERY = new Set([
  'days',
  'limit',
  'status',
  'reason',
  'verdict',
  'outcome',
  'flag',
  'q',
  'thread_id',
  'tool',
  'offset',
  'prompt_version',
  'has_citations',
  'feedback',
  'provider',
  'since',
]);

export function forwardedQuery(query: Request['query']): string {
  const params = new URLSearchParams();
  for (const key of FORWARDED_QUERY) {
    const value = query[key];
    if (typeof value === 'string' && value !== '') params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

// Server-side call to the twin's admin API with the same token and timeout
// handling as the proxy. Returns the parsed JSON, or throws TwinUnavailable.
export class TwinUnavailable extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'TwinUnavailable';
    this.status = status;
  }
}

export async function twinGet<T>(options: TwinProxyOptions, path: string, query: Record<string, string | undefined> = {}): Promise<T> {
  if (!options.token) throw new TwinUnavailable('Ask Ruud admin access is not configured (TWIN_ADMIN_TOKEN).', 503);
  const base = options.baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, v);
  const qs = params.toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const res = await (options.fetchImpl ?? fetch)(`${base}/api/admin${path}${qs ? `?${qs}` : ''}`, {
      headers: { authorization: `Bearer ${options.token}`, accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new TwinUnavailable(`Ask Ruud answered ${res.status} for ${path}.`, res.status >= 500 ? 502 : res.status);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof TwinUnavailable) throw err;
    const timedOut = err instanceof Error && err.name === 'AbortError';
    throw new TwinUnavailable(timedOut ? 'Ask Ruud did not answer in time.' : 'Ask Ruud is unavailable.');
  } finally {
    clearTimeout(timer);
  }
}

export function createTwinProxy(options: TwinProxyOptions): Router {
  const router = Router();
  const base = options.baseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 10_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  router.all(
    '*',
    asyncRoute(async (req: Request, res: Response) => {
      const path = req.path.replace(/\/$/, '') || '/';
      if (!isAllowed(req.method, path)) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      if (!options.token) {
        res.status(503).json({ error: 'Ask Ruud admin access is not configured (TWIN_ADMIN_TOKEN).' });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const upstream = await fetchImpl(`${base}/api/admin${path}${forwardedQuery(req.query)}`, {
          method: req.method,
          headers: {
            authorization: `Bearer ${options.token}`,
            accept: 'application/json',
            ...(req.method === 'GET' ? {} : { 'content-type': 'application/json' }),
          },
          body: req.method === 'GET' ? undefined : JSON.stringify(req.body ?? {}),
          signal: controller.signal,
        });
        // Pass status and JSON body through untouched; never log the body.
        const text = await upstream.text();
        res.status(upstream.status);
        res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
        res.send(text);
      } catch (err) {
        const timedOut = err instanceof Error && err.name === 'AbortError';
        console.warn(`[twin-proxy] ${req.method} ${path}: ${timedOut ? 'timed out' : 'unreachable'}`);
        res.status(502).json({
          error: timedOut ? 'Ask Ruud did not answer in time.' : 'Ask Ruud is unavailable.',
          code: 'twin_unavailable',
        });
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return router;
}
