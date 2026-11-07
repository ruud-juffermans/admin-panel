import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { asyncRoute } from '../http.js';
import { rateLimit } from '../rateLimit.js';
import { createSessionToken, verifySessionToken } from './session.js';

// Login for the one admin account configured in .env. Success sets an httpOnly
// cookie scoped to this origin; the SPA only ever sees {user}.
export const authRouter = Router();

// Brute-force guard: 5 attempts per 15 minutes per IP, counted on every
// attempt (right or wrong) so a correct guess on the sixth try still waits.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many sign-in attempts. Try again in 15 minutes.',
});

// A dummy hash compared against on an unknown username, so the response time
// does not reveal whether the username exists.
const DUMMY_HASH = bcrypt.hashSync('not-the-password', 12);

const credentials = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(1000),
});

authRouter.post(
  '/login',
  loginRateLimit,
  asyncRoute(async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    const { username, password } = parsed.data;
    const userMatches = username === config.adminUser;
    const passwordMatches = await bcrypt.compare(password, userMatches ? config.adminPasswordHash : DUMMY_HASH);
    if (!userMatches || !passwordMatches) {
      console.warn(`[auth] failed sign-in for "${username.slice(0, 40)}" from ${req.ip}`);
      res.status(401).json({ error: 'Wrong username or password.' });
      return;
    }
    const token = createSessionToken(config.adminUser, config.sessionTtlMs, config.sessionSecret);
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'strict',
      maxAge: config.sessionTtlMs,
      path: '/',
    });
    console.log(`[auth] ${config.adminUser} signed in from ${req.ip}`);
    res.json({ user: { name: config.adminUser } });
  }),
);

authRouter.get('/me', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const session = verifySessionToken(req.cookies?.[config.cookieName], config.sessionSecret);
  if (!session || session.u !== config.adminUser) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  res.json({ user: { name: session.u }, expiresAt: new Date(session.exp).toISOString() });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(config.cookieName, { path: '/' });
  res.json({ ok: true });
});
