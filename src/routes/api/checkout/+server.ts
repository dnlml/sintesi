import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { packageId, email } = await request.json();

    if (!packageId || !email) {
      return json({ error: 'Package ID and email are required' }, { status: 400 });
    }

    // Per ora usiamo pacchetti hardcoded, ma in futuro li prenderemo dal database
    const packageMap = {
      '1': { name: 'Starter', credits: 10, price: 500 }, // 5.00 EUR in centesimi
      '2': { name: 'Pro', credits: 25, price: 1000 }, // 10.00 EUR in centesimi
      '3': { name: 'Premium', credits: 50, price: 1800 } // 18.00 EUR in centesimi
    };

    const selectedPackage = packageMap[packageId as keyof typeof packageMap];
    if (!selectedPackage) {
      return json({ error: 'Invalid package ID' }, { status: 400 });
    }

    // Crea o trova l'utente
    let user;
    try {
      const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUsers.length > 0) {
        user = existingUsers[0];
      } else {
        const newUsers = await db.insert(users).values({ email }).returning();
        user = newUsers[0];
      }
    } catch (error) {
      console.error('Error creating/finding user:', error);
      return json({ error: 'Database error' }, { status: 500 });
    }

    // Crea la sessione di checkout Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Sintesi ${selectedPackage.name}`,
              description: `${selectedPackage.credits} riassunti video`
            },
            unit_amount: selectedPackage.price
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: email,
      metadata: {
        userId: user.id,
        packageId,
        credits: selectedPackage.credits.toString()
      },
      success_url: `${url.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/buy-credits`
    });

    return json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
};
