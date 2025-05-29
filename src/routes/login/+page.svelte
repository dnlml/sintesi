<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Title from '$lib/components/TItle.svelte';

  let email = $state('');
  let loading = $state(false);
  let message = $state('');
  let error = $state('');
  let needsPurchase = $state(false);

  // Controlla se c'è un token nell'URL
  const token = $page.url.searchParams.get('token');

  // Se c'è un token, verifica automaticamente
  if (token) {
    verifyToken(token);
  }

  async function sendMagicLink() {
    if (!email.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        message = 'Magic link sent! Check your email and click the link to login.';
        needsPurchase = false;
      } else {
        error = result.error || 'Error sending magic link';
        needsPurchase = result.needsPurchase || false;
      }
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function verifyToken(tokenToVerify: string) {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToVerify })
      });

      const result = await response.json();

      if (response.ok) {
        message = 'Login successful! Redirecting...';
        setTimeout(() => goto('/'), 1000);
      } else {
        error = result.error || 'Invalid or expired token';
      }
    } catch (err) {
      error = 'Error verifying token';
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <Title />

    <div class="mb-8 text-center">
      <h2 class="mb-2 text-2xl font-bold text-white">Login</h2>
      <p class="text-slate-400">Enter your email to receive a magic link</p>
    </div>

    {#if !token}
      <form onsubmit={sendMagicLink} class="space-y-6">
        <div>
          <label for="email" class="mb-2 block text-sm font-medium text-slate-300">
            Email address
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            required
            class="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-white transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email.includes('@')}
          class="w-full cursor-pointer rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
    {:else}
      <div class="text-center">
        <div class="mb-4 text-lg">Verifying your login...</div>
      </div>
    {/if}

    {#if message}
      <div
        class="mt-4 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-center text-green-400"
      >
        {message}
      </div>
    {/if}

    {#if error}
      <div
        class="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center text-red-400"
      >
        {error}
        {#if needsPurchase}
          <div class="mt-3">
            <a
              href="/buy-credits?email={encodeURIComponent(email)}"
              class="inline-block cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Purchase Credits
            </a>
          </div>
        {/if}
      </div>
    {/if}

    <div class="mt-6 text-center">
      <button
        type="button"
        onclick={() => goto('/')}
        class="cursor-pointer text-slate-400 hover:text-slate-300"
      >
        ← Back to home
      </button>
    </div>

    <div class="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
      <h4 class="mb-2 font-semibold text-blue-200">How it works</h4>
      <ul class="space-y-1 text-sm text-blue-100">
        <li>• Enter your email address</li>
        <li>• We'll send you a secure login link</li>
        <li>• Click the link to access your account</li>
        <li>• No password required!</li>
      </ul>
    </div>
  </div>
</div>
