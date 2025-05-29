import { env } from '$env/dynamic/private';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { checkCredits, consumeCredit } from '$lib/server/credits';

export const load: ServerLoad = async (event) => {
  const creditInfo = await checkCredits(event);
  return {
    creditInfo
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, cookies, fetch } = event;

    // Controllo crediti prima di procedere
    const creditInfo = await checkCredits(event);

    if (!creditInfo.hasCredits) {
      return {
        error: creditInfo.isRegistered
          ? 'No credits remaining. Purchase a package to continue.'
          : 'You have used all 3 free trials. Sign up and purchase a package to continue.',
        needsPayment: true,
        creditInfo
      };
    }

    const authValue = cookies.get('auth');
    if (authValue === env.TEST_MODE_TOKEN) {
      // In test mode, consumiamo comunque i crediti per testare il sistema
      const creditConsumed = await consumeCredit(event);
      if (!creditConsumed) {
        return {
          error: 'Errore nel consumo del credito. Riprova.',
          creditInfo: await checkCredits(event)
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        summary: 'Lorem ipsum dolor sit amet',
        audioPath: '/summaries_test/test.mp3',
        creditInfo: await checkCredits(event)
      };
    }

    const formData = await request.formData();
    const url = formData.get('url');
    const language = formData.get('language') || 'it';
    const summaryLength = formData.get('summaryLength') || 'medium';

    if (!url || typeof url !== 'string') {
      return { error: 'Missing or invalid URL', creditInfo };
    }
    if (!language || typeof language !== 'string') {
      return { error: 'Missing or invalid language selection', creditInfo };
    }
    if (!summaryLength || typeof summaryLength !== 'string') {
      return { error: 'Missing or invalid summary length selection', creditInfo };
    }

    try {
      // Consuma un credito prima di procedere
      const creditConsumed = await consumeCredit(event);
      if (!creditConsumed) {
        return {
          error: 'Error consuming credit. Please try again.',
          creditInfo: await checkCredits(event)
        };
      }

      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, language, summaryLength })
      });

      const result = await res.json();
      if (!res.ok) {
        // Se l'API fallisce, restituiamo il credito (opzionale)
        // Per ora non implementiamo il rollback, ma è una feature da considerare
        return {
          error: result.error || 'Generic error',
          creditInfo: await checkCredits(event)
        };
      }

      return {
        summary: result.summary,
        audioPath: result.audioPath,
        creditInfo: await checkCredits(event)
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Generic error',
        creditInfo: await checkCredits(event)
      };
    }
  }
};
