import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../http.js';

export const analyticsRouter = Router();

const pageViewBody = z.object({
  path: z.string().min(1).max(512),
  locale: z.string().max(16).optional(),
  referrer: z.string().max(1024).optional(),
});

// Record a page view. Fire-and-forget from the client.
analyticsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = pageViewBody.parse(req.body);
    await prisma.pageView.create({ data: body });
    res.status(204).end();
  }),
);

// Aggregate view count for a given path (handy for "X views" badges later).
analyticsRouter.get(
  '/views',
  asyncRoute(async (req, res) => {
    const path = typeof req.query.path === 'string' ? req.query.path : undefined;
    const count = await prisma.pageView.count({
      where: path ? { path } : undefined,
    });
    res.json({ path: path ?? null, count });
  }),
);
