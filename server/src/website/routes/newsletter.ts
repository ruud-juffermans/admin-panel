import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../http.js';
import { subscribeToNewsletter } from '../newsletter.js';

export const newsletterRouter = Router();

newsletterRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const { email } = z.object({ email: z.string().email('Ongeldig e-mailadres') }).parse(req.body);
    await subscribeToNewsletter(email);
    res.json({
      success: true,
      message: 'Je bent ingeschreven voor de nieuwsbrief!',
    });
  }),
);
