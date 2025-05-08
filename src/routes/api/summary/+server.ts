import { json, type RequestHandler } from '@sveltejs/kit';
import { processYoutubeUrl } from '$lib/processYoutubeUrl';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return json({ error: 'Missing or invalid url' }, { status: 400 });
    }
    const result = await processYoutubeUrl(url);
    return json(result);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
