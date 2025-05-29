import type { ServerLoad } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { addCreditsToUser } from '$lib/server/credits';

// Lazy Stripe initialization - only fails when actually used, not during build
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil'
    });
  }
  return _stripe;
}

export const load: ServerLoad = async ({ url, cookies }) => {
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return {
      success: false,
      error: 'Session ID mancante'
    };
  }

  try {
    // Recupera la sessione da Stripe
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const { userId, credits } = session.metadata || {};

      if (userId && credits) {
        // Trova l'email dell'utente e aggiungi i crediti
        const creditsToAdd = parseInt(credits);
        const userEmail = session.customer_email;

        if (userEmail) {
          const success = await addCreditsToUser(userEmail, creditsToAdd);

          if (success) {
            // Imposta il cookie per l'utente registrato
            cookies.set('user_email', userEmail, {
              path: '/',
              maxAge: 60 * 60 * 24 * 365, // 1 anno
              httpOnly: true,
              secure: true,
              sameSite: 'strict'
            });

            return {
              success: true,
              credits: creditsToAdd,
              email: userEmail
            };
          }
        }
      }
    }

    return {
      success: false,
      error: "Pagamento non completato o errore nell'assegnazione dei crediti"
    };
  } catch (error) {
    console.error('Error processing payment success:', error);
    return {
      success: false,
      error: 'Errore nel processare il pagamento'
    };
  }
};
