import { Router, type Request, type Response } from 'express';
import { asyncRoute } from '../http.js';

// Reverse proxy from /api/website/admin/revault/* to the Revault server's
// bearer-guarded /api/revault/admin/* (revault.nl's intake, newsletter and
// page-view data). Same shape as the twin proxy: the admin UI only ever holds
// the panel's session cookie, the service token is attached here and never
// reaches a browser build, and only the paths below are forwarded.

export interface RevaultProxyOptions {
  baseUrl: string; // e.g. http://revault-server-1:4000
  token: string; // REVAULT_ADMIN_TOKEN (= the Revault server's ADMIN_SERVICE_TOKEN)
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface Rule {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  pattern: RegExp;
}

// Mirrors server/src/routes/admin.ts in the revault repo.
const REFERENCE = 'RV-[0-9]{6}-[A-Z2-9]{4}';
const ID = '[a-z0-9]{1,40}';
export const REVAULT_ALLOW_LIST: Rule[] = [
  { method: 'GET', pattern: /^\/intakes$/ },
  { method: 'GET', pattern: /^\/intakes\/stats$/ },
  { method: 'GET', pattern: new RegExp(`^/intakes/${REFERENCE}$`) },
  { method: 'PATCH', pattern: new RegExp(`^/intakes/${REFERENCE}$`) },
  { method: 'DELETE', pattern: new RegExp(`^/intakes/${REFERENCE}$`) },
  { method: 'GET', pattern: /^\/newsletter$/ },
  { method: 'GET', pattern: /^\/newsletter\/stats$/ },
  { method: 'POST', pattern: new RegExp(`^/newsletter/${ID}/unsubscribe$`) },
  { method: 'DELETE', pattern: new RegExp(`^/newsletter/${ID}$`) },
  { method: 'GET', pattern: /^\/analytics\/summary$/ },
  { method: 'GET', pattern: /^\/analytics\/overview$/ },
  { method: 'GET', pattern: /^\/analytics\/timeseries$/ },
  { method: 'GET', pattern: /^\/analytics\/top-pages$/ },
  { method: 'GET', pattern: /^\/analytics\/top-referrers$/ },
];

export function isRevaultAllowed(method: string, path: string): boolean {
  return REVAULT_ALLOW_LIST.some((rule) => rule.method === method && rule.pattern.test(path));
}

const FORWARDED_QUERY = new Set(['days', 'limit', 'offset', 'status', 'active']);

export function revaultQuery(query: Request['query']): string {
  const params = new URLSearchParams();
  for (const key of FORWARDED_QUERY) {
    const value = query[key];
    if (typeof value === 'string' && value !== '') params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function createRevaultProxy(options: RevaultProxyOptions): Router {
  const router = Router();
  const base = options.baseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 10_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  router.all(
    '*',
    asyncRoute(async (req: Request, res: Response) => {
      const path = req.path.replace(/\/$/, '') || '/';
      if (!isRevaultAllowed(req.method, path)) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      if (!options.token) {
        res.status(503).json({ error: 'Revault admin access is not configured (REVAULT_ADMIN_TOKEN).', code: 'revault_unavailable' });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const hasBody = req.method === 'PATCH' || req.method === 'POST';
        const upstream = await fetchImpl(`${base}/api/revault/admin${path}${revaultQuery(req.query)}`, {
          method: req.method,
          headers: {
            authorization: `Bearer ${options.token}`,
            accept: 'application/json',
            ...(hasBody ? { 'content-type': 'application/json' } : {}),
          },
          body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
          signal: controller.signal,
        });
        // Pass status and JSON body through untouched; never log the body
        // (intakes are personal data).
        const text = await upstream.text();
        res.status(upstream.status);
        res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
        res.send(text);
      } catch (err) {
        const timedOut = err instanceof Error && err.name === 'AbortError';
        console.warn(`[revault-proxy] ${req.method} ${path}: ${timedOut ? 'timed out' : 'unreachable'}`);
        res.status(502).json({
          error: timedOut ? 'Revault did not answer in time.' : 'Revault is unavailable.',
          code: 'revault_unavailable',
        });
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return router;
}
