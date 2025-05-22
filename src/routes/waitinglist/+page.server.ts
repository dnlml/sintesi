import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const actions: Actions = {
  default: async ({ request }) => {
    try {
      const formData = await request.formData();
      const email = formData.get('email');

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return {
          success: false,
          message: 'Please enter a valid email address.'
        };
      }

      try {
        await db.insert(users).values({ email });
        return {
          success: true,
          message: 'Thank you for registering! We will notify you soon.',
          email
        };
      } catch (err: unknown) {
        // Unique violation error code for Postgres is '23505'
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: string }).code === '23505'
        ) {
          return {
            success: true,
            message: 'This email was already registered.',
            email
          };
        }
        throw err;
      }
    } catch (err) {
      console.error('Error processing form data:', err);
      return {
        success: false,
        message: 'Internal server error. Please try again later.'
      };
    }
  }
};
