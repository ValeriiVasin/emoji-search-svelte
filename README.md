# Emojis Search

Simple emoji search application written in [SvelteKit](https://svelte.dev/docs/kit/introduction).

![App Demo](images/demo.gif)

## Development

Use Node.js 26 (see `.nvmrc`).

Install dependencies with `pnpm install`.

Start the app with `pnpm run dev`.

Build the static site with `pnpm run build`.

Preview the production build with `pnpm run preview`.

Run browser tests against the production build with `pnpm run build && pnpm test`.

## Emoji data and rendering

The first screen prerenders 72 emoji. After hydration, only the visible rows and a small buffer are mounted; scrolling progressively brings more emoji into view without growing the DOM to the whole catalog. The results region fits the viewport, including smaller mobile windows. Categories are hidden by default behind Browse categories; exploration mode is preserved in the URL. The full catalog loads separately after the first screen or immediately when interaction needs it. Search, category and the first visible row (`at`) are reflected in shareable URLs; typing and scrolling replace the current history entry. Themes follow the system setting.

The committed catalog combines [Unicode Emoji 18.0](https://www.unicode.org/Public/18.0.0/emoji/emoji-test.txt) with the latest emojilib keywords (currently 4.0.3). Update deliberately with `pnpm update emojilib --latest && pnpm run update:emojis`, inspect generated changes, then rebuild and test. Data generation needs network access; normal builds use committed data. emojilib is a build-time dependency and is not shipped to browsers.

Unicode data is covered by [the Unicode license](docs/UNICODE-LICENSE.txt); emojilib is MIT licensed. Native glyph appearance and availability depend on the device's OS. No external fonts, emoji images, analytics or runtime APIs are loaded.

See [rendering goals and verification](docs/fast-emoji-search.md).
