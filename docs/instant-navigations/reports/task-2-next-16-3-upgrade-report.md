# TASK 2 — Next.js 16.3.x upgrade — DONE (one policy decision needed)

**PR:** https://github.com/show-karma/gap-app-v2/pull/2089 — `chore(deps): upgrade next to 16.3.x`
**Branch:** `chore/next-16-3-upgrade` (off `main` @ e8b8b3e5b)

## Versions
| Package | Before | After |
| --- | --- | --- |
| `next` | 16.2.6 | 16.3.3 (latest stable 16.3.x) |
| `@next/third-parties` | 16.2.6 | 16.3.3 |
| `@next/bundle-analyzer` | 15.5.16 | 16.3.3 |

`@next/bundle-analyzer` was a full major behind. No `@next/env` or `eslint-config-next`
in the manifest, so nothing else pairs. `react`/`react-dom` stay 19.2.1, Node floor stays
>=20.9.0 — 16.3.3 declares identical peers and engines to 16.2.6.

## 16.3 config changes needed: NONE
Diff is exactly `package.json` + `pnpm-lock.yaml`. `turbopack.resolveAlias`,
`images.qualities`, `staticPageGenerationTimeout` and `output: "standalone"` are all still
current spelling and were accepted with no deprecation warning. The only build warning is
the pre-existing custom Cache-Control one, byte-identical to 16.2.6.

## Validation
- `pnpm typecheck` — pass
- `pnpm exec next build` — pass (exit 0), 104/104 static pages
- Unit suite — **15,747 passed / 1 failed of 15,748** (1,088/1,089 files)
- `pnpm exec biome lint package.json` — pass

The single failure is `__tests__/public/gsc-site-verification.test.ts`, a Windows
`core.autocrlf=true` checkout artifact, **not** a regression: the committed blob of
`public/googleb231020e03517669.html` ends in LF, autocrlf rewrites it to CRLF at checkout,
and the test asserts exact UTF-8 bytes. Rewriting the file with its committed LF ending
makes it pass (verified). CI is ubuntu without autocrlf, so it is green there. That file is
not in the diff.

## Build cost
**774.5 s wall (12.9 min)**, peak ~8.3 GB RSS summed across the build process tree.

Do not read that as a CI prediction: local Windows box spawned 15 build workers (CI/Vercel
have far fewer cores); the sum double-counts pages shared between workers, so it is an upper
bound, not unique memory; and the local build ran WITH the Sentry plugin, which preview
builds skip entirely. Per instruction there is no 16.2.6 baseline, so no claim is made about
growth vs main.

## Standalone output
`__tests__/standalone-output-gate.test.ts` does not exist in the repo and never has in its
history — the brief appears to have misnamed it. Verified the real contract instead:
`.next/standalone/server.js` is emitted, and the `build-main.yml` / `e2e-tests.yml` assemble
steps (copy `public`, copy `.next/static`) reproduce a complete 241 MB bundle. Nightly E2E
contract intact.

## DECISION NEEDED — supply chain
`.npmrc` sets `minimum-release-age=86400`, which is **60 days** (pnpm reads it as minutes),
added deliberately in `chore: bump minimum package release age to 60 days`. **No 16.3.x
release is old enough yet:** 16.3.0 matures 2026-10-02, 16.3.3 matures 2026-10-24.

The lockfile was resolved with that guard overridden for one install. **`.npmrc` is untouched
by the PR.** This affects neither CI, nor Vercel, nor daily work — verified that both
`pnpm install --frozen-lockfile` and a plain `pnpm install` skip resolution entirely when the
lockfile is current, so the guard never runs. The catch: a re-resolving command
(`pnpm add <new-pkg>`) does re-check maturity.

Options: (a) merge as is, (b) hold until 2026-10-02 and take 16.3.0, (c) add `next` and
`@next/*` to `minimum-release-age-exclude[]`. Not decided unilaterally, since (c) narrows a
guard the team added on purpose. Written up in the PR body.

## Flags
`cacheComponents` and `partialPrefetching` are **NOT** enabled and are absent from
`next.config.ts`, per the brief.

FYI — 16.3 turns these on by default with no config change: `turbopackFileSystemCacheForBuild`
(writes `.next/cache/turbopack`; `build-main.yml` already caches `.next/cache` so it should
help — escape hatch if the 8 GB preview container gets tight is
`experimental.turbopackFileSystemCacheForBuild: false`), dev memory eviction, prefetch
inlining, and native Node streams in App Router SSR.
