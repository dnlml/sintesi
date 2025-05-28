import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyLoginToken, setUserSession } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  try {
    const { token } = await event.request.json();

    if (!token) {
      return json({ error: 'Token is required' }, { status: 400 });
    }

    const email = await verifyLoginToken(token);

    if (email) {
      // Imposta la sessione utente
      setUserSession(event, email);
      return json({ message: 'Login successful', email });
    } else {
      return json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error in verify endpoint:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
