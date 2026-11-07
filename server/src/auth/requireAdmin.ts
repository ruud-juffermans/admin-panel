import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { verifySessionToken } from './session.js';

// Every admin route sits behind this: a valid, unexpired session cookie or a
// 401. Fails closed when the secret is unset (nothing verifies).
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = verifySessionToken(req.cookies?.[config.cookieName], config.sessionSecret);
  if (!session || session.u !== config.adminUser) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  // Admin responses are personal data; never let a proxy or browser cache them.
  res.setHeader('Cache-Control', 'no-store');
  next();
}
