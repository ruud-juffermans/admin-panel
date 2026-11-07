import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createTwinProxy, forwardedQuery, isAllowed, twinGet, TwinUnavailable } from './twinProxy.js';

describe('twin proxy allow-list', () => {
  it('accepts exactly the admin read paths and the two write paths', () => {
    assert.equal(isAllowed('GET', '/approvals'), true);
    assert.equal(isAllowed('POST', '/approvals/t-123_x'), true);
    assert.equal(isAllowed('GET', '/stats/overview'), true);
    assert.equal(isAllowed('GET', '/evals/42'), true);
    assert.equal(isAllowed('PATCH', '/unanswered/7'), true);
    assert.equal(isAllowed('GET', '/knowledge'), true);
    assert.equal(isAllowed('GET', '/threads'), true);
    assert.equal(isAllowed('GET', '/prompt'), true);
    assert.equal(isAllowed('GET', '/providers'), true);
    assert.equal(isAllowed('GET', '/providers/spend'), true);
  });
  it('rejects everything else', () => {
    assert.equal(isAllowed('DELETE', '/approvals/t-1'), false);
    assert.equal(isAllowed('GET', '/approvals/t-1'), false);
    assert.equal(isAllowed('POST', '/unanswered/7'), false);
    assert.equal(isAllowed('GET', '/evals/abc'), false);
    assert.equal(isAllowed('GET', '/../chat'), false);
    assert.equal(isAllowed('GET', '/stats'), false);
    assert.equal(isAllowed('GET', '/'), false);
  });
});

describe('forwardedQuery', () => {
  it('keeps only known parameters', () => {
    assert.equal(forwardedQuery({ days: '30', limit: '50', evil: 'x' }), '?days=30&limit=50');
    assert.equal(forwardedQuery({}), '');
    assert.equal(forwardedQuery({ days: ['1', '2'] as unknown as string }), '');
  });
});

describe('twin proxy forwarding', () => {
  let twin: Server;
  let twinUrl: string;
  let seen: Array<{ method: string; url: string; auth?: string; body: unknown }> = [];

  before(async () => {
    const fake = express();
    fake.use(express.json());
    fake.all('*', (req, res) => {
      seen.push({ method: req.method, url: req.url, auth: req.header('authorization'), body: req.body });
      if (req.url.startsWith('/api/admin/evals/404')) {
        res.status(404).json({ error: 'Eval run not found.' });
        return;
      }
      if (req.url.startsWith('/api/admin/stats/timeseries')) {
        setTimeout(() => res.json({ late: true }), 300);
        return;
      }
      res.json({ ok: true, path: req.path });
    });
    await new Promise<void>((resolve) => {
      twin = fake.listen(0, '127.0.0.1', resolve);
    });
    twinUrl = `http://127.0.0.1:${(twin.address() as AddressInfo).port}`;
  });
  after(() => twin.close());

  function appWith(timeoutMs = 2000, baseUrl = twinUrl) {
    const app = express();
    app.use(express.json());
    app.use('/api/website/admin/twin', createTwinProxy({ baseUrl, token: 'secret-token', timeoutMs }));
    return new Promise<{ server: Server; url: string }>((resolve) => {
      const server = app.listen(0, '127.0.0.1', () =>
        resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }),
      );
    });
  }

  it('forwards GET with the bearer token and filtered query', async () => {
    seen = [];
    const { server, url } = await appWith();
    const res = await fetch(`${url}/api/website/admin/twin/stats/overview?days=7&junk=1`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, path: '/api/admin/stats/overview' });
    assert.equal(seen[0]?.url, '/api/admin/stats/overview?days=7');
    assert.equal(seen[0]?.auth, 'Bearer secret-token');
    server.close();
  });

  it('forwards POST bodies and passes upstream status through', async () => {
    seen = [];
    const { server, url } = await appWith();
    const res = await fetch(`${url}/api/website/admin/twin/approvals/t-1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true, note: 'ok' }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(seen[0]?.body, { approved: true, note: 'ok' });
    const missing = await fetch(`${url}/api/website/admin/twin/evals/404`);
    assert.equal(missing.status, 404);
    server.close();
  });

  it('returns 404 for a non-allow-listed path without calling the twin', async () => {
    seen = [];
    const { server, url } = await appWith();
    const res = await fetch(`${url}/api/website/admin/twin/chat`, { method: 'POST' });
    assert.equal(res.status, 404);
    const del = await fetch(`${url}/api/website/admin/twin/approvals/t-1`, { method: 'DELETE' });
    assert.equal(del.status, 404);
    assert.equal(seen.length, 0);
    server.close();
  });

  it('twinGet returns JSON, maps upstream errors and fails closed without a token', async () => {
    seen = [];
    const body = await twinGet<{ ok: boolean; path: string }>({ baseUrl: twinUrl, token: 'secret-token' }, '/providers', { since: '2026-01-01', skip: undefined });
    assert.deepEqual(body, { ok: true, path: '/api/admin/providers' });
    assert.equal(seen[0]?.url, '/api/admin/providers?since=2026-01-01');
    assert.equal(seen[0]?.auth, 'Bearer secret-token');
    await assert.rejects(twinGet({ baseUrl: twinUrl, token: 'secret-token' }, '/evals/404'), (e: unknown) => e instanceof TwinUnavailable && e.status === 404);
    await assert.rejects(twinGet({ baseUrl: twinUrl, token: '' }, '/providers'), (e: unknown) => e instanceof TwinUnavailable && e.status === 503);
    await assert.rejects(twinGet({ baseUrl: 'http://127.0.0.1:1', token: 't' }, '/providers'), (e: unknown) => e instanceof TwinUnavailable && e.status === 502);
  });

  it('returns 502 when the twin is down or slow', async () => {
    const down = await appWith(2000, 'http://127.0.0.1:1');
    const res = await fetch(`${down.url}/api/website/admin/twin/approvals`);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).code, 'twin_unavailable');
    down.server.close();

    const slow = await appWith(50);
    const late = await fetch(`${slow.url}/api/website/admin/twin/stats/timeseries`);
    assert.equal(late.status, 502);
    slow.server.close();
  });
});
