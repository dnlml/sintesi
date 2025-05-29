<script lang="ts">
  import { goto } from '$app/navigation';
  import Title from '$lib/components/TItle.svelte';

  let {
    data
  }: {
    data: {
      success: boolean;
      credits?: number;
      email?: string;
      error?: string;
    };
  } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <Title />

    {#if data.success}
      <div class="text-center">
        <div class="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-6">
          <div class="mb-4 text-6xl">🎉</div>
          <h2 class="mb-2 text-2xl font-bold text-green-200">Payment Successful!</h2>
          <p class="text-green-100">
            You have successfully purchased <strong>{data.credits} credits</strong>
          </p>
          <p class="mt-2 text-sm text-green-200">
            Account: {data.email}
          </p>
        </div>

        <div class="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <h3 class="mb-2 font-semibold text-blue-200">What happens now?</h3>
          <ul class="space-y-1 text-sm text-blue-100">
            <li>✅ Your credits are already available</li>
            <li>✅ You will receive a receipt via email</li>
            <li>✅ You can start creating summaries right away</li>
          </ul>
        </div>

        <button
          onclick={() => goto('/')}
          class="w-full cursor-pointer rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
        >
          Start Creating Summaries
        </button>
      </div>
    {:else}
      <div class="text-center">
        <div class="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-6">
          <div class="mb-4 text-6xl">❌</div>
          <h2 class="mb-2 text-2xl font-bold text-red-200">Payment Error</h2>
          <p class="text-red-100">
            {data.error || 'An error occurred while processing the payment.'}
          </p>
        </div>

        <div class="flex gap-4">
          <button
            onclick={() => goto('/buy-credits')}
            class="flex-1 cursor-pointer rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Try Again
          </button>
          <button
            onclick={() => goto('/')}
            class="flex-1 cursor-pointer rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
