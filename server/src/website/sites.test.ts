import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_ORIGINS, isSiteId, siteFromOrigin } from './sites.js';

describe('siteFromOrigin', () => {
  it('maps a registered origin to its site, tolerating case and a trailing slash', () => {
    assert.equal(siteFromOrigin('https://ruudjuffermans.nl'), 'ruudjuffermans.nl');
    assert.equal(siteFromOrigin('https://www.loodgieterjuffermans.nl/'), 'loodgieterjuffermans.nl');
    assert.equal(siteFromOrigin('HTTPS://LOODGIETERJUFFERMANS.NL'), 'loodgieterjuffermans.nl');
  });
  it('is null for unknown or missing origins', () => {
    assert.equal(siteFromOrigin(undefined), null);
    assert.equal(siteFromOrigin(''), null);
    assert.equal(siteFromOrigin('https://evil.example'), null);
    assert.equal(siteFromOrigin('https://ruudjuffermans.nl.evil.example'), null);
  });
});

describe('isSiteId / SITE_ORIGINS', () => {
  it('recognises registered ids only', () => {
    assert.equal(isSiteId('ruudjuffermans.nl'), true);
    assert.equal(isSiteId('revault.nl'), false);
    assert.equal(isSiteId(42), false);
  });
  it('lists every site origin once', () => {
    assert.ok(SITE_ORIGINS.includes('https://www.loodgieterjuffermans.nl'));
    assert.equal(new Set(SITE_ORIGINS).size, SITE_ORIGINS.length);
  });
});
