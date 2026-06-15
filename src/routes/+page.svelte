<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { createFilteredSet, emojis, normalizeQuery } from '$lib/emoji';

  let searchRef;
  let flashRef;
  let flashTextRef;
  let noResultRef;
  let noResultQueryRef;
  let emojisRef;
  let flashTimeout;

  function getQueryFromUrl() {
    if (!browser) {
      return '';
    }

    return normalizeQuery(new URL(window.location.href).searchParams.get('q') ?? '');
  }

  function writeQueryToUrl(value) {
    const normalized = normalizeQuery(value);
    const nextUrl = new URL(window.location.href);

    if (normalized) {
      nextUrl.searchParams.set('q', normalized);
    } else {
      nextUrl.searchParams.delete('q');
    }

    window.history.pushState({}, '', nextUrl);
  }

  function renderFilter(value) {
    const normalized = normalizeQuery(value);
    const visible = createFilteredSet(normalized);
    let visibleCount = 0;

    searchRef.value = normalized;

    for (const button of emojisRef.querySelectorAll('[data-emoji]')) {
      const isVisible = visible.has(button.dataset.emoji);
      button.hidden = !isVisible;

      if (isVisible) {
        visibleCount += 1;
      }
    }

    noResultQueryRef.textContent = normalized;
    noResultRef.hidden = visibleCount > 0;
  }

  function showCopyFlash(emoji) {
    flashTextRef.textContent = `${emoji} copied`;
    flashRef.hidden = false;
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => {
      flashRef.hidden = true;
    }, 500);
  }

  onMount(() => {
    const handleInput = (event) => {
      const normalized = normalizeQuery(event.currentTarget.value);

      renderFilter(normalized);
      writeQueryToUrl(normalized);
    };

    const handleClick = async (event) => {
      const button = event.target.closest('[data-emoji]');

      if (!button) {
        return;
      }

      const emoji = button.dataset.emoji;

      showCopyFlash(emoji);

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(emoji);
        }
      } catch {
        // Preserve the copy feedback even if clipboard permissions are denied.
      }
    };

    const handlePopState = () => {
      renderFilter(getQueryFromUrl());
    };

    searchRef.oninput = handleInput;
    searchRef.onchange = handleInput;
    searchRef.onsearch = handleInput;
    emojisRef.addEventListener('click', handleClick);
    window.addEventListener('popstate', handlePopState);

    renderFilter(getQueryFromUrl());
    searchRef.focus();

    return () => {
      searchRef.oninput = null;
      searchRef.onchange = null;
      searchRef.onsearch = null;
      emojisRef.removeEventListener('click', handleClick);
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(flashTimeout);
    };
  });
</script>

<svelte:head>
  <title>Emojis Search</title>
  <meta
    name="description"
    content="Search emojis by keyword and copy them to your clipboard." />
</svelte:head>

<style>
  .app {
    width: 336px;
    margin: 0 auto;
  }

  .filter {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .search-input {
    width: 300px;
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 2px;
  }

  .content {
    margin-top: 16px;
    padding: 8px 0;
    border-top: 1px solid gray;
    border-bottom: 1px solid gray;
  }

  .emojis {
    display: grid;
    grid-template-columns: repeat(7, 48px);
    gap: 0;
  }

  .emoji {
    width: 48px;
    height: 48px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 32px;
    border: 0;
    border-radius: 4px;
    background: transparent;
  }

  .emoji:hover,
  .emoji:focus-visible {
    background-color: lightgray;
  }

  .flash {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 16px;
    border-radius: 8px;
    background-color: rgb(0 0 0 / 50%);
    color: white;
    font-size: 32px;
  }

  .no-result {
    font-size: 32px;
  }

  footer {
    margin-top: 16px;
    padding: 8px 0;
    display: flex;
    justify-content: center;
  }

  .footer-link {
    margin: 0 8px;
  }

  @media only screen and (min-width: 600px) {
    .app {
      width: 960px;
    }

    .emojis {
      grid-template-columns: repeat(20, 48px);
    }
  }
</style>

<div bind:this={flashRef} class="flash" role="status" aria-live="polite" hidden>
  <span bind:this={flashTextRef}></span>
</div>

<div class="app">
  <div class="filter">
    <input
      bind:this={searchRef}
      class="search-input"
      type="text"
      role="searchbox"
      placeholder="search for emoji by the keyword" />
  </div>

  <div class="content">
    <div bind:this={emojisRef} class="emojis">
      {#each emojis as emoji (emoji.char)}
        <button
          type="button"
          class="emoji"
          title="Copy to Clipboard"
          aria-label={`Copy ${emoji.char} to clipboard`}
          data-emoji={emoji.char}>
          {emoji.char}
        </button>
      {/each}
    </div>

    <div bind:this={noResultRef} class="no-result" hidden>
      Nothing found for the query
      <b>"<span bind:this={noResultQueryRef}></span>"</b>
    </div>
  </div>

  <footer>
    <a
      href="https://github.com/valeriivasin/emoji-search-svelte"
      class="footer-link"
      target="_blank"
      rel="noopener noreferrer">
      Github
    </a>
    <a
      href="https://emoji.muan.co"
      class="footer-link"
      target="_blank"
      rel="noopener noreferrer">
      Original Source
    </a>
    <a
      href="https://github.com/muan/emojilib"
      class="footer-link"
      target="_blank"
      rel="noopener noreferrer">
      Data Source
    </a>
  </footer>
</div>
