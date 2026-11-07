// Pure helpers behind the admin analytics endpoints: how a page path maps to a
// site section and how a referrer URL maps to a host + a recognisable source.
// Kept free of Prisma so they are unit-testable (see analytics.test.ts).

// The portfolio site's sections, in the order the dashboard lists them.
export const SECTIONS = ['home', 'projects', 'blog', 'expertise', 'about', 'contact', 'other'] as const;
export type Section = (typeof SECTIONS)[number];

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

export function sectionOf(path: string): Section {
  const p = normalisePath(path);
  if (p === '/') return 'home';
  const head = p.split('/')[1] ?? '';
  switch (head) {
    case 'projects':
      return 'projects';
    case 'blog':
      return 'blog';
    case 'expertise':
      return 'expertise';
    case 'about':
      return 'about';
    case 'contact':
      return 'contact';
    default:
      return 'other';
  }
}

// The referrer buckets the dashboard labels. "direct" = no referrer at all;
// "internal" = the site itself (client-side navigation keeps document.referrer).
export const REFERRER_KINDS = ['linkedin', 'github', 'google', 'udemy', 'internal', 'direct', 'other'] as const;
export type ReferrerKind = (typeof REFERRER_KINDS)[number];

const OWN_HOSTS = new Set(['ruudjuffermans.nl', 'localhost', '127.0.0.1']);

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

export function referrerKind(host: string): ReferrerKind {
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
  if (OWN_HOSTS.has(h) || h.endsWith('.ruudjuffermans.nl')) return 'internal';
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
