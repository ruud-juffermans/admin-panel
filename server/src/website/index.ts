import { Router } from 'express';
import { config } from '../config.js';
import { rateLimit } from '../rateLimit.js';
import { requireAdmin } from '../auth/requireAdmin.js';
import { contactRouter } from './routes/contact.js';
import { newsletterRouter } from './routes/newsletter.js';
import { analyticsRouter } from './routes/analytics.js';
import { adminRouter } from './routes/admin.js';
import { fundsRouter } from './routes/funds.js';
import { createTwinProxy } from './twinProxy.js';
import { createRevaultProxy } from './revaultProxy.js';

// The website module, mounted at /api/website. Same paths as the platform
// server used to serve, so the portfolio's src/lib/api.ts only changes origin.
export const websiteRouter = Router();

const formRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many submissions. Please try again later.' });
const analyticsRateLimit = rateLimit({ windowMs: 60 * 1000, max: 60, message: 'Too many requests.' });

// Public: called by the portfolio site (CORS-allowed, rate limited).
websiteRouter.use('/contact', formRateLimit, contactRouter);
websiteRouter.use('/newsletter', formRateLimit, newsletterRouter);
websiteRouter.use('/analytics', analyticsRateLimit, analyticsRouter);

// Admin: cookie session only.
// Thresholds the client needs to decide what "needs attention" (set in .env).
websiteRouter.get('/admin/settings', requireAdmin, (_req, res) => {
  res.json({
    funds_alert_usd: config.fundsAlertUsd,
    twin_alerts: {
      ttft_p95_ms: config.twinAlerts.ttftP95Ms,
      error_rate: config.twinAlerts.errorRate,
      truncation_rate: config.twinAlerts.truncationRate,
    },
  });
});
websiteRouter.use('/admin/funds', requireAdmin, fundsRouter);
websiteRouter.use(
  '/admin/twin',
  requireAdmin,
  createTwinProxy({ baseUrl: config.twinApiUrl, token: config.twinAdminToken, timeoutMs: 10_000 }),
);
// Revault (revault.nl): intakes, newsletter signups and traffic, proxied to
// that site's own server with its service token.
websiteRouter.use(
  '/admin/revault',
  requireAdmin,
  createRevaultProxy({ baseUrl: config.revaultApiUrl, token: config.revaultAdminToken, timeoutMs: 10_000 }),
);
websiteRouter.use('/admin', requireAdmin, adminRouter);
