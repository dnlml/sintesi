import { env } from '$env/dynamic/private';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { checkCredits, consumeCredit, refundCredit } from '$lib/server/credits';
import { loggers } from '$lib/server/logger';

export const load: ServerLoad = async (event) => {
  const creditInfo = await checkCredits(event);
  const authCookie = event.cookies.get('auth');
  const hasGodMode = authCookie === env.GOD_MODE_TOKEN;

  return {
    creditInfo,
    hasGodMode
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, cookies, fetch } = event;

    // Controllo crediti prima di procedere (eccetto per GOD_MODE)
    const creditInfo = await checkCredits(event);
    const authCookie = event.cookies.get('auth');
    const hasGodMode = authCookie === env.GOD_MODE_TOKEN;

    if (!creditInfo.hasCredits && !hasGodMode) {
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

    // Validazione URL YouTube prima di consumare crediti
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      return {
        error:
          'Please provide a valid YouTube URL (youtube.com or youtu.be). No credits were consumed.',
        creditInfo
      };
    }

    if (!language || typeof language !== 'string') {
      return { error: 'Missing or invalid language selection', creditInfo };
    }
    if (!summaryLength || typeof summaryLength !== 'string') {
      return { error: 'Missing or invalid summary length selection', creditInfo };
    }

    try {
      // Consuma un credito solo dopo aver validato tutti gli input (eccetto per GOD_MODE)
      if (!hasGodMode) {
        const creditConsumed = await consumeCredit(event);
        if (!creditConsumed) {
          return {
            error: 'Error consuming credit. Please try again.',
            creditInfo: await checkCredits(event)
          };
        }
      }

      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, language, summaryLength })
      });

      const result = await res.json();
      if (!res.ok) {
        // Restituisce il credito se l'elaborazione fallisce (solo se non in GOD_MODE)
        if (!hasGodMode) {
          await refundCredit(event);
          loggers.credits.info('Credit refunded due to processing failure');
        }

        // Messaggi di errore più user-friendly
        let errorMessage = result.error || 'Generic error';
        if (errorMessage.includes('Could not fetch transcript')) {
          errorMessage =
            'This video does not have available transcripts or subtitles. Please try with a different video.';
        } else if (errorMessage.includes('Could not generate summary')) {
          errorMessage = 'Our AI service is temporarily unavailable. Please try again later.';
        } else if (errorMessage.includes('ElevenLabs')) {
          errorMessage =
            'Audio generation service is temporarily unavailable. Please try again later.';
        }

        return {
          error: hasGodMode ? errorMessage : `${errorMessage} No credits were consumed.`,
          creditInfo: await checkCredits(event)
        };
      }

      return {
        summary: result.summary,
        audioPath: result.audioPath,
        creditInfo: await checkCredits(event)
      };
    } catch (e) {
      // Restituisce il credito se c'è un'eccezione durante l'elaborazione (solo se non in GOD_MODE)
      if (!hasGodMode) {
        await refundCredit(event);
        loggers.credits.info('Credit refunded due to exception during processing');
      }

      return {
        error: hasGodMode
          ? `An error occurred: ${e instanceof Error ? e.message : 'Unknown error'}`
          : `An error occurred: ${e instanceof Error ? e.message : 'Unknown error'}. No credits were consumed.`,
        creditInfo: await checkCredits(event)
      };
    }
  }
};
