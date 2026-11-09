import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fillDays, normalisePath, referrerHost, referrerKind, sectionLabel, sectionOf } from './analytics.js';

describe('normalisePath', () => {
  it('drops locale prefix, query, hash and trailing slash', () => {
    assert.equal(normalisePath('/en/projects/foo/?x=1#top'), '/projects/foo');
    assert.equal(normalisePath('/nl'), '/');
    assert.equal(normalisePath('/'), '/');
    assert.equal(normalisePath('about'), '/about');
  });
  it('keeps unrelated prefixes', () => {
    assert.equal(normalisePath('/english/x'), '/english/x');
  });
});

describe('sectionOf', () => {
  it('maps paths to the site sections', () => {
    assert.equal(sectionOf('/'), 'home');
    assert.equal(sectionOf('/en'), 'home');
    assert.equal(sectionOf('/projects'), 'projects');
    assert.equal(sectionOf('/projects/digital-twin'), 'projects');
    assert.equal(sectionOf('/en/blog/some-post'), 'blog');
    assert.equal(sectionOf('/expertise/data'), 'expertise');
    assert.equal(sectionOf('/about'), 'about');
    assert.equal(sectionOf('/contact/'), 'contact');
    assert.equal(sectionOf('/privacy'), 'other');
  });
  it('uses the sections of the given site', () => {
    assert.equal(sectionOf('/', 'loodgieterjuffermans.nl'), 'home');
    assert.equal(sectionOf('/diensten/zinkwerk', 'loodgieterjuffermans.nl'), 'diensten');
    assert.equal(sectionOf('/regio/haarlem/', 'loodgieterjuffermans.nl'), 'regio');
    assert.equal(sectionOf('/galerij', 'loodgieterjuffermans.nl'), 'galerij');
    assert.equal(sectionOf('/privacy', 'loodgieterjuffermans.nl'), 'other');
    // The portfolio's sections do not leak into another site.
    assert.equal(sectionOf('/projects', 'loodgieterjuffermans.nl'), 'other');
  });
});

describe('sectionLabel', () => {
  it('labels known sections per site and falls back to the key', () => {
    assert.equal(sectionLabel('projects'), 'Projects');
    assert.equal(sectionLabel('diensten', 'loodgieterjuffermans.nl'), 'Diensten');
    assert.equal(sectionLabel('other', 'loodgieterjuffermans.nl'), 'Overig');
    assert.equal(sectionLabel('mystery'), 'mystery');
  });
});

describe('referrerHost', () => {
  it('extracts a lower-cased host without www or port', () => {
    assert.equal(referrerHost('https://www.LinkedIn.com/feed/'), 'linkedin.com');
    assert.equal(referrerHost('http://localhost:3000/'), 'localhost');
    assert.equal(referrerHost('android-app://com.linkedin.android/'), 'com.linkedin.android');
  });
  it('is empty for no referrer and keeps non-URLs visible', () => {
    assert.equal(referrerHost(null), '');
    assert.equal(referrerHost('   '), '');
    assert.equal(referrerHost('Some App'), 'some app');
  });
});

describe('referrerKind', () => {
  it('labels the well-known sources', () => {
    assert.equal(referrerKind('linkedin.com'), 'linkedin');
    assert.equal(referrerKind('nl.linkedin.com'), 'linkedin');
    assert.equal(referrerKind('lnkd.in'), 'linkedin');
    assert.equal(referrerKind('com.linkedin.android'), 'linkedin');
    assert.equal(referrerKind('github.com'), 'github');
    assert.equal(referrerKind('ruud.github.io'), 'github');
    assert.equal(referrerKind('google.com'), 'google');
    assert.equal(referrerKind('www.google.nl'), 'google');
    assert.equal(referrerKind('udemy.com'), 'udemy');
    assert.equal(referrerKind('ruudjuffermans.nl'), 'internal');
    assert.equal(referrerKind('account.ruudjuffermans.nl'), 'internal');
    assert.equal(referrerKind(''), 'direct');
    assert.equal(referrerKind('duckduckgo.com'), 'other');
  });
  it('does not match look-alike hosts', () => {
    assert.equal(referrerKind('notgithub.com'), 'other');
    assert.equal(referrerKind('google.com.evil.io'), 'other');
  });
  it('treats only the given site (and dev hosts) as internal', () => {
    assert.equal(referrerKind('www.loodgieterjuffermans.nl', 'loodgieterjuffermans.nl'), 'internal');
    assert.equal(referrerKind('ruudjuffermans.nl', 'loodgieterjuffermans.nl'), 'other');
    assert.equal(referrerKind('loodgieterjuffermans.nl'), 'other');
    assert.equal(referrerKind('localhost', 'loodgieterjuffermans.nl'), 'internal');
  });
});

describe('fillDays', () => {
  it('returns one row per day, oldest first, with blanks for missing days', () => {
    const until = new Date('2026-10-22T15:00:00Z');
    const rows = [{ day: '2026-10-21', count: 2 }];
    const out = fillDays(rows, 3, until, (day) => ({ day, count: 0 }));
    assert.deepEqual(out, [
      { day: '2026-10-20', count: 0 },
      { day: '2026-10-21', count: 2 },
      { day: '2026-10-22', count: 0 },
    ]);
  });
});
