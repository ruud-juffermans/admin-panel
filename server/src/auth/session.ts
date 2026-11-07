import { createHmac, timingSafeEqual } from 'node:crypto';

// Stateless signed session: `<base64url payload>.<base64url hmac>` where the
// payload is {u: user, exp: epoch ms}. No session table — there is exactly one
// account, and rotating SESSION_SECRET is the "sign out everywhere" button.

export interface SessionPayload {
  u: string;
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(data: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(data).digest());
}

export function createSessionToken(user: string, ttlMs: number, secret: string, now = Date.now()): string {
  const payload = b64url(Buffer.from(JSON.stringify({ u: user, exp: now + ttlMs } satisfies SessionPayload)));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (typeof parsed.u !== 'string' || typeof parsed.exp !== 'number') return null;
    if (parsed.exp <= now) return null;
    return { u: parsed.u, exp: parsed.exp };
  } catch {
    return null;
  }
}
