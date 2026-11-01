<script>
  import { onMount, untrack } from 'svelte';
  import { browser } from '$app/env';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import initial from '#lib/data/initial.json';
  import { filterEmojis, normalizeQuery, PAGE_SIZE } from '#lib/emoji.js';

  let catalog = $state.raw(null);
  let loadFailed = $state(false);
  let searchRef;
  let resultsRef;
  let pageSize = $state(PAGE_SIZE);
  let viewportHeight = $state(null);
  let copied = $state('');
  let copyFailed = $state(false);
  let copyTimer;
  let catalogPromise;
  let searchText = $state('');
  const visibleUrl = $derived(browser ? (page.shallow?.url ?? page.url) : null);
  const query = $derived(
    normalizeQuery(visibleUrl?.searchParams.get('q') ?? ''),
  );
  const group = $derived(
    initial.groups.indexOf(visibleUrl?.searchParams.get('group')),
  );
  const browsing = $derived(
    visibleUrl?.searchParams.get('browse') === '1' || group >= 0,
  );
  const requestedPage = $derived(
    Math.max(
      1,
      Number.parseInt(visibleUrl?.searchParams.get('page') ?? '1', 10) || 1,
    ),
  );
  const matches = $derived(
    catalog ? filterEmojis(catalog, query, group) : initial.emojis,
  );
  const ready = $derived(
    catalog !== null || (!query && group < 0 && requestedPage === 1),
  );
  const total = $derived(catalog ? matches.length : initial.total);
  const pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const currentPage = $derived(Math.min(requestedPage, pages));
  $effect(() => {
    const urlQuery = query;
    untrack(() => {
      if (normalizeQuery(searchText) !== urlQuery) searchText = urlQuery;
    });
  });
  $effect(() => {
    if (query || group >= 0 || requestedPage > 1) void loadCatalog();
  });
  const visible = $derived(
    matches.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  );

  function href(
    nextGroup = group,
    nextPage = 1,
    nextQuery = query,
    nextBrowsing = browsing,
  ) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextGroup >= 0) params.set('group', initial.groups[nextGroup]);
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextBrowsing) params.set('browse', '1');
    return `/${params.size ? `?${params}` : ''}`;
  }

  function search(value) {
    searchText = value;
    void goto(href(group, 1, normalizeQuery(value)), {
      shallow: true,
      replace: true,
      reset: false,
    });
  }

  async function loadCatalog() {
    if (catalog) return;
    if (catalogPromise) return catalogPromise;
    loadFailed = false;
    catalogPromise = import('#lib/data/catalog.json')
      .then((module) => {
        catalog = module.default;
      })
      .catch(() => {
        loadFailed = true;
      })
      .finally(() => {
        catalogPromise = null;
      });
    return catalogPromise;
  }

  async function copy(emoji) {
    clearTimeout(copyTimer);
    try {
      await navigator.clipboard.writeText(emoji);
      copied = emoji;
      copyFailed = false;
    } catch {
      copied = '';
      copyFailed = true;
    }
    copyTimer = setTimeout(() => {
      copied = '';
      copyFailed = false;
    }, 1800);
  }

  onMount(() => {
    const updateViewport = () => {
      viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    };
    const observer = new ResizeObserver(([entry]) => {
      const style = getComputedStyle(resultsRef);
      const columns = Number(style.getPropertyValue('--columns'));
      const cell = Number.parseFloat(style.getPropertyValue('--cell-height'));
      const gap = Number.parseFloat(style.getPropertyValue('--gap'));
      const rows = Math.max(
        1,
        Math.floor((entry.contentRect.height + gap) / (cell + gap)),
      );
      pageSize = Math.min(PAGE_SIZE, columns * rows);
    });
    updateViewport();
    observer.observe(resultsRef);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.addEventListener('resize', updateViewport);
    const preload = setTimeout(() => {
      void loadCatalog();
    }, 1200);
    searchRef.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
      clearTimeout(preload);
      clearTimeout(copyTimer);
    };
  });
</script>

<svelte:head>
  <title>Emoji Search</title>
  <meta
    name="description"
    content="Find your next emoji. A fast, simple emoji search with the latest Unicode emoji. Search, tap, and copy."
  />
  <meta
    name="theme-color"
    content="#ffffff"
    media="(prefers-color-scheme: light)"
  />
  <meta
    name="theme-color"
    content="#151515"
    media="(prefers-color-scheme: dark)"
  />
</svelte:head>

<div
  class="shell"
  style:height={viewportHeight ? `${viewportHeight}px` : undefined}
