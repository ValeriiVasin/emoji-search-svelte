# Netlify production followed the retired branch

Date: 2026-11-02. Status: production branch/build settings corrected; initial publish verified.

## Evidence

After PR #944 merged as `3b8f907`, GitHub CI passed but the public site continued serving the old Rollup `build/bundle.js` page. A ten-minute public check and an uncached request found no new static assets. Authenticated Netlify settings showed automatic publishing still followed `master`, with publish directory `public` and a Node 10 fallback. The last published deploy was from June 2022. The repository's current branch is `main`, and the SvelteKit static adapter writes `build/`.

## Smallest outcome and fix

Restore the existing GitHub-to-Netlify integration for this project: deploy reviewed changes from `main` to the same public URL. Set the production branch to `main`, build command to `pnpm run build` and publish directory to `build`. Remove the obsolete Node 10 fallback; `.nvmrc` remains authoritative for the actual Node 26 build. Commit the build command and output directory in `netlify.toml` so the code and host configuration agree. No new host, deployment service or credential is required.

The dependency audit found seven direct packages at registry-latest. TypeScript 7.0.2 failed the build because current SvelteKit requires the TypeScript 6 compiler API and peer range ^6.0.0. Retain 6.0.3, the latest compatible version, with eight development dependencies and no direct runtime dependencies.

Production smoke testing also exposed a very early mobile tap before hydration attached handlers. Search-launcher and emoji actions stay disabled until mount connects them. A delayed-entry-script regression verifies initial disabled states and a successful first tap after hydration.

## Verification

Require CI for the follow-up change, observe a Git-triggered Netlify deploy for its exact merged SHA, compare the published CSS with the reviewed build, and smoke-test production search, copying, categories and URL restoration. Physical keyboard animation remains a manual-device limitation.
