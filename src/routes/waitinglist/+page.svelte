<script lang="ts">
  import { enhance } from '$app/forms';
  import { fly } from 'svelte/transition';
  import type { ActionData } from './$types';
  import Title from '$lib/components/TItle.svelte';

  let email = $state('');
  let message = $state('');
  let messageTimeoutId: ReturnType<typeof setTimeout> | undefined;

  let { form }: { form?: ActionData } = $props();

  $effect(() => {
    // Always clear any existing timeout when `form` data changes or this effect re-runs.
    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId);
      messageTimeoutId = undefined;
    }

    if (form?.message) {
      message = form.message;

      if (form.success) {
        email = '';
      }

      messageTimeoutId = setTimeout(() => {
        message = '';
      }, 5000);
    } else {
      message = '';
    }
  });

  // Cleanup timeout on component unmount
  $effect(() => {
    return () => {
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }
    };
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <Title />
    <span class="mb-8 block text-center text-sm text-slate-400">
      Unlock Early Access! Register your email and be among the first to experience SINTESI, the
      easiest way to summarize YouTube videos in audio and text.
    </span>

    <form method="POST" use:enhance class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-slate-300">Email address</label>
        <div class="mt-1">
          <input
            bind:value={email}
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="block w-full appearance-none rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-200 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none sm:text-sm"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          class="flex w-full cursor-pointer justify-center rounded-lg bg-sky-600 px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
        >
          Register
        </button>
      </div>
    </form>

    {#if message}
      <div
        class=" mt-6 rounded-lg border p-3 text-center"
        class:border-green-500_50={message.startsWith('Thank you')}
        class:bg-green-500_10={message.startsWith('Thank you')}
        class:text-green-400={message.startsWith('Thank you')}
        class:border-red-500_50={!message.startsWith('Thank you')}
        class:bg-red-500_10={!message.startsWith('Thank you')}
        class:text-red-400={!message.startsWith('Thank you')}
        transition:fly
      >
        {message}
      </div>
    {/if}
  </div>
</div>
