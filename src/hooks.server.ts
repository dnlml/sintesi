import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';

// Define paths that do not require authentication
const PUBLIC_PATHS = ['/waitinglist'];

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

  if (!isPublicPath && authCookie !== '11155' && authCookie !== '44440') {
    throw redirect(303, '/waitinglist');
  }
  return resolve(event);
};

export const handle = sequence(handleParaglide, handleAuth);
