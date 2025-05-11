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

<div
  class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-2 py-8"
>
  <div class="w-full max-w-lg rounded-2xl border border-blue-100 bg-white/90 p-8 shadow-xl">
    <h1 class="mb-6 text-center text-3xl font-extrabold tracking-tight text-blue-800">
      {m.summary_title()}
    </h1>
    <form
      method="post"
      class="space-y-5"
      onsubmit={() => {
        loading = true;
      }}
    >
      <div>
        <label for="url" class="block font-semibold text-blue-700">{m.summary_placeholder()}</label>
        <input
          id="url"
          name="url"
          type="url"
          bind:value={url}
          required
          placeholder={m.summary_placeholder()}
          class="w-full rounded-lg border border-blue-200 px-3 py-2 text-lg transition focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
      </div>
      {#if !loading}
        <div>
          <label for="language" class="block font-semibold text-blue-700">Audio Language</label>
          <!-- Etichetta temporanea in inglese -->
          <select
            id="language"
            name="language"
            bind:value={selectedLanguage}
            class="w-full rounded-lg border border-blue-200 px-3 py-2 text-lg transition focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div>
          <label for="summaryLength" class="block font-semibold text-blue-700"
            >{m.summary_length_label()}</label
          >
          <select
            id="summaryLength"
            name="summaryLength"
            bind:value={selectedSummaryLength}
            class="w-full rounded-lg border border-blue-200 px-3 py-2 text-lg transition focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="short">{m.length_short()}</option>
            <option value="medium">{m.length_medium()}</option>
            <option value="long">{m.length_long()}</option>
          </select>
        </div>
      {/if}
      <button
        type="submit"
        class="w-full cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-lg font-semibold text-white shadow transition hover:from-blue-700 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Loading...' : m.summary_button()}
      </button>
    </form>

    {#if form?.error}
      <div
        class="animate-fade-in mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-red-600"
      >
        {form.error}
      </div>
    {/if}

    {#if form?.summary}
      <div class="animate-fade-in mt-8">
        <h2 class="mb-3 text-center text-xl font-bold text-indigo-700">{m.summary_title()}</h2>
        <pre
          class="rounded-xl border border-blue-100 bg-blue-50 p-4 text-base whitespace-pre-wrap text-gray-800 shadow-inner">
{form.summary}
        </pre>
        {#if form.audioPath}
          <div class="mt-6 flex justify-center">
            <a
              href={form.audioPath.replace('./', '/')}
              target="_blank"
              class="inline-block rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white shadow transition hover:bg-indigo-700"
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
