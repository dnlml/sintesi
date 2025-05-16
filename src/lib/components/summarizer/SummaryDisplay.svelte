<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  let { summary }: { summary: string } = $props();
</script>

<div class="animate-fade-in mt-8">
  <h2 class="mb-3 text-center text-xl font-bold text-white">{m.summary_title()}</h2>
  <pre
    class="rounded-xl border border-slate-700 bg-slate-900 p-4 text-base whitespace-pre-wrap text-slate-300 shadow-inner">
{summary}
  </pre>
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
