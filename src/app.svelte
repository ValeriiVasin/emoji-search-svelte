<script>
  import { lib } from "emojilib";

  let list = Object.values(lib);
</script>

<style>
  .app {
    width: 1000px;
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
  }

  .emoji {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }
</style>

<div class="app">
  <div class="filter">
    <input type="search" placeholder="search for emoji by the keyword" />
  </div>
  <div class="list">
    {#each list as emoji}
      <div class="emoji">{emoji.char}</div>
    {/each}
  </div>
</div>
