<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import { goto } from '$app/navigation';
  import SummarizerForm from '$lib/components/summarizer/SummarizerForm.svelte';
  import AudioPlayer from '$lib/components/summarizer/AudioPlayer.svelte';
  import SummaryDisplay from '$lib/components/summarizer/SummaryDisplay.svelte';
  import Title from '$lib/components/TItle.svelte';
  import type { CreditCheck } from '$lib/server/credits';

  let {
    form,
    data
  }: {
    form?: {
      summary?: string;
      audioPath?: string;
      error?: string;
      needsPayment?: boolean;
      creditInfo?: CreditCheck;
    };
    data: {
      creditInfo: CreditCheck;
    };
  } = $props();

  let url = $state('');
  let selectedLanguage = $state('en');
  let selectedSummaryLength = $state('medium');
  let loading = $state(false);
  let userEmail = $state('');

  // Usa i crediti dal form se disponibili, altrimenti da data
  const creditInfo = $derived(form?.creditInfo || data.creditInfo);

  $effect(() => {
    if (form?.summary || form?.error) {
      loading = false;
    }
  });

  async function handleCreateNew() {
    const confirmation = window.confirm(
      'The current summary and audio file will be deleted. Make sure you have downloaded the audio if needed. Proceed to create a new summary and lose the current one?'
    );
    if (confirmation) {
      if (form?.audioPath) {
        const pathForBody = form.audioPath.startsWith('/')
          ? form.audioPath.substring(1)
          : form.audioPath;

        try {
          const response = await fetch('/api/summary/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filepath: pathForBody })
          });
          const result = await response.json();
          if (!response.ok) {
            console.error('Failed to delete audio file:', result.error);
            // Potresti voler mostrare un errore all'utente qui, ma per ora continuiamo con il reset
          } else {
            console.log('Audio file deletion process:', result.message);
          }
        } catch (error) {
          console.error('Error calling delete API:', error);
          // Gestisci l'errore di rete o altro
        }
      }
      goto('/', { invalidateAll: true });
    }
  }

  function handleBuyCredits() {
    const emailParam = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
    goto(`/buy-credits${emailParam}`);
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <Title />

    <span class="mb-6 block text-center text-sm text-slate-400">
      Transform YouTube Videos into Key Insights: Audio & Text Summaries in a Flash!
    </span>

    <!-- Credit Display -->
    {#if !form?.needsPayment && (creditInfo.hasCredits || form?.summary)}
      <div class="mb-6 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
        <h3 class="text-sm font-medium text-slate-300">
          {creditInfo.isRegistered ? 'Available Credits' : 'Free Video Summaries'}
        </h3>
        <p class="text-lg font-bold text-white">
          {#if creditInfo.isRegistered}
            {creditInfo.creditsRemaining}
          {:else if creditInfo.creditsRemaining > 0}
            {creditInfo.creditsRemaining} of 3 remaining
          {:else}
            All free trials used
          {/if}
        </p>

        {#if creditInfo.needsPayment}
          <button
            onclick={handleBuyCredits}
            class="mt-3 cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Buy Credits
          </button>
        {/if}

        {#if !creditInfo.isRegistered}
          <p class="mt-2 text-xs text-slate-400">
            or <a href="/login" class="text-sky-400 underline hover:text-sky-300"
              >Use your credits</a
            >
          </p>
        {/if}

        {#if !creditInfo.isRegistered && creditInfo.creditsRemaining <= 1 && creditInfo.creditsRemaining > 0}
          <div class="mt-3 rounded-md border border-amber-500/30 bg-amber-500/20 p-3">
            <p class="text-sm text-amber-200">
              Only 1 free trial remaining. Consider purchasing credits to continue!
            </p>
          </div>
        {/if}
      </div>
    {/if}

    {#if !form?.audioPath && creditInfo.hasCredits}
      <SummarizerForm bind:loading bind:url bind:selectedLanguage bind:selectedSummaryLength />
    {/if}

    {#if form?.needsPayment || (!creditInfo.hasCredits && !form?.summary)}
      <div class="text-center">
        <div class="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <h3 class="mb-2 text-lg font-semibold text-amber-200">
            {creditInfo.isRegistered ? 'No Credits Remaining' : 'Free Trials Complete'}
          </h3>
          <p class="mb-4 text-sm text-amber-100">
            {creditInfo.isRegistered
              ? 'Purchase more credits to continue creating video summaries.'
              : 'You have used all 3 free trials. Purchase credits to continue creating summaries.'}
          </p>

          {#if !creditInfo.isRegistered}
            <div class="mb-4">
              <input
                type="email"
                bind:value={userEmail}
                placeholder="your@email.com"
                class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          {/if}

          <button
            onclick={handleBuyCredits}
            class="cursor-pointer rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            {creditInfo.isRegistered ? 'Buy More Credits' : 'Purchase Credits'}
          </button>
        </div>
      </div>
    {/if}

    {#if form?.error && !form?.needsPayment}
      <div
        class="animate-fade-in mt-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center text-red-400"
      >
        {form.error}
      </div>
    {/if}

    {#if form?.summary}
      <SummaryDisplay summary={form.summary} />
      {#if form.audioPath}
        <div class="mt-6 flex flex-col items-center gap-4">
          <AudioPlayer audioPath={form.audioPath} />
          <a
            href={form.audioPath.replace('./', '/')}
            target="_blank"
            class="mb-6 inline-block rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700"
          >
            {m.summary_download_audio()}
          </a>
        </div>
      {/if}
    {/if}

    {#if form?.audioPath}
      <div class="mb-6 text-center">
        <button
          onclick={handleCreateNew}
          disabled={!creditInfo.hasCredits}
          class="inline-block cursor-pointer rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {'Create New Summary'}
        </button>
        {#if !creditInfo.hasCredits}
          <p class="mt-2 text-sm text-amber-400">
            No credits remaining. Purchase more to create new summaries.
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .animate-fade-in {
    animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
