import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(), // uses gen_random_uuid()
  email: text('email').notNull().unique()
});
