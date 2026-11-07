import { config } from '../config.js';
import { sendMail } from '../mailer.js';

interface ContactEmail {
  name: string;
  email: string;
  company?: string;
  message: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Forward a contact-form submission to the site owner. Reply-To is set to the
// visitor so answering the notification mails them directly.
export async function sendContactEmail(data: ContactEmail): Promise<void> {
  const subject = `Nieuw contactbericht van ${data.name}${data.company ? ` (${data.company})` : ''}`;
  const text = [
    `Naam: ${data.name}`,
    `E-mail: ${data.email}`,
    data.company ? `Bedrijf: ${data.company}` : null,
    `\nBericht:\n${data.message}`,
  ]
    .filter(Boolean)
    .join('\n');

  await sendMail(
    config.contactEmail,
    subject,
    `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    text,
    { replyTo: data.email },
  );
}
