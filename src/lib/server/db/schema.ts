import { pgTable, text, uuid, integer, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(), // uses gen_random_uuid()
  email: text('email').notNull().unique(),
  loginToken: text('login_token'), // Token per magic link
  loginTokenExpiry: timestamp('login_token_expiry'), // Scadenza token
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Tabella per sessioni anonime (utenti non registrati)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: text('session_id').notNull().unique(), // cookie/localStorage ID
  browserFingerprint: text('browser_fingerprint'), // fingerprint del browser per prevenire abusi
  creditsUsed: integer('credits_used').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow()
});

// Tabella per crediti utenti registrati
export const userCredits = pgTable('user_credits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  credits: integer('credits').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Tabella per pacchetti disponibili
export const packages = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  credits: integer('credits').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // in euros
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Tabella per acquisti
export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id), // null per acquisti anonimi
  sessionId: text('session_id'), // per acquisti anonimi
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').notNull().defaultNow()
});
