import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../http.js';
import { fillDays, referrerKind, sectionLabel, sectionOf, type Section } from '../analytics.js';
import { DEFAULT_SITE, SITE_IDS, type SiteId } from '../sites.js';

// Admin API for the site's data sets: contact submissions, newsletter
// subscribers, and page-view analytics. Mounted behind requireServiceOrAdmin
// (see modules/website/index.ts) so both the central admin app (service token)
// and a signed-in platform admin can use it.
export const adminRouter = Router();

// Clamp how far back analytics/listing queries look and how many rows return,
// so a stray query can never scan or return the whole table unbounded.
const daysQuery = z.coerce.number().int().min(1).max(365).default(30);
const limitQuery = z.coerce.number().int().min(1).max(500).default(100);
// Which website's page views an analytics endpoint reports on (sites.ts).
const siteQuery = z.enum(SITE_IDS).default(DEFAULT_SITE);

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─── Contact submissions ───────────────────────────────────────────────────

const contactStatus = z.enum(['new', 'responded', 'archived']);

// GET /contact?status=&limit= — list submissions, newest first.
adminRouter.get(
  '/contact',
  asyncRoute(async (req, res) => {
    const { status, limit } = z
      .object({ status: contactStatus.optional(), limit: limitQuery })
      .parse(req.query);
    const submissions = await prisma.contactSubmission.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ submissions });
  }),
);

// GET /contact/stats — counts per status for the dashboard.
adminRouter.get(
  '/contact/stats',
  asyncRoute(async (_req, res) => {
    const grouped = await prisma.contactSubmission.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts = { new: 0, responded: 0, archived: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;
    res.json({ counts, total: counts.new + counts.responded + counts.archived });
  }),
);

// PATCH /contact/:id/status — move a submission between new/responded/archived.
adminRouter.patch(
  '/contact/:id/status',
  asyncRoute(async (req, res) => {
    const { status } = z.object({ status: contactStatus }).parse(req.body);
    const submission = await prisma.contactSubmission
      .update({ where: { id: req.params.id }, data: { status } })
      .catch(() => null);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }
    res.json({ submission });
  }),
);

// DELETE /contact/:id — permanently remove a submission.
adminRouter.delete(
  '/contact/:id',
  asyncRoute(async (req, res) => {
    const deleted = await prisma.contactSubmission
      .delete({ where: { id: req.params.id } })
      .catch(() => null);
    if (!deleted) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }
    res.json({ ok: true });
  }),
);

// ─── Newsletter subscribers ────────────────────────────────────────────────

// GET /newsletter?active=&limit= — list subscribers, newest first.
adminRouter.get(
  '/newsletter',
  asyncRoute(async (req, res) => {
    const { active, limit } = z
      .object({
        active: z
          .enum(['true', 'false'])
          .transform((v) => v === 'true')
          .optional(),
        limit: limitQuery,
      })
      .parse(req.query);
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: active === undefined ? {} : { active },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ subscribers });
  }),
);

// GET /newsletter/stats — totals + source breakdown for the dashboard.
adminRouter.get(
  '/newsletter/stats',
  asyncRoute(async (_req, res) => {
    const [total, active, bySource] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { active: true } }),
      prisma.newsletterSubscriber.groupBy({
        by: ['source'],
        _count: { _all: true },
      }),
    ]);
    res.json({
      total,
      active,
      unsubscribed: total - active,
      bySource: bySource.map((r) => ({ source: r.source, count: r._count._all })),
    });
  }),
);

// POST /newsletter/:id/unsubscribe — mark inactive (keeps the row for history).
adminRouter.post(
  '/newsletter/:id/unsubscribe',
  asyncRoute(async (req, res) => {
    const subscriber = await prisma.newsletterSubscriber
      .update({
        where: { id: req.params.id },
        data: { active: false, unsubscribedAt: new Date() },
      })
      .catch(() => null);
    if (!subscriber) {
      res.status(404).json({ error: 'Subscriber not found.' });
      return;
    }
    res.json({ subscriber });
  }),
);

// DELETE /newsletter/:id — permanently remove a subscriber.
adminRouter.delete(
  '/newsletter/:id',
  asyncRoute(async (req, res) => {
    const deleted = await prisma.newsletterSubscriber
      .delete({ where: { id: req.params.id } })
      .catch(() => null);
    if (!deleted) {
      res.status(404).json({ error: 'Subscriber not found.' });
      return;
    }
    res.json({ ok: true });
  }),
);

// ─── Page-view analytics ───────────────────────────────────────────────────
//
// Every endpoint takes `days` (the window ending now) and `site` (which
// website, default the portfolio). "Previous" figures cover the window of the
// same length immediately before it, so the dashboard can show a change. Days
// are UTC calendar days (created_at is stored in UTC).

type LocaleCounts = Record<string, number>;

function localeKey(locale: string | null): string {
  return locale ?? 'unknown';
}

// `until` bounds the previous window; the current window is open-ended so it
// counts exactly what the other analytics endpoints count.
async function countByLocale(site: SiteId, since: Date, until?: Date): Promise<{ total: number; byLocale: LocaleCounts }> {
  const grouped = await prisma.pageView.groupBy({
    by: ['locale'],
    where: { site, createdAt: until ? { gte: since, lt: until } : { gte: since } },
    _count: { _all: true },
  });
  const byLocale: LocaleCounts = {};
  let total = 0;
  for (const r of grouped) {
    byLocale[localeKey(r.locale)] = r._count._all;
    total += r._count._all;
  }
  return { total, byLocale };
}

