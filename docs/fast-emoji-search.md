# Fast emoji search

Problem: the old page hydrates 1,914 buttons and changes each button on every keystroke. Local production measurements showed occasional multi-hundred-millisecond frame delays even though filtering itself took only 2–3 ms.

Outcome: a small prerendered first screen, minimal search-first mobile layout, neutral system light/dark themes, current Unicode emoji and emojilib keywords, immediate filtering and actual clipboard copying. Search, category and scroll position survive refresh and copied URLs. Typing replaces history; discrete navigation uses links.

Design: retain Svelte 5 and static SvelteKit output, prerender 72 emoji and render a sliding window of visible rows plus two buffer rows on each side, sized via ResizeObserver and the visual viewport, split the full generated catalog out of the first-screen bundle, and use native emoji/system fonts and plain CSS. Generate the committed catalog from pinned Unicode data and installed emojilib; no runtime data service. Place an initially focused search at the top; omit hero sections, decorative branding and slogans. Hide categories by default behind Browse categories. Persist exploration mode in the URL (`browse=1`); keep every category visible when expanded, without a horizontal scroller. Closing exploration clears its category filter. Use normal document flow so the search cannot cover category labels on scroll.

Non-goals: deployment before user acceptance, repository rename, framework removal, external emoji artwork/fonts, accounts, analytics and new runtime dependencies. Native glyph availability depends on the OS; names remain available for newer emoji.

Verification: production E2E covers search, shared URLs, Back/Forward, progressive scrolling, clipboard and mobile layout. Compare input-to-frame timing with the existing production baseline and record transferred bundle sizes.

## Verified locally, 2026-11-01

Renderer comparison before the final UI simplification: Node 26.7.0; production static build; Chromium at 1280×900. A fixed sequence of nine search/clear inputs was repeated four times, with the catalog warmed, alternating old/new/new/old. This is a synthetic double-requestAnimationFrame measurement, not field INP or a promise for every device.

| Metric | Previous production baseline | Optimized search |
| --- | --- | --- |
| Rendered emoji buttons at rest | 1,914 | 72 |
| Median input handler | 2.4 ms | 0.2 ms |
| p95 to two animation frames, final pair | 100.1 ms | 34.4 ms |

Before viewport-aware pagination, measured initial resources total approximately **44.0 KB gzip** (HTML, CSS and JavaScript combined, computed from response bodies). The deferred catalog adds approximately **77 KB gzip**; it is not needed to render the first screen. Compression sizes are estimates for hosting; local Vite preview serves uncompressed resources.

All seven production Playwright tests pass. Additional browser QA found no page errors at desktop/light or touch/mobile/dark (390×844, DPR 2); the mobile page width matched the viewport and focused search immediately on load. All ten category labels are visible without horizontal scrolling when exploration is expanded. Tests enforce a first emoji row within 200 px at 320 px viewport width and verify that category links are not covered by another element. The standard first screen renders with JavaScript disabled. Unicode 18 additions remain searchable; familiar earlier glyphs lead the default collection to reduce missing-glyph boxes on older systems.

The compact Berlin signature shares the results metadata row. Viewport-fit browser QA at 390×700 shows 48 emoji in normal search mode and 36 with categories expanded, before the move to progressive scrolling, with pagination visible and no page scroll. Tests also cover resizing to 320×400 and ensure the last rendered emoji is not clipped.

## Progressive browsing

Pagination is removed. Only the result region scrolls; search, exploration control and the Berlin signature remain visible. Rows outside the viewport and its small buffer are unmounted. This avoids recreating the original thousands-of-buttons DOM while allowing continuous exploration of the complete catalog. The `at` query parameter stores a validated emoji index, replaced after scrolling settles; refresh restores its row. Search/category changes reset it to the top. No new runtime dependency is used.

Seven production E2E checks pass, including scrolling to the final catalog entry, returning to the top, a shared scroll-position refresh, DOM remaining below 200 buttons at the desktop test viewport, filter reset, clipboard and mobile layouts. The mobile result region remains within 320×400 without introducing a page-wide scrollbar; the emoji list itself is scrollable.