>
  <main>
    <h1 class="sr-only">Emoji Search</h1>
    <section class="browser" aria-label="Emoji search">
      <div class="search-panel">
        <div class="search-wrap">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            aria-hidden="true"
            ><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg
          >
          <input
            bind:this={searchRef}
            type="search"
            aria-label="Search emoji"
            placeholder="Search emoji"
            value={searchText}
            oninput={(event) => search(event.currentTarget.value)}
            autocomplete="off"
            spellcheck="false"
            maxlength="100"
          />
          {#if query}<button
              class="clear-search"
              aria-label="Clear search"
              onclick={() => {
                search('');
                searchRef.focus();
              }}>×</button
            >{/if}
        </div>
      </div>
      <div class="results-heading">
        <h2 class="sr-only">
          {query
            ? `Results for “${query}”`
            : group >= 0
              ? initial.groups[group]
              : 'All emoji'}
        </h2>
        <a
          class="browse-toggle"
          href={href(-1, 1, query, !browsing)}
          aria-expanded={browsing}
          aria-controls="categories"
          >{browsing ? 'Hide categories' : 'Browse categories'}
          <span aria-hidden="true">{browsing ? '⌃' : '⌄'}</span></a
        >
        <span class="byline"
          >made with <span class="heart" role="img" aria-label="love">♥</span>
          in Berlin
          <svg
            class="berlin-bear"
            viewBox="0 0 28 36"
            role="img"
            aria-label="Berlin bear"
          >
            <g fill="currentColor">
              <circle cx="12" cy="4" r="2.5" /><circle cx="17" cy="5" r="2.5" />
              <path d="M10 4c-3 0-5 2-5 4H2v4h7l2 3 7-2V8c0-3-3-4-8-4Z" />
              <path
                d="M11 12c-3 3-4 8-3 12l-4 7 4 2 6-8 1 7 6 1 1-3-4-1 1-8c3-3 2-7-1-10Z"
              />
              <path d="m11 14-6-3-2-5-3 1 2 8 8 4Zm5 0 7-6 3 1-5 8-4 2Z" />
            </g>
          </svg>
        </span>
      </div>
      {#if browsing}
        <nav id="categories" class="categories" aria-label="Emoji categories">
          <a href={href(-1)} aria-current={group < 0 ? 'page' : undefined}
            >All emoji</a
          >
          {#each initial.groups as name, index}<a
              href={href(index)}
              aria-current={group === index ? 'page' : undefined}
              >{[
                'Smileys',
                'People',
                'Nature',
                'Food',
                'Travel',
                'Activities',
                'Objects',
                'Symbols',
                'Flags',
              ][index]}</a
            >{/each}
        </nav>
      {/if}
      <div class="results" bind:this={resultsRef} aria-busy={!ready}>
        {#if loadFailed}
          <div class="empty">
            <h3>Couldn’t load the collection.</h3>
            <button class="retry" onclick={loadCatalog}>Try again</button>
          </div>
        {:else if !ready}
          <div class="empty" role="status">Finding your emoji…</div>
        {:else if visible.length}
          <div class="emojis">
            {#each visible as emoji (emoji[0])}
              <button
                class="emoji"
                class:just-copied={copied === emoji[0]}
                data-emoji={emoji[0]}
                title={emoji[1]}
                aria-label={`Copy ${emoji[1]} ${emoji[0]}`}
                onclick={() => copy(emoji[0])}
                ><span aria-hidden="true">{emoji[0]}</span></button
              >
            {/each}
          </div>
        {:else}
          <div class="empty no-result">
            <span aria-hidden="true">🔎</span>
            <h3>No emoji found.</h3>
            <p>Try a different word, like “happy”, “coffee” or “heart”.</p>
            <a href="/">Explore all emoji <span aria-hidden="true">↗</span></a>
          </div>
        {/if}
      </div>
      {#if total > pageSize && ready}
        <nav class="pagination" aria-label="Results pages">
          {#if currentPage > 1}<a rel="prev" href={href(group, currentPage - 1)}
              >← Previous</a
            >{:else}<span class="disabled">← Previous</span>{/if}
          <span>Page <strong>{currentPage}</strong> of {pages}</span>
          {#if currentPage < pages}<a
              rel="next"
              href={href(group, currentPage + 1)}
              >Next <span aria-hidden="true">→</span></a
            >{:else}<span class="disabled">Next →</span>{/if}
        </nav>
      {/if}
    </section>
  </main>
  <footer>
    <span>Unicode {initial.version}</span>
    <a href="https://github.com/muan/emojilib" target="_blank" rel="noreferrer"
      >emojilib</a
    >
    <a
      href="https://github.com/valeriivasin/emoji-search-svelte"
      target="_blank"
      rel="noreferrer">GitHub</a
    >
  </footer>
</div>
<div
  class="flash"
  role="status"
  aria-live="polite"
  hidden={!copied && !copyFailed}
>
  {copyFailed ? 'Copy unavailable. Please try again.' : `${copied} copied`}<span
    aria-hidden="true">✓</span
  >
</div>
