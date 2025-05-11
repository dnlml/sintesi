import { json, type RequestHandler } from '@sveltejs/kit';
import { processYoutubeUrl } from '$lib/processYoutubeUrl';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { url, language, summaryLength } = await request.json();
    if (!url || typeof url !== 'string') {
      return json({ error: 'Missing or invalid url' }, { status: 400 });
    }
    if (!language || typeof language !== 'string') {
      return json({ error: 'Missing or invalid language' }, { status: 400 });
    }
    if (!summaryLength || typeof summaryLength !== 'string') {
      return json({ error: 'Missing or invalid summary length' }, { status: 400 });
    }

    const result = await processYoutubeUrl(url, language, summaryLength);
    return json(result);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
