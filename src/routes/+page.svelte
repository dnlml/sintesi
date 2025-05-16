<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import { goto } from '$app/navigation';
  import SummarizerForm from '$lib/components/summarizer/SummarizerForm.svelte';
  import AudioPlayer from '$lib/components/summarizer/AudioPlayer.svelte';
  import SummaryDisplay from '$lib/components/summarizer/SummaryDisplay.svelte';

  let { form }: { form?: { summary?: string; audioPath?: string; error?: string } } = $props();
  let url = $state('');
  let selectedLanguage = $state('en');
  let selectedSummaryLength = $state('medium');
  let loading = $state(false);

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
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <h1 class="font-space-grotesk mb-4 text-center text-4xl font-medium tracking-tight text-white">
      Youtube Summarizer
    </h1>
    <span class="mb-8 block text-center text-sm text-slate-400">
      Transform YouTube Videos into Key Insights: Audio & Text Summaries in a Flash!
    </span>
    {#if !form?.audioPath}
      <SummarizerForm bind:loading bind:url bind:selectedLanguage bind:selectedSummaryLength />
    {/if}

    {#if form?.error}
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
          class="inline-block cursor-pointer rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700"
        >
          {'Create New Summary'}
        </button>
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
