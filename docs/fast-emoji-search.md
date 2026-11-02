# Fast emoji search

Problem: the old page hydrates 1,914 buttons and changes each button on every keystroke. Local production measurements showed occasional multi-hundred-millisecond frame delays even though filtering itself took only 2–3 ms.

Outcome: a small prerendered first screen, minimal search-first mobile layout, neutral system light/dark themes, current Unicode emoji and emojilib keywords, immediate filtering and actual clipboard copying. Search, category and scroll position survive refresh and copied URLs. Typing replaces history; discrete navigation uses links.

Design: retain Svelte 5 and static SvelteKit output, prerender 72 emoji and render a sliding window of visible rows plus two buffer rows on each side, sized via ResizeObserver and the visual viewport, split the full generated catalog out of the first-screen bundle, and use native emoji/system fonts and plain CSS. Generate the committed catalog from pinned Unicode data and installed emojilib; no runtime data service. On desktop, place an initially focused search at the top; on mobile, reveal a top search field from a top-right button only after a tap; omit hero sections and slogans; a compact mobile home mark shares the existing collapsed toolbar. Hide categories by default behind Categories. Persist exploration mode in the URL (`browse=1`); keep every category visible when expanded, without a horizontal scroller. Closing exploration clears its category filter. Keep search and categories in one non-overlapping toolbar region; only results scroll.

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

Production Playwright checks cover the implemented behavior. Additional browser QA found no page errors at desktop/light or touch/mobile/dark (390×844, DPR 2); the mobile page width matched the viewport and left mobile search unfocused on load. All ten category labels are visible without horizontal scrolling when exploration is expanded. Tests enforce a first emoji row within 200 px at 320 px viewport width and verify that category links are not covered by another element. The standard first screen renders with JavaScript disabled. Unicode 18 additions remain searchable; familiar earlier glyphs lead the default collection to reduce missing-glyph boxes on older systems.

The compact Berlin signature shares the results metadata row. Production checks cover resizing to 320×400, visible category labels and an unclipped result region.

## Progressive browsing

Pagination is removed. Only the result region scrolls; search, exploration control and the Berlin signature remain visible. Rows outside the viewport and its small buffer are unmounted. This avoids recreating the original thousands-of-buttons DOM while allowing continuous exploration of the complete catalog. The `at` query parameter stores a validated emoji index, replaced after scrolling settles; refresh restores its row. Search/category changes reset it to the top. No new runtime dependency is used.

Production E2E covers scrolling to the final catalog entry, returning to the top, a shared scroll-position refresh, DOM remaining below 200 buttons at the desktop test viewport, filter reset, clipboard and mobile layouts. The mobile result region remains within 320×400 without introducing a page-wide scrollbar; the emoji list itself is scrollable.

## Initial viewport fill

The original 72-record preview and 1.2-second catalog timer left 408 px of blank space at 1440×1000 when the full catalog was delayed. Keep 72 prerendered buttons, provide 384 lightweight preview records (no keyword index), and start the separate catalog import on mount. The virtual window can fill the viewport immediately without mounting the entire preview. The new regression delays the catalog response and verifies that no full blank row remains beneath the initial grid, then releases the response and verifies the complete scroll range. It fails before the fix and passes afterward.

## Desktop and mobile search

Desktop retains the top field with autofocus. Narrow and touch-only devices start with a top-right search button and no input focus. Tapping reveals a top field and a separate circular close button without changing toolbar height or moving the grid. The field stays mounted so the tap can reveal it and focus synchronously using Svelte flushSync. Closing keeps the query visible in the same toolbar. Search/close buttons grow and change background while pressed; emoji also have press feedback. Motion respects the system preference. Touch-only landscape retains the same mobile control.

Evidence: bottom-positioned search moved away from the keyboard after focus, blur, then focus on the user's iPhone. A deterministic viewport simulation exposed the missing visualViewport offset/scroll handling. The simpler replacement keeps the search at the top, locks document scrolling and uses the visual viewport for app height and position; only results scroll. Keyboard-driven height changes no longer change emoji cell height. See [the incident note](incidents/2026-11-01-mobile-search-viewport.md).

The production touch checks cover no initial input focus, tap-to-open focus, query preservation, explicit close/Escape, clipboard copying without losing focus, short-viewport layout and landscape. The viewport regression repeats focus/blur with different simulated keyboard heights and panning offsets. Simulation verifies geometry and focus handling; native iPhone keyboard animation remains a manual device-check limitation.

While mobile search is open, primary pointer taps outside the input and close button prevent the default focus transfer. This keeps the keyboard stable without forcing focus back after blur. Emoji copying and category navigation stay usable; category links disable SvelteKit focus reset for this mode. The close button and keyboard Escape explicitly cancel search.

## Copy feedback with a mobile keyboard

Problem and evidence: the copy toast was a body-level fixed element anchored to the layout viewport bottom, outside the shell that follows visualViewport. A mobile keyboard can cover it even while the search and results fit the visible viewport.

Outcome: copying has a compact, readable confirmation that stays visible with the keyboard, preserves input focus and does not move or cover results. Reuse the existing metadata row directly below search: temporarily replace the Berlin signature with a small emoji and “copied” status, then restore the signature after the existing timeout. Show “Copy unavailable” on failure. Keep the existing emoji highlight. A persistent polite, atomic status region announces updates without focus transfer.

Non-goals: a new notification service, extra rows, keyboard detection, a floating overlay or another viewport-positioning mechanism. Extend the existing viewport regression to verify status visibility above results, stable row position and retained search focus during keyboard-sized and panned viewports.

Actual clipboard contents and continuous typing are verified in the Chromium touch test. The WebKit viewport test requires real tap activation and visible copy feedback as well as retained focus. Cancelling pointerdown suppressed tap activation in WebKit; focus preservation now cancels only the default mousedown focus transfer. Accessibility reference: [W3C role=status guidance](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html).

## Category controls

Problem: the small Browse/Hide link and font-rendered arrows were hard to recognize as one disclosure control. The underline-based category strip looked like another primary navigation bar.

Outcome: keep exploration secondary while making the entry and selected category legible in both themes at 320px. Use a constant Categories label in a compact outlined control, a single SVG chevron that rotates with aria-expanded, and quiet rounded category selections. Keep the 44px hit areas and existing row heights, shareable browse/group URLs, real links, focus preservation and closed-by-default behavior. No mode switch, overlay, new dependency or animated layout is needed. Existing navigation, theme and mobile geometry checks are sufficient; update their label selectors without adding tests.

Production startup: keep JavaScript-only launcher/copy actions disabled until hydration connects their handlers. A delayed-entry-script regression protects the first tap from being lost; the static emoji preview remains visible.

## Compact mobile identity

Problem: the collapsed mobile search toolbar leaves an empty area above the collection. The user requested the earlier peace-hand motif as a small SVG home mark. Keep the existing 52px toolbar and all result space; the logo disappears underneath expanded search, without moving content. A current query remains visible beside it. Clicking the real home link clears search/category/browse/scroll URL state, returns the collection to the top and leaves the mobile keyboard closed. Back restores the previous context.

Use a single inline SVG asset with a warm yellow hand and bold lettering filled with sunset-to-sea waves, as requested in the user’s visual reference. Omit the sparkle that read as a plus sign. Keep the mark readable in both system themes. No hero, slogan, external font, image request or dependency. Verify reset/navigation and narrow-screen geometry using the existing production test setup; SVG paths themselves need no separate tests.
