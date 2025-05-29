import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { env } from '$env/dynamic/private';
import { logEvent, loggers } from '$lib/server/logger';

// Define paths that do not require authentication
const PUBLIC_PATHS = [
  '/waitinglist',
  '/.well-known',
  '/', // Homepage ora accessibile per utenti anonimi (freemium)
  '/login',
  '/buy-credits',
  '/success',
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/api/checkout',
  '/api/stripe/webhook'
];

// Wrapper for paraglideMiddleware to make it a standard Handle function
const handleParaglide: Handle = ({ event, resolve }) => {
  // The paraglideMiddleware expects a Request object and a specific resolve callback.
  // We adapt the standard SvelteKit event and resolve to fit its signature.
  return paraglideMiddleware(event.request, ({ request: newRequest, locale }) => {
    // paraglideMiddleware might modify the request (e.g., adding locale-specific headers or context)
    // We need to update event.request if it's changed.
    event.request = newRequest;

    // Now, call the standard SvelteKit resolve function, transforming the page chunk as paraglide expects.
    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
    });
  });
};

// Authentication Handle
const handleAuth: Handle = async ({ event, resolve }) => {
  const authCookie = event.cookies.get('auth');
  const { pathname } = event.url;
  const isPublicPath = PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath));

  const validTokens = [env.TEST_MODE_TOKEN, env.GOD_MODE_TOKEN];

  // Se il path è pubblico, permetti l'accesso
  if (isPublicPath) {
    return resolve(event);
  }

  // Per tutti gli altri path, richiedi autenticazione
  if (!authCookie || !validTokens.includes(authCookie)) {
    throw redirect(303, '/waitinglist');
  }

  return resolve(event);
};

// Logging Handle
const handleLogging: Handle = async ({ event, resolve }) => {
  const startTime = Date.now();
  const { method, url } = event.request;
  const userEmail = event.cookies.get('user_email');

  // Log incoming request
  loggers.api.debug(
    {
      method,
      path: url,
      userAgent: event.request.headers.get('user-agent'),
      userEmail
    },
    'Incoming request'
  );

  const response = await resolve(event);

  const duration = Date.now() - startTime;

  // Log API requests (not static assets)
  if (url.includes('/api/') || method !== 'GET') {
    logEvent.apiRequest(
      method,
      new URL(url).pathname,
      response.status,
      duration,
      userEmail || undefined
    );
  }

  return response;
};

const handleSecurity: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
};
export const handle = sequence(handleSecurity, handleParaglide, handleAuth, handleLogging);
