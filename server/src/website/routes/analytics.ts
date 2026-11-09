import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../http.js';
import { DEFAULT_SITE, SITE_IDS, isSiteId, siteFromOrigin } from '../sites.js';

export const analyticsRouter = Router();

const pageViewBody = z.object({
  path: z.string().min(1).max(512),
  locale: z.string().max(16).optional(),
  referrer: z.string().max(1024).optional(),
  // Which site the view belongs to. Only trusted when the request carries no
  // Origin (same-origin or server-side); a browser's Origin header wins.
  site: z.enum(SITE_IDS).optional(),
});

// Record a page view. Fire-and-forget from the client.
analyticsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const { site: claimed, ...body } = pageViewBody.parse(req.body);
    const site = siteFromOrigin(req.get('origin')) ?? (isSiteId(claimed) ? claimed : DEFAULT_SITE);
    await prisma.pageView.create({ data: { ...body, site } });
    res.status(204).end();
  }),
);

// Aggregate view count for a given path (handy for "X views" badges later).
analyticsRouter.get(
  '/views',
  asyncRoute(async (req, res) => {
    const path = typeof req.query.path === 'string' ? req.query.path : undefined;
    const site = isSiteId(req.query.site) ? req.query.site : undefined;
    const count = await prisma.pageView.count({
      where: { ...(path ? { path } : {}), ...(site ? { site } : {}) },
    });
    res.json({ site: site ?? null, path: path ?? null, count });
  }),
);
