// Pure helpers behind the admin analytics endpoints: how a page path maps to a
// site section and how a referrer URL maps to a host + a recognisable source.
// Kept free of Prisma so they are unit-testable (see analytics.test.ts).
// Everything is per site: which sections exist and which hosts are "internal"
// come from the registry in sites.ts.
import { DEFAULT_SITE, SITES, type SiteId } from './sites.js';

export type Section = string;

const LOCALE_PREFIX = /^\/(nl|en)(?=\/|$)/;

// Normalise a recorded path: drop query/hash, an optional locale prefix and a
// trailing slash, so "/en/projects/foo/?x=1" and "/projects/foo" group together.
export function normalisePath(path: string): string {
  let p = path.trim().split(/[?#]/)[0] ?? '';
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(LOCALE_PREFIX, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function sectionOf(path: string, site: SiteId = DEFAULT_SITE): Section {
  const p = normalisePath(path);
  if (p === '/') return 'home';
  const head = p.split('/')[1] ?? '';
  return SITES[site].sections[head] ?? 'other';
}

export function sectionLabel(section: Section, site: SiteId = DEFAULT_SITE): string {
  return SITES[site].sectionLabels[section] ?? section;
}

// The referrer buckets the dashboard labels. "direct" = no referrer at all;
// "internal" = the site itself (client-side navigation keeps document.referrer).
export const REFERRER_KINDS = ['linkedin', 'github', 'google', 'udemy', 'internal', 'direct', 'other'] as const;
export type ReferrerKind = (typeof REFERRER_KINDS)[number];

// Dev hosts count as internal for every site.
const DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

// Lower-cased host of a referrer URL without "www." or a port; "" when there is
// no referrer. A referrer that is not a URL is returned as-is (lower-cased) so
// odd values stay visible instead of being counted as direct.
export function referrerHost(referrer: string | null | undefined): string {
  const raw = (referrer ?? '').trim();
  if (!raw) return '';
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return raw.toLowerCase();
  }
}

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

export function referrerKind(host: string, site: SiteId = DEFAULT_SITE): ReferrerKind {
  let h = host.toLowerCase().replace(/^www\./, '');
  if (!h) return 'direct';
  // Android apps report a reverse-domain package ("android-app://com.linkedin.android");
  // fold the known ones onto their web host.
  const pkg = /^com\.(linkedin|google|github|udemy)\./.exec(h);
  if (pkg) h = `${pkg[1]}.com`;
  if (hostMatches(h, ['linkedin.com', 'lnkd.in'])) return 'linkedin';
  if (hostMatches(h, ['github.com', 'github.io'])) return 'github';
  if (/^(.*\.)?google\.(com|[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(h) || h === 'googleusercontent.com') return 'google';
  if (hostMatches(h, ['udemy.com'])) return 'udemy';
  if (DEV_HOSTS.has(h) || hostMatches(h, SITES[site].hosts)) return 'internal';
  return 'other';
}

// Fill a day-keyed series so every calendar day in [first, last] has a row —
// charts want a continuous axis. `days` is the window length; `until` its end.
export function fillDays<T extends { day: string }>(
  rows: T[],
  days: number,
  until: Date,
  blank: (day: string) => T,
): T[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: T[] = [];
  const end = Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? blank(day));
  }
  return out;
}
