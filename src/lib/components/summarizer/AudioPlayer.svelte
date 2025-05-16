<script lang="ts">
  let { audioPath }: { audioPath: string } = $props();

  let audioRef: HTMLAudioElement | null = $state(null);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(1);
  let previousVolume = $state(1);
  let isMuted = $state(false);
  let playbackRate = $state(1.0);

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
        currentTime = 0; // Reset to beginning when audio ends
      };
      ref.addEventListener('ended', endedHandler);
      return () => {
        ref.removeEventListener('ended', endedHandler);
      };
    }
  });
</script>

<div class="mb-3 w-full max-w-md rounded-xl border border-slate-600 bg-slate-700 p-4 shadow-md">
  <audio
    bind:this={audioRef}
    src={audioPath.replace('./', '/')}
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
          ><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"
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
        class="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-700 focus:outline-none {playbackRate ===
        rate
          ? 'bg-sky-500 text-white'
          : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}"
      >
        {rate.toFixed(1)}x
      </button>
    {/each}
  </div>
</div>
