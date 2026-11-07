import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from './config.js';
import { authRouter } from './auth/routes.js';
import { websiteRouter } from './website/index.js';

// One Express app: the portfolio's public backend, the admin login, the admin
// API, the twin proxy, and the built admin SPA. Exported without listening so
// tests can mount it.
export function createApp(): express.Express {
  const app = express();

  // Behind Traefik in production: trust it so req.ip (rate limits, auth logs)
  // is the visitor's address, not the proxy's.
  if (config.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Only the portfolio site calls cross-origin, and only the public routes.
  // The admin SPA is same-origin, so credentials never need CORS.
  app.use(
    '/api/website',
    cors({
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/api/website', websiteRouter);

  // The admin SPA. Private: never indexed, never cached by intermediaries.
  // Hashed assets may cache; index.html must not, or a deploy would be missed.
  if (existsSync(config.staticDir)) {
    app.use((_req, res, next) => {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      next();
    });
    app.use(
      express.static(config.staticDir, {
        index: false,
        setHeaders: (res, path) => {
          res.setHeader('Cache-Control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store');
        },
      }),
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) return next();
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(join(config.staticDir, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.flatten() });
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (err.code === 'P2002') {
        res.status(409).json({ error: 'Already exists' });
        return;
      }
    }
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  });

  return app;
}
