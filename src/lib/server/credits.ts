import { db } from './db';
import { sessions, userCredits, users } from './db/schema';
import { eq, or } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { createHash } from 'crypto';
import { logEvent, loggers } from './logger';

const FREE_TRIAL_CREDITS = 3;

export interface CreditCheck {
  hasCredits: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  isRegistered: boolean;
  needsPayment: boolean;
}

// Genera un session ID unico
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// Crea un fingerprint del browser basato su headers
function createBrowserFingerprint(event: RequestEvent): string {
  const userAgent = event.request.headers.get('user-agent') || '';
  const acceptLanguage = event.request.headers.get('accept-language') || '';
  const acceptEncoding = event.request.headers.get('accept-encoding') || '';
  const clientIP = event.getClientAddress();

  // Combina informazioni del browser per creare un fingerprint
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${clientIP}`;

  // Hash per privacy e consistenza
  return createHash('sha256').update(fingerprint).digest('hex');
}

// Ottiene o crea una sessione anonima con controllo fingerprint
export async function getOrCreateSession(
  sessionId: string,
  browserFingerprint: string
): Promise<{ id: string; creditsUsed: number }> {
  // Cerca sessione esistente per sessionId O fingerprint
  const existingSession = await db
    .select()
    .from(sessions)
    .where(
      or(eq(sessions.sessionId, sessionId), eq(sessions.browserFingerprint, browserFingerprint))
    )
    .limit(1);

  if (existingSession.length > 0) {
    // Aggiorna lastUsedAt e sessionId se necessario
    await db
      .update(sessions)
      .set({
        lastUsedAt: new Date(),
        sessionId: sessionId // Aggiorna con il nuovo sessionId se è cambiato
      })
      .where(eq(sessions.id, existingSession[0].id));

    return {
      id: existingSession[0].id,
      creditsUsed: existingSession[0].creditsUsed
    };
  }

  // Crea nuova sessione
  const newSession = await db
    .insert(sessions)
    .values({
      sessionId,
      creditsUsed: 0,
      browserFingerprint
    })
    .returning();

  return {
    id: newSession[0].id,
    creditsUsed: newSession[0].creditsUsed
  };
}

// Controlla i crediti per un utente (registrato o anonimo)
export async function checkCredits(event: RequestEvent): Promise<CreditCheck> {
  const userEmail = event.cookies.get('user_email');

  if (userEmail) {
    // Utente registrato
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);

    if (user.length > 0) {
      const credits = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, user[0].id))
        .limit(1);

      const availableCredits = credits.length > 0 ? credits[0].credits : 0;

      return {
        hasCredits: availableCredits > 0,
        creditsUsed: 0, // Non tracciamo "used" per utenti registrati, solo il totale disponibile
        creditsRemaining: availableCredits,
        isRegistered: true,
        needsPayment: availableCredits === 0
      };
    }
  }

  // Utente anonimo
  let sessionId = event.cookies.get('session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    event.cookies.set('session_id', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
  }

  const browserFingerprint = createBrowserFingerprint(event);
  const session = await getOrCreateSession(sessionId, browserFingerprint);
  const creditsRemaining = Math.max(0, FREE_TRIAL_CREDITS - session.creditsUsed);

  return {
    hasCredits: creditsRemaining > 0,
    creditsUsed: session.creditsUsed,
    creditsRemaining,
    isRegistered: false,
    needsPayment: creditsRemaining === 0
  };
}

// Consuma un credito
export async function consumeCredit(event: RequestEvent): Promise<boolean> {
  const userEmail = event.cookies.get('user_email');

  if (userEmail) {
    // Utente registrato
    loggers.credits.debug({ email: userEmail }, 'Attempting to consume credit for registered user');

    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);

    if (user.length > 0) {
      const credits = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, user[0].id))
        .limit(1);

      if (credits.length > 0 && credits[0].credits > 0) {
        await db
          .update(userCredits)
          .set({
            credits: credits[0].credits - 1,
            updatedAt: new Date()
          })
          .where(eq(userCredits.userId, user[0].id));

        logEvent.creditConsumption(user[0].id, null, credits[0].credits - 1);
        loggers.credits.info(
          {
            email: userEmail,
            creditsRemaining: credits[0].credits - 1
          },
          'Credit consumed by registered user'
        );
        return true;
      } else {
        loggers.credits.warn({ email: userEmail }, 'No credits available for registered user');
      }
    }
    return false;
  }

  // Utente anonimo
  const sessionId = event.cookies.get('session_id');
  if (!sessionId) {
    loggers.credits.warn('No session ID found for anonymous user');
    return false;
  }

  loggers.credits.debug({ sessionId }, 'Attempting to consume credit for anonymous user');

  const browserFingerprint = createBrowserFingerprint(event);
  const session = await getOrCreateSession(sessionId, browserFingerprint);

  if (session.creditsUsed < FREE_TRIAL_CREDITS) {
    await db
      .update(sessions)
      .set({
        creditsUsed: session.creditsUsed + 1,
        lastUsedAt: new Date()
      })
      .where(eq(sessions.sessionId, sessionId));

    logEvent.creditConsumption(null, sessionId, FREE_TRIAL_CREDITS - (session.creditsUsed + 1));
    loggers.credits.info(
      {
        sessionId,
        creditsUsed: session.creditsUsed + 1,
        creditsRemaining: FREE_TRIAL_CREDITS - (session.creditsUsed + 1)
      },
      'Credit consumed by anonymous user'
    );
    return true;
  }

  loggers.credits.warn(
    { sessionId, creditsUsed: session.creditsUsed },
    'No free trials remaining for anonymous user'
  );
  return false;
}

// Restituisce un credito (rollback)
export async function refundCredit(event: RequestEvent): Promise<boolean> {
  const userEmail = event.cookies.get('user_email');

  if (userEmail) {
    // Utente registrato
    loggers.credits.debug({ email: userEmail }, 'Attempting to refund credit for registered user');

    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);

    if (user.length > 0) {
      const credits = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, user[0].id))
        .limit(1);

      if (credits.length > 0) {
        await db
          .update(userCredits)
          .set({
            credits: credits[0].credits + 1,
            updatedAt: new Date()
          })
          .where(eq(userCredits.userId, user[0].id));

        loggers.credits.info(
          {
            email: userEmail,
            creditsRemaining: credits[0].credits + 1
          },
          'Credit refunded for registered user'
        );
        return true;
      }
    }
    return false;
  }

  // Utente anonimo
  const sessionId = event.cookies.get('session_id');
  if (!sessionId) {
    loggers.credits.warn('No session ID found for anonymous user refund');
    return false;
  }

  loggers.credits.debug({ sessionId }, 'Attempting to refund credit for anonymous user');

  const browserFingerprint = createBrowserFingerprint(event);
  const session = await getOrCreateSession(sessionId, browserFingerprint);

  if (session.creditsUsed > 0) {
    await db
      .update(sessions)
      .set({
        creditsUsed: session.creditsUsed - 1,
        lastUsedAt: new Date()
      })
      .where(eq(sessions.sessionId, sessionId));

    loggers.credits.info(
      {
        sessionId,
        creditsUsed: session.creditsUsed - 1,
        creditsRemaining: FREE_TRIAL_CREDITS - (session.creditsUsed - 1)
      },
      'Credit refunded for anonymous user'
    );
    return true;
  }

  loggers.credits.warn(
    { sessionId, creditsUsed: session.creditsUsed },
    'No credits to refund for anonymous user'
  );
  return false;
}

// Aggiunge crediti a un utente registrato
export async function addCreditsToUser(email: string, creditsToAdd: number): Promise<boolean> {
  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user.length === 0) return false;

    const existingCredits = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, user[0].id))
      .limit(1);

    if (existingCredits.length > 0) {
      // Aggiorna crediti esistenti
      await db
        .update(userCredits)
        .set({
          credits: existingCredits[0].credits + creditsToAdd,
          updatedAt: new Date()
        })
        .where(eq(userCredits.userId, user[0].id));
    } else {
      // Crea nuovo record crediti
      await db.insert(userCredits).values({
        userId: user[0].id,
        credits: creditsToAdd
      });
    }

    return true;
  } catch (error) {
    console.error('Error adding credits to user:', error);
    return false;
  }
}
