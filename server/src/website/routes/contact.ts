import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../http.js';
import { sendContactEmail } from '../email.js';

// Public contact form (user-facing copy is Dutch, matching the site).
export const contactRouter = Router();

const contactBody = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  email: z.string().email('Ongeldig e-mailadres'),
  company: z.string().optional(),
  message: z.string().min(10, 'Bericht moet minimaal 10 tekens bevatten'),
});

contactRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = contactBody.parse(req.body);
    // Persist first so the submission survives even if the email send fails.
    await prisma.contactSubmission.create({ data: body });
    await sendContactEmail(body);
    res.json({
      success: true,
      message: 'Bericht succesvol verzonden. Ik neem zo snel mogelijk contact op.',
    });
  }),
);
