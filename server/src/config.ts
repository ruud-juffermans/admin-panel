// All configuration comes from the environment (.env in dev, Dokploy's
// Environment tab in production). Anything secret is read here and nowhere else.
import { SITE_ORIGINS } from './website/sites.js';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function float(name: string, fallback: number): number {
  return int(name, fallback);
}

function list(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const websiteUrl = (process.env.WEBSITE_URL ?? 'https://ruudjuffermans.nl').replace(/\/$/, '');
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: int('PORT', 3000),

  // The one admin account. ADMIN_PASSWORD_HASH is a bcrypt hash; produce one
  // with `npm run hash-password`. The server refuses to start without both.
  adminUser: process.env.ADMIN_USER ?? '',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  // Signs the session cookie. Rotating it signs everyone (i.e. Ruud) out.
  sessionSecret: process.env.SESSION_SECRET ?? '',
  sessionTtlMs: int('SESSION_TTL_DAYS', 7) * 24 * 60 * 60 * 1000,
  cookieName: process.env.SESSION_COOKIE_NAME ?? 'admin_session',
  // Secure cookies in production (behind Traefik with TLS); plain http in dev.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,

  // The websites that call the public routes cross-origin: every site in
  // website/sites.ts (their beacons) plus whatever CORS_ORIGIN adds.
  websiteUrl,
  corsOrigins: [...new Set([...list('CORS_ORIGIN', [websiteUrl, 'http://localhost:3000', 'http://localhost:3005'].join(',')), ...SITE_ORIGINS])],

  // Contact form delivery and newsletter signups (copied from the platform server).
  contactEmail: process.env.CONTACT_EMAIL ?? 'ruudjuffermans@pm.me',
  newsletterApiKey: process.env.NEWSLETTER_API_KEY ?? 'placeholder',
  mailFrom: process.env.MAIL_FROM ?? 'Ruud Juffermans <noreply@ruudjuffermans.nl>',

  // The digital twin's admin API, reached server-side only; the browser never
  // sees this origin or token.
  twinApiUrl: process.env.TWIN_API_URL ?? 'http://localhost:8000',
  twinAdminToken: process.env.TWIN_ADMIN_TOKEN ?? '',

  // The Revault server's admin API (revault.nl: intakes, newsletter, page
  // views), reached server-side only with its ADMIN_SERVICE_TOKEN.
  revaultApiUrl: process.env.REVAULT_API_URL ?? 'http://localhost:4000',
  revaultAdminToken: process.env.REVAULT_ADMIN_TOKEN ?? '',

  // "Needs attention" fires when a provider's remaining funds drop below this.
  fundsAlertUsd: float('FUNDS_ALERT_USD', 5),

  // Twin performance alerts on the Overview, over the selected range.
  twinAlerts: {
    ttftP95Ms: int('TWIN_TTFT_P95_ALERT_MS', 4000),
    errorRate: float('TWIN_ERROR_RATE_ALERT', 0.05),
    truncationRate: float('TWIN_TRUNCATION_RATE_ALERT', 0.02),
  },

  // Where the built client lives (Dockerfile copies client/dist here).
  staticDir: process.env.STATIC_DIR ?? new URL('../../client/dist', import.meta.url).pathname,
};

// Fail fast on a half-configured deployment instead of serving a panel nobody
// can log in to (or everybody can).
export function assertConfig(): void {
  const missing: string[] = [];
  if (!config.adminUser) missing.push('ADMIN_USER');
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(config.adminPasswordHash)) missing.push('ADMIN_PASSWORD_HASH (bcrypt)');
  if (config.sessionSecret.length < 32) missing.push('SESSION_SECRET (>= 32 chars)');
  if (missing.length) {
    throw new Error(`Missing or invalid configuration: ${missing.join(', ')}. See .env.example.`);
  }
}
