<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Title from '$lib/components/TItle.svelte';

  let email = $state('');
  let selectedPackage = $state<string | null>(null);
  let loading = $state(false);

  const packages = [
    { id: '1', name: 'Starter', credits: 10, price: '5.00' },
    { id: '2', name: 'Pro', credits: 25, price: '10.00' },
    { id: '3', name: 'Premium', credits: 50, price: '18.00' }
  ];

  // Pre-compila l'email se passata come parametro URL
  $effect(() => {
    const emailParam = $page.url.searchParams.get('email');
    if (emailParam) {
      email = emailParam;
    }
  });

  async function handlePurchase() {
    if (!selectedPackage) {
      alert('Please select a package');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    loading = true;

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packageId: selectedPackage,
          email
        })
      });

      const result = await response.json();

      if (response.ok && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        alert(result.error || 'Error creating checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Network error. Please try again.');
    } finally {
      loading = false;
    }
  }

  function selectPackage(id: string) {
    selectedPackage = id;
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-2 py-8 text-slate-200">
  <div class="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
    <Title />

    <div class="mb-8 text-center">
      <h2 class="mb-2 text-2xl font-bold text-white">Buy Credits</h2>
      <p class="text-slate-400">Choose the perfect package for your needs</p>
    </div>

    <div class="mb-6">
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

    <div class="mb-8">
      <h3 class="mb-4 text-lg font-semibold text-white">Choose your package</h3>
      <div class="grid gap-4 md:grid-cols-3">
        {#each packages as pkg}
          <button
            type="button"
            onclick={() => selectPackage(pkg.id)}
            class="cursor-pointer rounded-lg border p-4 text-left transition {selectedPackage ===
            pkg.id
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-slate-600 bg-slate-700/30'}"
          >
            <h4 class="mb-2 font-semibold text-white">{pkg.name}</h4>
            <p class="mb-1 text-2xl font-bold text-sky-400">€{pkg.price}</p>
            <p class="mb-2 text-slate-300">{pkg.credits} summaries</p>
            <p class="text-xs text-slate-400">
              €{(parseFloat(pkg.price) / pkg.credits).toFixed(2)}/credit
            </p>
          </button>
        {/each}
      </div>
    </div>

    <div class="flex gap-4">
      <button
        type="button"
        onclick={() => goto('/')}
        class="flex-1 cursor-pointer rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-700"
      >
        Go Back
      </button>
      <button
        type="button"
        onclick={handlePurchase}
        disabled={loading || !selectedPackage || !email.includes('@')}
        class="flex-1 cursor-pointer rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>

    <div class="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
      <h4 class="mb-2 font-semibold text-blue-200">Important Information</h4>
      <ul class="space-y-1 text-sm text-blue-100">
        <li>• Credits never expire</li>
        <li>• Secure payment via Stripe</li>
        <li>• You'll receive a receipt via email</li>
        <li>• Credits will be available immediately after payment</li>
      </ul>
    </div>
  </div>
</div>
