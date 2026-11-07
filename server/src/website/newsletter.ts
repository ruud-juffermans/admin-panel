import { prisma } from '../db.js';
import { config } from '../config.js';

export async function subscribeToNewsletter(email: string): Promise<void> {
  // Keep a local mirror of the subscriber list. Re-subscribing reactivates.
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email },
    update: { active: true, unsubscribedAt: null },
  });

  if (config.newsletterApiKey === 'placeholder') {
    console.log(`[newsletter] signup stored locally (no provider API key configured): ${email}`);
    return;
  }

  // Buttondown API integration
  const response = await fetch('https://api.buttondown.email/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.newsletterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_address: email }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[newsletter] signup failed for ${email}: ${response.status} ${body}`);
    throw new Error('Newsletter signup failed');
  }

  console.log(`[newsletter] subscriber added: ${email}`);
}
