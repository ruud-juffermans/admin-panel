import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRevaultProxy, isRevaultAllowed, revaultQuery } from './revaultProxy.js';

describe('revault proxy allow-list', () => {
  it('accepts the intake, newsletter and analytics paths', () => {
    assert.equal(isRevaultAllowed('GET', '/intakes'), true);
    assert.equal(isRevaultAllowed('GET', '/intakes/stats'), true);
    assert.equal(isRevaultAllowed('GET', '/intakes/RV-202611-AB7K'), true);
    assert.equal(isRevaultAllowed('PATCH', '/intakes/RV-202611-AB7K'), true);
    assert.equal(isRevaultAllowed('DELETE', '/intakes/RV-202611-AB7K'), true);
    assert.equal(isRevaultAllowed('GET', '/newsletter'), true);
    assert.equal(isRevaultAllowed('GET', '/newsletter/stats'), true);
    assert.equal(isRevaultAllowed('POST', '/newsletter/clx1abc/unsubscribe'), true);
    assert.equal(isRevaultAllowed('DELETE', '/newsletter/clx1abc'), true);
    assert.equal(isRevaultAllowed('GET', '/analytics/overview'), true);
    assert.equal(isRevaultAllowed('GET', '/analytics/timeseries'), true);
    assert.equal(isRevaultAllowed('GET', '/analytics/top-pages'), true);
    assert.equal(isRevaultAllowed('GET', '/analytics/top-referrers'), true);
  });
  it('rejects everything else', () => {
    assert.equal(isRevaultAllowed('POST', '/intakes'), false);
    assert.equal(isRevaultAllowed('GET', '/intakes/not-a-reference'), false);
    assert.equal(isRevaultAllowed('DELETE', '/intakes/stats'), false);
    assert.equal(isRevaultAllowed('PATCH', '/newsletter/clx1abc'), false);
    assert.equal(isRevaultAllowed('GET', '/newsletter/clx1abc/unsubscribe'), false);
    assert.equal(isRevaultAllowed('GET', '/../intake'), false);
    assert.equal(isRevaultAllowed('GET', '/'), false);
  });
});

describe('revaultQuery', () => {
  it('keeps only known parameters', () => {
    assert.equal(revaultQuery({ days: '30', status: 'NEW', evil: 'x' }), '?days=30&status=NEW');
    assert.equal(revaultQuery({ active: 'true', limit: '50', offset: '0' }), '?limit=50&offset=0&active=true');
    assert.equal(revaultQuery({}), '');
  });
});

describe('revault proxy forwarding', () => {
  let upstream: Server;
  let url: string;
  const seen: Array<{ method: string; url: string; auth?: string; body: unknown }> = [];

  before(async () => {
    const fake = express();
    fake.use(express.json());
    fake.all('*', (req, res) => {
      seen.push({ method: req.method, url: req.url, auth: req.header('authorization'), body: req.body });
      if (req.url.startsWith('/api/revault/admin/intakes/RV-000000-XXXX')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json({ ok: true, path: req.path });
    });
    await new Promise<void>((resolve) => {
      upstream = fake.listen(0, resolve);
    });
    url = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  });
  after(() => upstream.close());

  function panel(token = 'secret-token') {
    const app = express();
    app.use(express.json());
    app.use('/api/website/admin/revault', createRevaultProxy({ baseUrl: url, token, timeoutMs: 500 }));
    return app;
  }

  async function call(app: express.Express, method: string, path: string, body?: unknown) {
    const server = app.listen(0);
    try {
      const port = (server.address() as AddressInfo).port;
      const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    } finally {
      server.close();
    }
  }

  it('forwards with the bearer token, the upstream prefix and known query params', async () => {
    seen.length = 0;
    const res = await call(panel(), 'GET', '/api/website/admin/revault/intakes?status=NEW&limit=10&evil=1');
    assert.equal(res.status, 200);
    assert.equal(seen.length, 1);
    assert.equal(seen[0]!.url, '/api/revault/admin/intakes?limit=10&status=NEW');
    assert.equal(seen[0]!.auth, 'Bearer secret-token');
  });

  it('forwards PATCH bodies and passes upstream status through', async () => {
    seen.length = 0;
    const ok = await call(panel(), 'PATCH', '/api/website/admin/revault/intakes/RV-202611-AB7K', { status: 'VIABLE' });
    assert.equal(ok.status, 200);
    assert.deepEqual(seen[0]!.body, { status: 'VIABLE' });
    const missing = await call(panel(), 'GET', '/api/website/admin/revault/intakes/RV-000000-XXXX');
    assert.equal(missing.status, 404);
  });

  it('refuses paths outside the allow-list before any network call', async () => {
    seen.length = 0;
    const res = await call(panel(), 'POST', '/api/website/admin/revault/intakes');
    assert.equal(res.status, 404);
    assert.equal(seen.length, 0);
  });

  it('answers 503 without a token and 502 when Revault is down', async () => {
    const noToken = await call(panel(''), 'GET', '/api/website/admin/revault/intakes');
    assert.equal(noToken.status, 503);
    const app = express();
    app.use('/api/website/admin/revault', createRevaultProxy({ baseUrl: 'http://127.0.0.1:1', token: 'x', timeoutMs: 500 }));
    const down = await call(app, 'GET', '/api/website/admin/revault/intakes');
    assert.equal(down.status, 502);
    assert.equal(down.body.code, 'revault_unavailable');
  });
});