// GET /analytics/overview?days=&site= — headline totals for the window and the one before.
adminRouter.get(
  '/analytics/overview',
  asyncRoute(async (req, res) => {
    const { days, site } = z.object({ days: daysQuery, site: siteQuery }).parse(req.query);
    const now = new Date();
    const since = cutoff(days);
    const [current, previous] = await Promise.all([countByLocale(site, since), countByLocale(site, cutoff(days * 2), since)]);
    res.json({
      site,
      days,
      since: since.toISOString(),
      until: now.toISOString(),
      totalViews: current.total,
      byLocale: Object.entries(current.byLocale).map(([locale, count]) => ({ locale, count })),
      previous: {
        totalViews: previous.total,
        byLocale: Object.entries(previous.byLocale).map(([locale, count]) => ({ locale, count })),
      },
    });
  }),
);

// GET /analytics/top-pages?days=&site=&limit=&group=section — most visited paths.
// Flat by default (each row carries its section); `group=section` nests the
// paths under their section (key + label), sections ordered by total views.
adminRouter.get(
  '/analytics/top-pages',
  asyncRoute(async (req, res) => {
    const { days, site, limit, group } = z
      .object({ days: daysQuery, site: siteQuery, limit: limitQuery, group: z.enum(['section']).optional() })
      .parse(req.query);
    const grouped = await prisma.pageView.groupBy({
      by: ['path'],
      where: { site, createdAt: { gte: cutoff(days) } },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: limit,
    });
    const pages = grouped.map((r) => ({ path: r.path, section: sectionOf(r.path, site), count: r._count._all }));
    if (group !== 'section') {
      res.json({ pages });
      return;
    }
    const bySection = new Map<Section, { section: Section; label: string; count: number; pages: typeof pages }>();
    for (const page of pages) {
      const entry = bySection.get(page.section) ?? { section: page.section, label: sectionLabel(page.section, site), count: 0, pages: [] };
      entry.count += page.count;
      entry.pages.push(page);
      bySection.set(page.section, entry);
    }
    const sections = [...bySection.values()].sort((a, b) => b.count - a.count);
    res.json({ sections });
  }),
);

// GET /analytics/top-referrers?days=&site=&limit=&group=host — where traffic comes from.
// Flat (full referrer URL) by default; `group=host` collapses URLs onto their
// host, strips "www.", and labels each host (linkedin / github / google / …).
adminRouter.get(
  '/analytics/top-referrers',
  asyncRoute(async (req, res) => {
    const { days, site, limit, group } = z
      .object({ days: daysQuery, site: siteQuery, limit: limitQuery, group: z.enum(['host']).optional() })
      .parse(req.query);
    if (group === 'host') {
      // Host extraction in SQL so the LIMIT applies to hosts, not URLs. A
      // referrer that is not a URL keeps its raw (lower-cased) value; no
      // referrer at all becomes '' (= direct). Mirrors referrerHost() in
      // ../analytics.ts.
      const rows = await prisma.$queryRaw<Array<{ host: string; count: bigint }>>(
        Prisma.sql`
          SELECT COALESCE(
                   regexp_replace(
                     lower(substring(referrer from '^[A-Za-z][A-Za-z0-9+.-]*://([^/?#:]+)')),
                     '^www\\.', ''),
                   NULLIF(lower(trim(referrer)), ''),
                   '') AS host,
                 COUNT(*)::bigint AS count
          FROM website.page_views
          WHERE site = ${site} AND created_at >= ${cutoff(days)}
          GROUP BY host
          ORDER BY count DESC, host ASC
          LIMIT ${limit}
        `,
      );
      res.json({
        referrers: rows.map((r) => ({
          host: r.host === '' ? 'direct' : r.host,
          kind: referrerKind(r.host, site),
          count: Number(r.count),
        })),
      });
      return;
    }
    const grouped = await prisma.pageView.groupBy({
      by: ['referrer'],
      where: { site, createdAt: { gte: cutoff(days) } },
      _count: { _all: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: limit,
    });
    res.json({
      referrers: grouped.map((r) => ({
        referrer: r.referrer ?? 'direct',
        count: r._count._all,
      })),
    });
  }),
);

// GET /analytics/timeseries?days=&site= — page views per day (total + per locale),
// one row per calendar day in the window, oldest first, zero-filled.
adminRouter.get(
  '/analytics/timeseries',
  asyncRoute(async (req, res) => {
    const { days, site } = z.object({ days: daysQuery, site: siteQuery }).parse(req.query);
    // date_trunc gives one bucket per day; Prisma groupBy can't truncate, so use
    // a parameterized raw query (note the schema-qualified table).
    const rows = await prisma.$queryRaw<Array<{ day: Date; locale: string | null; count: bigint }>>(
      Prisma.sql`
        SELECT date_trunc('day', created_at) AS day, locale, COUNT(*)::bigint AS count
        FROM website.page_views
        WHERE site = ${site} AND created_at >= ${cutoff(days)}
        GROUP BY day, locale
        ORDER BY day ASC
      `,
    );
    const byDay = new Map<string, { day: string; count: number; locales: LocaleCounts }>();
    for (const r of rows) {
      const day = r.day.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { day, count: 0, locales: {} };
      const n = Number(r.count);
      entry.count += n;
      entry.locales[localeKey(r.locale)] = (entry.locales[localeKey(r.locale)] ?? 0) + n;
      byDay.set(day, entry);
    }
    res.json({
      series: fillDays([...byDay.values()], days, new Date(), (day) => ({ day, count: 0, locales: {} })),
    });
  }),
);
