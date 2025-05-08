import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const url = formData.get('url');
    if (!url || typeof url !== 'string') {
      return { error: 'URL mancante o non valido' };
    }
    try {
      const res = await fetch('http://localhost:5173/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const result = await res.json();
      if (!res.ok) {
        return { error: result.error || 'Errore generico' };
      }
      return { summary: result.summary, audioPath: result.audioPath };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Errore generico' };
    }
  }
};
