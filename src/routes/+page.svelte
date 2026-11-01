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
  const pages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
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
    matches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
  );

  function href(nextGroup = group, nextPage = 1, nextQuery = query) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextGroup >= 0) params.set('group', initial.groups[nextGroup]);
    if (nextPage > 1) params.set('page', String(nextPage));
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
    const preload = setTimeout(() => {
      void loadCatalog();
    }, 1200);
    if (matchMedia('(hover: hover) and (pointer: fine)').matches)
      searchRef.focus({ preventScroll: true });
    return () => {
      clearTimeout(preload);
      clearTimeout(copyTimer);
    };
  });
</script>

<svelte:head>
  <title>emo. — A little more expression</title>
  <meta
    name="description"
    content="Find your next emoji. A fast, simple emoji search with the latest Unicode emoji. Search, tap, and copy."
  />
  <meta
    name="theme-color"
    content="#f7f8f2"
    media="(prefers-color-scheme: light)"
  />
  <meta
    name="theme-color"
    content="#111b18"
    media="(prefers-color-scheme: dark)"
  />
</svelte:head>

<div class="shell">
  <header>
    <a class="brand" href="/" aria-label="emo home"
      ><span class="brand-mark" aria-hidden="true">✳</span> emo<span
        class="brand-dot">.</span
      ></a
    >
    <span class="header-note">Little things. Big feelings.</span>
    <a
      class="source-link"
      href="https://github.com/valeriivasin/emoji-search-svelte"
      target="_blank"
      rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a
    >
  </header>

  <main>
    <section class="hero" aria-labelledby="headline">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> A LITTLE MORE EXPRESSION</p>
        <h1 id="headline">Say it with<br /><em>a little feeling.</em></h1>
        <p class="intro">
          The right emoji is worth a thousand words.<br class="desktop-break" />
          Find yours. Tap to copy. Make someone’s day.
        </p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="art-caption">a whole mood</span><span class="hero-emoji"
          >✌️</span
        ><span class="spark spark-one">✧</span><span class="spark spark-two"
          >✧</span
        ><span class="art-scribble">↶</span>
      </div>
    </section>

    <section class="browser" aria-label="Emoji search">
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
          placeholder="What’s the feeling?"
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
          >{:else}<span class="search-hint">Search anything</span>{/if}
      </div>
      <nav class="categories" aria-label="Emoji categories">
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
      <div class="results-heading">
        <h2>
          {query
            ? `Results for “${query}”`
            : group >= 0
              ? initial.groups[group]
              : 'Find your next favorite'}
        </h2>
        <span
          >{total.toLocaleString('en')} emoji <span class="count-dot">·</span> click
          to copy</span
        >
      </div>
      <div class="results" aria-busy={!ready}>
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
      {#if total > PAGE_SIZE && ready}
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
    <aside class="little-note">
      <span aria-hidden="true">✳</span>
      <p>
        Less searching. More expressing.<br /><span
          >No downloads, no sign-ups. Just a little joy.</span
        >
      </p>
    </aside>
  </main>
  <footer>
    <a class="brand footer-brand" href="/">emo.</a>
    <p>Unicode {initial.version} <span>·</span> Emoji styled by your device</p>
    <a href="https://github.com/muan/emojilib" target="_blank" rel="noreferrer"
      >Made with emojilib ↗</a
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
