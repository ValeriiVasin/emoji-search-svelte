# Mobile search moves away from the keyboard

Date: 2026-11-01. Status: local mitigation, pending physical iPhone acceptance. Scope: follow-up [PR #944](https://github.com/ValeriiVasin/emoji-search-svelte/pull/944); no public deployment.

## Evidence and cause

The user supplied an iPhone screenshot and reproduction: focus the mobile search field, blur it, then focus again. The bottom search field appeared far above the keyboard, leaving a large empty area. The app sized its shell from visualViewport.height but ignored visualViewport.offsetTop and scroll events. A deterministic test that changes the viewport height and then pans it by 170 pixels reproduced a 170-pixel alignment error before the correction. This establishes a geometry defect, but does not reproduce the physical keyboard itself.

## Smallest outcome and design

Keep search in the visible top toolbar across repeated focus cycles. Follow the user's reference: top-right search button, expanded field with a separate close button, no mobile autofocus, stable toolbar height and visible press feedback. Preserve desktop autofocus, query, clipboard behavior and windowed rendering. No new dependency, keyboard service or deployment is needed.

The shell now tracks viewport height, offset and both resize/scroll events. Document scrolling is locked; results remain independently scrollable. Emoji cell height no longer changes when keyboard height crosses a media breakpoint.

## Verification and remaining work

Production checks cover focus, clipboard, mobile layout, query preservation and viewport geometry. Chromium and WebKit run the repeated-focus regression with simulated viewport events. This cannot establish how a physical iPhone keyboard animates; manual acceptance remains required before merge or deployment.
