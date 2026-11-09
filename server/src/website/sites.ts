// The websites whose page views land in this panel's own page_views table
// (revault.nl keeps its own server and is proxied instead, see revaultProxy.ts).
// Adding a site here is all the server needs: its origins are CORS-allowed for
// the public beacon, a view is attributed to it by the request's Origin, and
// the analytics endpoints group its paths into the sections listed below.

export const SITE_IDS = ['ruudjuffermans.nl', 'loodgieterjuffermans.nl'] as const;
export type SiteId = (typeof SITE_IDS)[number];

// Rows recorded before the `site` column existed are the portfolio's.
export const DEFAULT_SITE: SiteId = 'ruudjuffermans.nl';

export interface SiteConfig {
  id: SiteId;
  label: string;
  // Browser origins the beacon is posted from (production + local dev).
  origins: string[];
  // Referrers on these hosts (or their subdomains) count as "internal".
  hosts: string[];
  // First path segment → section key; "/" is always "home", the rest "other".
  sections: Record<string, string>;
  // Section key → label, in the order the dashboard should list them.
  sectionLabels: Record<string, string>;
}

export const SITES: Record<SiteId, SiteConfig> = {
  'ruudjuffermans.nl': {
    id: 'ruudjuffermans.nl',
    label: 'ruudjuffermans.nl',
    origins: ['https://ruudjuffermans.nl', 'https://www.ruudjuffermans.nl'],
    hosts: ['ruudjuffermans.nl'],
    sections: { projects: 'projects', blog: 'blog', expertise: 'expertise', about: 'about', contact: 'contact' },
    sectionLabels: { home: 'Home', projects: 'Projects', blog: 'Blog', expertise: 'Expertise', about: 'About', contact: 'Contact', other: 'Other' },
  },
  'loodgieterjuffermans.nl': {
    id: 'loodgieterjuffermans.nl',
    label: 'loodgieterjuffermans.nl',
    origins: ['https://www.loodgieterjuffermans.nl', 'https://loodgieterjuffermans.nl', 'http://localhost:5173'],
    hosts: ['loodgieterjuffermans.nl'],
    sections: { diensten: 'diensten', regio: 'regio', galerij: 'galerij' },
    sectionLabels: { home: 'Home', diensten: 'Diensten', regio: 'Regio', galerij: 'Galerij', other: 'Overig' },
  },
};

export function isSiteId(value: unknown): value is SiteId {
  return typeof value === 'string' && (SITE_IDS as readonly string[]).includes(value);
}

// Every origin a registered site posts from; merged into the CORS allow-list.
export const SITE_ORIGINS: string[] = [...new Set(Object.values(SITES).flatMap((s) => s.origins))];

// Which site a beacon came from, by its Origin header (trailing slash and case
// tolerated). null when the origin is unknown or absent (same-origin / curl).
export function siteFromOrigin(origin: string | undefined): SiteId | null {
  if (!origin) return null;
  const o = origin.trim().replace(/\/$/, '').toLowerCase();
  for (const site of Object.values(SITES)) {
    if (site.origins.some((x) => x.toLowerCase() === o)) return site.id;
  }
  return null;
}
