import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from './session.js';

const SECRET = 'x'.repeat(32);

describe('session token', () => {
  it('round-trips and carries the expiry', () => {
    const token = createSessionToken('ruud', 1000, SECRET, 10_000);
    assert.deepEqual(verifySessionToken(token, SECRET, 10_500), { u: 'ruud', exp: 11_000 });
  });
  it('rejects expired, tampered, foreign-secret and malformed tokens', () => {
    const token = createSessionToken('ruud', 1000, SECRET, 10_000);
    assert.equal(verifySessionToken(token, SECRET, 11_000), null);
    assert.equal(verifySessionToken(token, 'y'.repeat(32), 10_500), null);
    assert.equal(verifySessionToken(`${token}a`, SECRET, 10_500), null);
    const [payload, sig] = token.split('.');
    const other = createSessionToken('eve', 1000, SECRET, 10_000).split('.')[0];
    assert.equal(verifySessionToken(`${other}.${sig}`, SECRET, 10_500), null);
    assert.equal(verifySessionToken(payload, SECRET, 10_500), null);
    assert.equal(verifySessionToken(undefined, SECRET), null);
    assert.equal(verifySessionToken('', SECRET), null);
    assert.equal(verifySessionToken(token, '', 10_500), null);
  });
});
