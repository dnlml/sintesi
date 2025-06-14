<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import { enhance } from '$app/forms';

  let { loading, url, selectedLanguage, selectedSummaryLength } = $props<{
    loading?: boolean;
    url?: string;
    selectedLanguage?: string;
    selectedSummaryLength?: string;
  }>();

  let loadingState = $state(loading ?? false);
  let urlState = $state(url ?? '');
  let selectedLanguageState = $state(selectedLanguage ?? 'en');
  let selectedSummaryLengthState = $state(selectedSummaryLength ?? 'medium');
</script>

<form
  method="post"
  use:enhance
  class="space-y-6"
  onsubmit={() => {
    loadingState = true;
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
      bind:value={urlState}
      required
      placeholder={m.summary_placeholder()}
      class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-lg text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
    />
  </div>
  {#if !loadingState}
    <div>
      <label for="language" class="mb-1 block font-semibold text-slate-400">Audio Language</label>
      <select
        id="language"
        name="language"
        bind:value={selectedLanguageState}
        class="w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-lg text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
      >
        <option value="en">English</option>
        <option value="it">Italiano</option>
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
        bind:value={selectedSummaryLengthState}
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
    disabled={loadingState}
  >
    {loadingState ? 'Loading...' : m.summary_button()}
  </button>
</form>
