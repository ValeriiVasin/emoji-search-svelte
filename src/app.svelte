<script>
  import { onMount } from "svelte";
  import { lib } from "emojilib";
  import Fuse from "fuse.js";

  let searchRef;
  onMount(() => searchRef.focus());

  const items = [];
  for (let [key, item] of Object.entries(lib)) {
    items.push({ ...item, name: key });
  }

  let filter = window.location.hash.slice(1);
  const fuse = new Fuse(items, {
    shouldSort: true,
    threshold: 0.2,
    location: 0,
    distance: 100,
    minMatchCharLength: 0,
    keys: ["name", "category", "keywords"]
  });

  const all = items.map(item => ({ item }));

  $: results = filter.trim().length > 0 ? fuse.search(filter) : all;
  $: window.location.hash = filter.trim();
</script>

<style>
  .app {
    width: 960px;
    margin: 0 auto;
  }

  .filter {
    display: flex;
    justify-content: center;
  }

  input {
    width: 300px;
    padding: 4px 8px;
  }

  .list {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    margin-top: 16px;
    padding: 8px 0;
    border-bottom: 1px solid gray;
    border-top: 1px solid gray;
  }

  .emoji {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 32px;
    padding: 8px;
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
</style>

<div class="app">
  <div class="filter">
    <input
      bind:this={searchRef}
      bind:value={filter}
      type="search"
      placeholder="search for emoji by the keyword" />
  </div>
  <div class="list">
    {#each results as item}
      <div class="emoji">{item.item.char}</div>
    {:else}
      <h3>Nothing found</h3>
    {/each}
  </div>

  <footer>
    <a
      href="https://github.com/valeriivasin/emoji-svelte"
      class="footer-link"
      target="_blank"
      rel="noopener">
      Github
    </a>
    <a
      href="https://github.com/muan/emojilib"
      class="footer-link"
      target="_blank"
      rel="noopener">
      Data Source
    </a>
  </footer>
</div>
