import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const authValue = cookies.get('auth');
    if (authValue === '44440') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return {
        summary: 'Lorem ipsum dolor sit amet',
        audioPath: '/summaries_test/test.mp3'
      };
    }

    const formData = await request.formData();
    const url = formData.get('url');
    const language = formData.get('language') || 'it';
    const summaryLength = formData.get('summaryLength') || 'medium';

    if (!url || typeof url !== 'string') {
      return { error: 'Missing or invalid URL' };
    }
    if (!language || typeof language !== 'string') {
      return { error: 'Missing or invalid language selection' };
    }
    if (!summaryLength || typeof summaryLength !== 'string') {
      return { error: 'Missing or invalid summary length selection' };
    }

    try {
      const res = await fetch('http://localhost:5173/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, language, summaryLength })
      });
      const result = await res.json();
      if (!res.ok) {
        return { error: result.error || 'Generic error' };
      }
      return { summary: result.summary, audioPath: result.audioPath };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Generic error' };
    }
  }
};
