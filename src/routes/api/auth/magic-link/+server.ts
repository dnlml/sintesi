import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateLoginToken, sendMagicLink } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { loggers } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    loggers.auth.info({ email }, 'Magic link request received');

    if (!email || !email.includes('@')) {
      loggers.auth.warn({ email }, 'Invalid email provided for magic link');
      return json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Verifica se l'utente esiste
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user.length === 0) {
      // L'utente non esiste - suggerisci di comprare crediti
      loggers.auth.info({ email }, 'Email not found in database, suggesting purchase');
      return json(
        {
          error: 'Email not found. Purchase credits to create an account.',
          needsPurchase: true
        },
        { status: 404 }
      );
    }

    // Genera e invia magic link solo se l'utente esiste
    const token = generateLoginToken();
    const success = await sendMagicLink(email, token);

    if (success) {
      loggers.auth.info({ email }, 'Magic link sent successfully');
      return json({ message: 'Magic link sent successfully' });
    } else {
      loggers.auth.error({ email }, 'Failed to send magic link');
      return json({ error: 'Failed to send magic link' }, { status: 500 });
    }
  } catch (error) {
    loggers.auth.error({ error }, 'Error in magic-link endpoint');
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
