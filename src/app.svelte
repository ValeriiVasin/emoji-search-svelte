<script>
  import ClipboardJS from "clipboard";
  import { onMount } from "svelte";
  import { createFilteredSet,emojis } from "./lib";

  let searchRef;
  onMount(() => {
    searchRef.focus();
    const clipboard = new ClipboardJS(".emoji");
    return () => {
      clipboard.destroy();
    };
  });

  let filter = window.location.hash.slice(1);

  let currentEmoji = "";
  let interval;
  function emojiClick(emoji) {
    currentEmoji = emoji;
    clearInterval(interval);
    setTimeout(() => (currentEmoji = ""), 500);
  }

  $: filter = filter.replace(/\s+/g, "_");
  $: window.location.hash = filter.trim();
  $: visible = createFilteredSet(filter);
</script>

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

  input {
    width: 300px;
    padding: 8px 16px;
  }

  .content {
    margin-top: 16px;
    padding: 8px 0;
    border-bottom: 1px solid gray;
    border-top: 1px solid gray;
  }

  .emojis {
    display: grid;
    grid-template-columns: repeat(7, 48px);
  }

  .emoji {
    width: 48px;
    height: 48px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 32px;
    border-radius: 4px;
  }

  .emoji:hover {
    background-color: lightgray;
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

  .flash {
    border-radius: 8px;
    background-color: rgb(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 16px;
    padding: 8px 16px;
    font-size: 32px;
  }

  .is-hidden {
    display: none;
  }

  .no-result {
    font-size: 32px;
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

<svelte:options immutable />

{#if currentEmoji}
  <div class="flash">{currentEmoji} copied</div>
{/if}

<div class="app">
  <div class="filter">
    <input
      bind:this={searchRef}
      bind:value={filter}
      type="search"
      placeholder="search for emoji by the keyword" />
  </div>
  <div class="content">
    <div class="emojis">
      {#each emojis as emoji (emoji.char)}
        <div
          class="emoji"
          class:is-hidden={!visible.has(emoji.char)}
          title="Copy to Clipboard"
          data-clipboard-text={emoji.char}
          on:click={() => emojiClick(emoji.char)}>
          {emoji.char}
        </div>
      {/each}
    </div>

    {#if visible.size === 0}
      <div class="no-result">
        Nothing found for the query
        <b>"{filter.trim()}"</b>
      </div>
    {/if}
  </div>

  <footer>
    <a
      href="https://github.com/valeriivasin/emoji-search-svelte"
      class="footer-link"
      target="_blank"
      rel="noopener">
      Github
    </a>
    <a
      href="https://emoji.muan.co"
      class="footer-link"
      target="_blank"
      rel="noopener">
      Original Source
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
