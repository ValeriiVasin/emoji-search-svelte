<script>
  import { flushSync, onMount, untrack } from 'svelte';
  import { browser } from '$app/env';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import logo from '#lib/assets/emo-logo.svg?raw';
  import initial from '#lib/data/initial.json';
  import { filterEmojis, normalizeQuery } from '#lib/emoji.js';

  let catalog = $state.raw(null);
  let loadFailed = $state(false);
  let searchRef;
  let launcherRef;
  let mobileSearchOpen = $state(false);
  let hydrated = $state(false);
  let resultsRef;
  let scrollTop = $state(0);
  let grid = $state.raw({ columns: 12, stride: 70, rows: 4 });
  let scrollTimer;
  let lastScrollAnchor = 0;
  let lastFilter = '';
  let lastGrid = '';
  const overscan = 2;
  let viewportHeight = $state(null);
  let viewportTop = $state(0);
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
  const anchor = $derived(
    Math.max(
      0,
      Number.parseInt(visibleUrl?.searchParams.get('at') ?? '0', 10) || 0,
    ),
  );
  const matches = $derived(
    catalog ? filterEmojis(catalog, query, group) : initial.emojis,
  );
  const ready = $derived(
    catalog !== null || (!query && group < 0 && anchor === 0),
  );
  $effect(() => {
    const urlQuery = query;
    untrack(() => {
      if (normalizeQuery(searchText) !== urlQuery) searchText = urlQuery;
    });
  });
  $effect(() => {
    if (query || group >= 0 || anchor > 0) void loadCatalog();
  });
  const totalRows = $derived(Math.ceil(matches.length / grid.columns));
  const firstRow = $derived(
    Math.max(
      0,
      Math.min(totalRows, Math.floor(scrollTop / grid.stride) - overscan),
    ),
  );
  const endRow = $derived(
    Math.min(
      totalRows,
      Math.floor(scrollTop / grid.stride) + grid.rows + overscan,
    ),
  );
  const visible = $derived(
    matches.slice(firstRow * grid.columns, endRow * grid.columns),
  );

  $effect(() => {
    if (!resultsRef || (anchor > 0 && !catalog)) return;
    const filter = `${query}|${group}`;
    const sizing = `${grid.columns}|${grid.stride}`;
    const index = Math.min(anchor, Math.max(0, matches.length - 1));
    const top = Math.floor(index / grid.columns) * grid.stride;
    untrack(() => {
      if (
        lastFilter === filter &&
        lastScrollAnchor === anchor &&
        lastGrid === sizing
      )
        return;
      clearTimeout(scrollTimer);
      lastFilter = filter;
      lastScrollAnchor = anchor;
      lastGrid = sizing;
      resultsRef.scrollTop = top;
      scrollTop = resultsRef.scrollTop;
    });
  });

  function resetView(event) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    clearTimeout(scrollTimer);
    resultsRef.scrollTop = 0;
    scrollTop = 0;
  }

  function href(
    nextGroup = group,
    nextQuery = query,
    nextBrowsing = browsing,
    nextAnchor = 0,
  ) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextGroup >= 0) params.set('group', initial.groups[nextGroup]);
    if (nextBrowsing) params.set('browse', '1');
    if (nextAnchor > 0) params.set('at', String(nextAnchor));
    return `/${params.size ? `?${params}` : ''}`;
  }

  function openSearch() {
    flushSync(() => {
      mobileSearchOpen = true;
    });
    searchRef.focus({ preventScroll: true });
  }

  function preserveSearchFocus(event) {
    if (document.activeElement !== searchRef || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      (event.target === searchRef || event.target.closest('.close-search'))
    )
      return;
    // Cancel only the mouse focus transfer: cancelling pointerdown can suppress Safari taps.
    // Click activation and touch scrolling remain available.
    if (
      mobileSearchOpen ||
      (event.target instanceof Element && event.target.closest('[data-emoji]'))
    )
      event.preventDefault();
  }

  function closeSearch() {
    flushSync(() => {
      mobileSearchOpen = false;
    });
    searchRef.blur();
    launcherRef?.focus({ preventScroll: true });
  }

  function search(value) {
    clearTimeout(scrollTimer);
    searchText = value;
    void goto(href(group, normalizeQuery(value)), {
      shallow: true,
      replace: true,
      reset: false,
    });
  }

  function scroll() {
    scrollTop = resultsRef.scrollTop;
    if (!catalog) void loadCatalog();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const index =
        Math.floor(resultsRef.scrollTop / grid.stride) * grid.columns;
      if (index === anchor) return;
      lastScrollAnchor = index;
      void goto(href(group, query, browsing, index), {
        shallow: true,
        replace: true,
        reset: false,
      });
    }, 120);
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
      viewportTop = window.visualViewport?.offsetTop ?? 0;
    };
    const observer = new ResizeObserver(([entry]) => {
      const style = getComputedStyle(resultsRef);
      const columns = Number(style.getPropertyValue('--columns'));
      const cell = Number.parseFloat(style.getPropertyValue('--cell-height'));
      const gap = Number.parseFloat(style.getPropertyValue('--gap'));
      grid = {
        columns,
        stride: cell + gap,
        rows: Math.max(1, Math.ceil(entry.contentRect.height / (cell + gap))),
      };
    });
    updateViewport();
    observer.observe(resultsRef);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('mousedown', preserveSearchFocus, true);
    const mobile = matchMedia(
      '(max-width: 600px), (hover: none) and (pointer: coarse)',
    );
    const updateSearchMode = () => {
      mobileSearchOpen = false;
      if (mobile.matches) searchRef.blur();
      else searchRef.focus({ preventScroll: true });
    };
    updateSearchMode();
    mobile.addEventListener('change', updateSearchMode);
    void loadCatalog();
    hydrated = true;
    return () => {
      mobile.removeEventListener('change', updateSearchMode);
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('mousedown', preserveSearchFocus, true);
      clearTimeout(copyTimer);
      clearTimeout(scrollTimer);
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
  data-sveltekit-reset={mobileSearchOpen ? 'false' : undefined}
  style:height={viewportHeight ? `${viewportHeight}px` : undefined}
  style:top={`${viewportTop}px`}
>
  <main>
    <h1 class="sr-only">Emoji Search</h1>
    <section class="browser" aria-label="Emoji search">
      <div class="search-panel" class:mobile-open={mobileSearchOpen}>
        <a
          class="home-logo"
          href="/"
          aria-label="emo — show all emoji"
          title="Reset search and categories"
          aria-hidden={mobileSearchOpen}
          tabindex={mobileSearchOpen ? -1 : 0}
          onclick={resetView}>{@html logo}</a
        >
        {#if query && !mobileSearchOpen}
          <button
            type="button"
            class="mobile-query"
            onclick={openSearch}
            aria-label={`Edit search: ${query}`}
            ><span>Search:</span> {query}</button
          >
        {/if}

        <div class="search-wrap" id="search-field">
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
            onkeydown={(event) => {
              if (event.key === 'Escape' && mobileSearchOpen) {
                event.preventDefault();
                closeSearch();
              }
            }}
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
        <button
          type="button"
          class="close-search"
          aria-label="Close search"
          title="Close search"
          onclick={closeSearch}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg
          >
        </button>
        <button
          type="button"
          class="search-launcher"
          disabled={!hydrated}
          class:has-query={!!query}
          bind:this={launcherRef}
          aria-label="Open search"
          aria-expanded={mobileSearchOpen}
          aria-controls="search-field"
          aria-hidden={mobileSearchOpen}
          tabindex={mobileSearchOpen ? -1 : 0}
          title={query ? `Search: ${query}` : 'Search emoji'}
          onclick={openSearch}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
            ><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg
          >
        </button>
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
          href={href(-1, query, !browsing)}
          aria-expanded={browsing}
          aria-controls="categories"
          ><span class="browse-label"
            >Categories
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
            >
          </span></a
        >
        <div class="feedback" class:has-message={!!copied || copyFailed}>
          <span class="byline"
            >made with <span class="heart" role="img" aria-label="love">♥</span
            >
            in Berlin
            <svg
              class="berlin-bear"
              viewBox="0 0 28 36"
              role="img"
              aria-label="Berlin bear"
            >
              <g fill="currentColor">
                <circle cx="12" cy="4" r="2.5" /><circle
                  cx="17"
                  cy="5"
                  r="2.5"
                />
                <path d="M10 4c-3 0-5 2-5 4H2v4h7l2 3 7-2V8c0-3-3-4-8-4Z" />
                <path
                  d="M11 12c-3 3-4 8-3 12l-4 7 4 2 6-8 1 7 6 1 1-3-4-1 1-8c3-3 2-7-1-10Z"
                />
                <path d="m11 14-6-3-2-5-3 1 2 8 8 4Zm5 0 7-6 3 1-5 8-4 2Z" />
              </g>
            </svg>
          </span>
          <span
            class="copy-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {#if copied}
              <span>{copied} copied</span>
            {:else if copyFailed}
              <span aria-hidden="true">!</span><span>Copy unavailable</span>
            {/if}
          </span>
        </div>
      </div>
      {#if browsing}
        <nav id="categories" class="categories" aria-label="Emoji categories">
          <a href={href(-1)} aria-current={group < 0 ? 'page' : undefined}
            ><span>All emoji</span></a
          >
          {#each initial.groups as name, index}<a
              href={href(index)}
              aria-current={group === index ? 'page' : undefined}
              ><span
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
                ][index]}</span
              ></a
            >{/each}
        </nav>
      {/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (A labelled scroll region needs keyboard focus for Page Up/Down.) -->
      <div
        class="results"
        bind:this={resultsRef}
        aria-busy={!ready}
        role="region"
        aria-label="Emoji results"
        tabindex="0"
        onscroll={scroll}
        onwheel={() => {
          if (!catalog) void loadCatalog();
        }}
        onfocusin={() => {
          if (!catalog) void loadCatalog();
        }}
      >
        {#if loadFailed}
          <div class="empty">
            <h3>Couldn’t load the collection.</h3>
            <button class="retry" onclick={loadCatalog}>Try again</button>
          </div>
        {:else if !ready}
          <div class="empty" role="status">Finding your emoji…</div>
        {:else if matches.length}
          <div
            aria-hidden="true"
            style:height={`${firstRow * grid.stride}px`}
          ></div>
          <div class="emojis">
            {#each visible as emoji (emoji[0])}
              <button
                class="emoji"
                disabled={!hydrated}
                class:just-copied={copied === emoji[0]}
                data-emoji={emoji[0]}
                title={emoji[1]}
                aria-label={`Copy ${emoji[1]} ${emoji[0]}`}
                onclick={() => copy(emoji[0])}
                ><span aria-hidden="true">{emoji[0]}</span></button
              >
            {/each}
          </div>
          <div
            aria-hidden="true"
            style:height={`${Math.max(0, totalRows - endRow) * grid.stride}px`}
          ></div>
        {:else}
          <div class="empty no-result">
            <span aria-hidden="true">🔎</span>
            <h3>No emoji found.</h3>
            <p>Try a different word, like “happy”, “coffee” or “heart”.</p>
            <a href="/">Explore all emoji <span aria-hidden="true">↗</span></a>
          </div>
        {/if}
      </div>
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
