# Vercel frames — PR #2111 @ 0e6fc7010 (dpl 4jf6DvoeiYSktnoQVro2EUv3MZzW), 4 → 0 paths

**ZERO PATHS.** No failing prerender path remains on `feat/cache-loaders` @ `0e6fc7010`.
There is no frame table because there are no frames.

| Route | Frame (this build) | Fix |
|---|---|---|
| _(none)_ | — | — |

## How this was established — and how it was NOT

The Vercel build log itself was **not** read. The Proving Ground portal cannot reach it: the
deployment URL redirects to `https://vercel.com/login` (portal snapshot shows the Vercel login
form, not the build). The `vercel` CLI is unusable from the worktree by standing rule. That
escalation stands on its own and is reported separately.

The count is established instead by a **control experiment against the diagnostics**, which is
stronger than a log read because it does not depend on anyone's parsing:

1. **The premise that a green check hides failures is false.** `feature-spec` §0.1 assumes
   `experimental.prerenderEarlyExit: false` + `--debug-prerender` let a build enumerate failures
   and still go green. It does not. Those flags change *early-exit* into *enumerate-all*; they do
   not change *fail* into *pass*.
2. **Proof, from a build with the identical diagnostics:**
   `build-a402088ce.log` (local, `prerenderEarlyExit: false`, `--debug-prerender`) ends with
   `> Export encountered errors on 7 paths:` … `ELIFECYCLE Command failed with exit code 1` →
   `EXIT 1`. Seven failing paths, diagnostics fully on, and the build still **failed**.
3. **The build command preserves that exit code.** `vercel.json` → `"buildCommand": "bash
   vercel-build.sh"` → `timeout … pnpm build --debug-prerender`; `vercel-build.sh` exits 0 only
   when the build exits 0 and otherwise passes the code through.
4. **The deployment is a real build of this exact commit.** `gh pr view 2111` reports
   `headRefOid = 0e6fc701050c2e6211cdfba43b5ef7cde6991b49`. GitHub deployment `6253283669`
   (Preview, `2026-09-03T21:30:24Z`) for that SHA is `success`, and its preview URL serves a
   200 with 250 KB of HTML — so `vercel-ignore.sh` did not skip it.

A build that fails on ≥1 path exits non-zero (2), the exit code reaches Vercel (3), and Vercel
reports success on this SHA (4). Therefore the export encountered errors on **zero** paths.

## Corroboration

`build-round1.log` (local, same diagnostics, `EXIT 0`) contains **zero** occurrences of
`Error occurred prerendering` and no `Export encountered errors` line, against 7 and 1 in
`build-a402088ce.log`. It is corroboration only, not proof: it **predates** `6b885934a` and
`0e6fc7010`. Its `generateMetadata` frames still show
`getProjectGrants (services/project-grants.service.ts:40:12)` reached with a token, which is
exactly what `6b885934a` removed — at `0e6fc7010` that call site reads
`getProjectGrants(projectId, publicReadOptions())`.

## Warnings (routes still prerender)

`Failed to get JWT from cookies … HANGING_PROMISE_REJECTION` still appears in the local logs on
the five grant routes, reached from `generateMetadata`. At `0e6fc7010` that path is token-free,
so this warning is expected to be gone from the current build; it has **not** been observed on a
build of `0e6fc7010` and is recorded here as unconfirmed rather than cleared.

## Not a prerender frame, but blocking §1.3 — found while probing this deployment

Two of the three communities that previously failed to prerender now return **HTTP 500 at
runtime** on the flip preview, reproducibly (2 passes), while production returns 200:

| Route | preview @ `0e6fc7010` | production |
|---|---|---|
| `/community/arbitrum` | **500** (`x-matched-path: /500`) | 200 |
| `/community/celo` | **500** (`x-matched-path: /500`) | 200 |
| `/community/gitcoin` | 200, `h1` present, 339 KB | 200 |

The production baseline records `/community/arbitrum` at 200, 5414 visible chars, `h1`
"Arbitrum", 26 internal links. Whether this is flip-caused or preview-environment-specific is
**not determined here** — `gitcoin` working on the same deployment argues against a blanket
environment failure, but that is inference, not evidence. It is flagged for V-3, which is the
check designed to catch it.
