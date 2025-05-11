<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';

  let { form }: { form?: { summary?: string; audioPath?: string; error?: string } } = $props();
  let url = $state('');
  let selectedLanguage = $state('it');
  let selectedSummaryLength = $state('medium');
  let loading = $state(false);

  $effect(() => {
    if (form?.summary || form?.error) {
      loading = false;
    }
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <h1 class="font-space-grotesk mb-4 text-center text-4xl font-medium tracking-tight text-white">
      Youtube Summarizer
    </h1>
    <span class="mb-8 block text-center text-sm text-slate-400">
      Transform YouTube Videos into Key Insights: Audio & Text Summaries in a Flash!
    </span>
    <form
      method="post"
      class="space-y-6"
      onsubmit={() => {
        loading = true;
      }}
    >
      <div>
        <label for="url" class="mb-1 block font-semibold text-slate-400"
          >{m.summary_placeholder()}</label
        >
        <input
          id="url"
          name="url"
          type="url"
          bind:value={url}
          required
          placeholder={m.summary_placeholder()}
          class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-lg text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
        />
      </div>
      {#if !loading}
        <div>
          <label for="language" class="mb-1 block font-semibold text-slate-400"
            >Audio Language</label
          >
          <select
            id="language"
            name="language"
            bind:value={selectedLanguage}
            class="w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-lg text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div>
          <label for="summaryLength" class="mb-1 block font-semibold text-slate-400"
            >{m.summary_length_label()}</label
          >
          <select
            id="summaryLength"
            name="summaryLength"
            bind:value={selectedSummaryLength}
            class="w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-lg text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="short">{m.length_short()}</option>
            <option value="medium">{m.length_medium()}</option>
            <option value="long">{m.length_long()}</option>
          </select>
        </div>
      {/if}
      <button
        type="submit"
        class="w-full cursor-pointer rounded-lg bg-sky-600 px-4 py-2.5 text-lg font-semibold text-white shadow-md transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Loading...' : m.summary_button()}
      </button>
    </form>

    {#if form?.error}
      <div
        class="animate-fade-in mt-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center text-red-400"
      >
        {form.error}
      </div>
    {/if}

    {#if form?.summary}
      <div class="animate-fade-in mt-8">
        <h2 class="mb-3 text-center text-xl font-bold text-white">{m.summary_title()}</h2>
        <pre
          class="rounded-xl border border-slate-700 bg-slate-900 p-4 text-base whitespace-pre-wrap text-slate-300 shadow-inner">
{form.summary}
        </pre>
        {#if form.audioPath}
          <div class="mt-6 flex justify-center">
            <a
              href={form.audioPath.replace('./', '/')}
              target="_blank"
              class="inline-block rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700"
            >
              {m.summary_download_audio()}
            </a>
          </div>
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
