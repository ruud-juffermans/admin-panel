import nodemailer, { type Transporter } from 'nodemailer';

// Build a transport from SMTP_* env vars. When none are configured (typical in
// local dev) we fall back to logging the message — including the action link —
// to the server console so the flow can be exercised end to end without a real
// mail server.

let cachedTransport: Transporter | null = null;
let transportIsReal = false;

function getTransport(): Transporter | null {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transportIsReal = false;
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  transportIsReal = true;
  return cachedTransport;
}

const from = process.env.MAIL_FROM ?? 'ruudjuffermans <no-reply@ruudjuffermans.nl>';

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
  opts?: { replyTo?: string },
): Promise<void> {
  const transport = getTransport();
  if (!transport || !transportIsReal) {
    // Dev fallback: surface the message (and its link) on the console.
    console.log('\n──────── ✉️  email (dev console fallback) ────────');
    console.log(`to:      ${to}`);
    console.log(`subject: ${subject}`);
    console.log(text);
    console.log('─────────────────────────────────────────────────\n');
    return;
  }
  await transport.sendMail({ from, to, subject, html, text, replyTo: opts?.replyTo });
}

// Shared transactional-email shell, styled with the platform palette (navy
// surface, red accent — see the account SPA's design tokens).
export function mailLayout(title: string, body: string, button: { label: string; url: string }): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0A0F1C;padding:32px;color:#F4F7FB">
  <div style="max-width:480px;margin:0 auto;background:#111726;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
    <p style="line-height:1.6;color:#B9C4D6">${body}</p>
    <p style="margin:28px 0">
      <a href="${button.url}" style="display:inline-block;background:#dd2e5a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${button.label}</a>
    </p>
    <p style="font-size:13px;color:#94A3B8;line-height:1.6">If the button doesn't work, copy this link:<br>
      <a href="${button.url}" style="color:#ef4d76;word-break:break-all">${button.url}</a></p>
  </div></body></html>`;
}
