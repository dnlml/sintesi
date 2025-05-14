<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  let { form }: { form?: { summary?: string; audioPath?: string; error?: string } } = $props();
  let url = $state('');
  let selectedLanguage = $state('it');
  let selectedSummaryLength = $state('medium');
  let loading = $state(false);

  // State per il player audio personalizzato
  let audioRef: HTMLAudioElement | null = $state(null);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(1); // Volume da 0 a 1
  let previousVolume = $state(1);
  let isMuted = $state(false);
  let playbackRate = $state(1.0);

  $effect(() => {
    if (form?.summary || form?.error) {
      loading = false;
    }
  });

  $effect(() => {
    if (audioRef) {
      audioRef.playbackRate = playbackRate;
    }
  });

  function togglePlayPause() {
    if (!audioRef) return;
    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play();
    }
    isPlaying = !isPlaying;
  }

  function handleTimeUpdate() {
    if (!audioRef) return;
    currentTime = audioRef.currentTime;
  }

  function handleLoadedMetadata() {
    if (!audioRef) return;
    duration = audioRef.duration;
  }

  function handleSeek(event: Event) {
    if (!audioRef) return;
    const target = event.target as HTMLInputElement;
    audioRef.currentTime = Number(target.value);
    currentTime = audioRef.currentTime;
  }

  function handleVolumeChange(event: Event) {
    if (!audioRef) return;
    const target = event.target as HTMLInputElement;
    volume = Number(target.value);
    audioRef.volume = volume;
    isMuted = volume === 0;
    if (volume > 0) previousVolume = volume;
  }

  function toggleMute() {
    if (!audioRef) return;
    if (isMuted) {
      audioRef.volume = previousVolume;
      volume = previousVolume;
      isMuted = false;
    } else {
      previousVolume = volume;
      audioRef.volume = 0;
      volume = 0;
      isMuted = true;
    }
  }

  function formatTime(timeInSeconds: number) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function changePlaybackRate(newRate: number) {
    if (!audioRef) return;
    audioRef.playbackRate = newRate;
    playbackRate = newRate;
  }

  $effect(() => {
    const ref = audioRef; // Capture for cleanup
    if (ref) {
      const endedHandler = () => {
        isPlaying = false;
        currentTime = 0;
      };
      ref.addEventListener('ended', endedHandler);
      return () => {
        ref.removeEventListener('ended', endedHandler);
      };
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
      <form
        method="post"
        use:enhance
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
    {/if}

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
          <div class="mt-6 flex flex-col items-center gap-4">
            <!-- Player Audio Personalizzato -->
            <div
              class="mb-3 w-full max-w-md rounded-xl border border-slate-600 bg-slate-700 p-4 shadow-md"
            >
              <audio
                bind:this={audioRef}
                src={form.audioPath.replace('./', '/')}
                ontimeupdate={handleTimeUpdate}
                onloadedmetadata={handleLoadedMetadata}
                class="hidden"
              ></audio>

              <div class="flex items-center gap-3">
                <button
                  onclick={togglePlayPause}
                  class="cursor-pointer text-sky-400 hover:text-sky-300 focus:outline-none"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {#if isPlaying}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><rect x="6" y="4" width="4" height="16"></rect><rect
                        x="14"
                        y="4"
                        width="4"
                        height="16"
                      ></rect></svg
                    >
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg
                    >
                  {/if}
                </button>

                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  bind:value={currentTime}
                  oninput={handleSeek}
                  class="h-2 flex-grow cursor-pointer appearance-none rounded-lg bg-slate-600 accent-sky-500"
                  aria-label="Audio progress"
                />
                <div class="w-20 text-center text-sm text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <button
                  onclick={toggleMute}
                  class="text-sky-400 hover:text-sky-300 focus:outline-none"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {#if isMuted}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line
                        x1="23"
                        y1="9"
                        x2="17"
                        y2="15"
                      ></line><line x1="17" y1="9" x2="23" y2="15"></line></svg
                    >
                  {:else if volume > 0.5}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path
                        d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                      ></path></svg
                    >
                  {:else if volume > 0}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path
                        d="M15.54 8.46a5 5 0 0 1 0 7.07"
                      ></path></svg
                    >
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line
                        x1="23"
                        y1="9"
                        x2="17"
                        y2="15"
                      ></line><line x1="17" y1="9" x2="23" y2="15"></line></svg
                    >
                  {/if}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  bind:value={volume}
                  oninput={handleVolumeChange}
                  class="h-2 w-20 cursor-pointer appearance-none rounded-lg bg-slate-600 accent-sky-500"
                  aria-label="Volume"
                />
              </div>

              <!-- Controlli Playback Rate -->
              <div class="mt-3 flex items-center justify-center gap-2">
                <span class="text-sm text-slate-300">Speed:</span>
                {#each [1.0, 1.2, 1.5, 2.0] as rate (rate)}
                  <button
                    onclick={() => changePlaybackRate(rate)}
                    class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none {playbackRate ===
                    rate
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}"
                  >
                    {rate.toFixed(1)}x
                  </button>
                {/each}
              </div>
            </div>

            <a
              href={form.audioPath.replace('./', '/')}
              target="_blank"
              class="mb-6 inline-block rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700"
            >
              {m.summary_download_audio()}
            </a>
          </div>
        {/if}
      </div>
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
