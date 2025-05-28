import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { addCreditsToUser } from '$lib/server/credits';
import { db } from '$lib/server/db';
import { purchases } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, createPurchaseConfirmationEmail } from '$lib/server/email';
import { logEvent, loggers } from '$lib/server/logger';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  loggers.payments.info('Received Stripe webhook');

  if (!signature) {
    loggers.payments.error('Missing stripe-signature header');
    return json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verifica la firma del webhook
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET!);
    loggers.payments.info(
      { eventType: event.type, eventId: event.id },
      'Webhook signature verified'
    );
  } catch (err) {
    loggers.payments.error({ error: err }, 'Webhook signature verification failed');
    return json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Gestisci eventi Stripe
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === 'paid') {
        const { userId, credits, packageId } = session.metadata || {};

        loggers.payments.info(
          {
            sessionId: session.id,
            customerEmail: session.customer_email,
            amount: session.amount_total,
            credits,
            packageId
          },
          'Processing successful payment'
        );

        if (credits && packageId && session.customer_email) {
          try {
            // Registra l'acquisto nel DB
            await db.insert(purchases).values({
              userId: userId || null, // può essere null per acquisti anonimi
              packageId,
              stripePaymentIntentId: (session.payment_intent as string) || null,
              amount: ((session.amount_total || 0) / 100).toString(), // Converti da centesimi a stringa
              status: 'completed'
            });

            // Assegna i crediti
            const success = await addCreditsToUser(session.customer_email, parseInt(credits));

            if (success) {
              logEvent.creditsPurchased(
                session.customer_email,
                parseInt(credits),
                ((session.amount_total || 0) / 100).toFixed(2),
                packageId
              );
              loggers.payments.info(
                {
                  email: session.customer_email,
                  credits: parseInt(credits)
                },
                'Credits assigned successfully'
              );

              // Invia email di conferma acquisto
              const confirmationEmail = createPurchaseConfirmationEmail(
                session.customer_email,
                parseInt(credits),
                ((session.amount_total || 0) / 100).toFixed(2)
              );
              await sendEmail(confirmationEmail);
            } else {
              loggers.payments.error(
                {
                  email: session.customer_email
                },
                'Failed to assign credits'
              );
              // TODO: Implementare retry logic o notifica admin
            }
          } catch (error) {
            loggers.payments.error(
              {
                error,
                sessionId: session.id
              },
              'Error processing payment'
            );
            // TODO: Implementare sistema di retry
          }
        } else {
          loggers.payments.warn(
            {
              sessionId: session.id
            },
            'Missing required metadata in payment session'
          );
        }
      } else {
        loggers.payments.warn(
          {
            sessionId: session.id,
            paymentStatus: session.payment_status
          },
          'Payment not completed'
        );
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment failed: ${paymentIntent.id}`);

      // Aggiorna lo stato nel DB
      await db
        .update(purchases)
        .set({ status: 'failed' })
        .where(eq(purchases.stripePaymentIntentId, paymentIntent.id));
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return json({ received: true });
};
