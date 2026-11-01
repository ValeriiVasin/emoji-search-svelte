# Fast emoji search

Problem: the old page hydrates 1,914 buttons and changes each button on every keystroke. Local production measurements showed occasional multi-hundred-millisecond frame delays even though filtering itself took only 2–3 ms.

Outcome: a small prerendered first screen, minimal search-first mobile layout, neutral system light/dark themes, current Unicode emoji and emojilib keywords, immediate filtering and actual clipboard copying. Search, category and results page survive refresh and copied URLs. Typing replaces history; discrete navigation uses links.

Design: retain Svelte 5 and static SvelteKit output, render at most 72 results per page, split the full generated catalog out of the first-screen bundle, and use native emoji/system fonts and plain CSS. Generate the committed catalog from pinned Unicode data and installed emojilib; no runtime data service. Place an initially focused search at the top; omit hero sections, decorative branding and slogans. Keep search available while scrolling.

Non-goals: deployment before user acceptance, repository rename, framework removal, external emoji artwork/fonts, accounts, analytics and new runtime dependencies. Native glyph availability depends on the OS; names remain available for newer emoji.

Verification: production E2E covers search, shared URLs, Back/Forward, pagination, clipboard and mobile layout. Compare input-to-frame timing with the existing production baseline and record transferred bundle sizes.

## Verified locally, 2026-11-01

Renderer comparison before the final UI simplification: Node 26.7.0; production static build; Chromium at 1280×900. A fixed sequence of nine search/clear inputs was repeated four times, with the catalog warmed, alternating old/new/new/old. This is a synthetic double-requestAnimationFrame measurement, not field INP or a promise for every device.

| Metric | Previous production baseline | Optimized search |
| --- | --- | --- |
| Rendered emoji buttons at rest | 1,914 | 72 |
| Median input handler | 2.4 ms | 0.2 ms |
| p95 to two animation frames, final pair | 100.1 ms | 34.4 ms |

Initial resources total approximately **44.0 KB gzip** (HTML, CSS and JavaScript combined, computed from response bodies). The deferred catalog adds approximately **77 KB gzip**; it is not needed to render the first screen. Compression sizes are estimates for hosting; local Vite preview serves uncompressed resources.

All seven production Playwright tests pass. Additional browser QA found no page errors at desktop/light or touch/mobile/dark (390×844, DPR 2); the mobile page width matched the viewport and focused search immediately on load. The first emoji row starts at 153 px on mobile; tests enforce a maximum of 200 px at 320 px viewport width. The standard first screen renders with JavaScript disabled. Unicode 18 additions remain searchable; familiar earlier glyphs lead the default collection to reduce missing-glyph boxes on older systems.

The compact Berlin signature shares the results metadata row. Final touch/mobile/dark QA (390×844) shows 66 complete emoji buttons without scrolling, focused search, no horizontal overflow and no page errors.
