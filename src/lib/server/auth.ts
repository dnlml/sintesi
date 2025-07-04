import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { sendEmail, createMagicLinkEmail } from './email';
import { logEvent, loggers } from './logger';

// Genera un token di login temporaneo
export function generateLoginToken(): string {
  return randomBytes(32).toString('hex');
}

// Crea un hash sicuro del token
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Invia magic link via email
export async function sendMagicLink(email: string, token: string): Promise<boolean> {
  try {
    loggers.auth.info({ email }, 'Attempting to send magic link');

    const magicLink = `${process.env.BASE_URL}/login?token=${token}`;

    // Crea template email
    const emailTemplate = createMagicLinkEmail(email, magicLink);

    // Invia email (o mock se RESEND_API_KEY non è configurata)
    const emailSent = await sendEmail(emailTemplate);

    if (!emailSent) {
      loggers.auth.error({ email }, 'Failed to send magic link email');
      return false;
    }

    // Salva il token hashato nel DB
    const hashedToken = hashToken(token);

    await db
      .update(users)
      .set({
        loginToken: hashedToken,
        loginTokenExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 minuti
      })
      .where(eq(users.email, email));

    logEvent.magicLinkSent(email, true);
    return true;
  } catch (error) {
    loggers.auth.error({ email, error }, 'Error sending magic link');
    logEvent.magicLinkSent(email, false);
    return false;
  }
}

// Verifica il token di login
export async function verifyLoginToken(token: string): Promise<string | null> {
  try {
    const hashedToken = hashToken(token);
    loggers.auth.debug(
      { hashedToken: hashedToken.substring(0, 8) + '...' },
      'Verifying login token'
    );

    const user = await db.select().from(users).where(eq(users.loginToken, hashedToken)).limit(1);

    if (user.length === 0) {
      loggers.auth.warn({ token: token.substring(0, 8) + '...' }, 'Login token not found');
      return null;
    }

    const userData = user[0];

    // Verifica scadenza
    if (!userData.loginTokenExpiry || userData.loginTokenExpiry < new Date()) {
      loggers.auth.warn({ email: userData.email }, 'Login token expired');
      logEvent.loginAttempt(userData.email, false, 'token_expired');
      return null;
    }

    // Invalida il token dopo l'uso
    await db
      .update(users)
      .set({
        loginToken: null,
        loginTokenExpiry: null
      })
      .where(eq(users.email, userData.email));

    logEvent.loginAttempt(userData.email, true);
    loggers.auth.info({ email: userData.email }, 'Successful login via magic link');
    return userData.email;
  } catch (error) {
    loggers.auth.error({ error }, 'Error verifying login token');
    return null;
  }
}

// Imposta la sessione utente
export function setUserSession(event: RequestEvent, email: string): void {
  event.cookies.set('user_email', email, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 anno
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
}

// Logout
export function logout(event: RequestEvent): void {
  event.cookies.delete('user_email', { path: '/' });
}
