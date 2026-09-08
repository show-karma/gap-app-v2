# TASK 2B — PR #2089 Vercel deployment failure — ROOT-CAUSED AND FIXED

**PR:** https://github.com/show-karma/gap-app-v2/pull/2089 (left OPEN, not merged, per instruction)
**Vercel check: PASS** as of commit `9456b60e7`.

- Failed deployment: `dpl_AxmFT5Lh1p84W7NgERhbE2zrDr62` (commit `634df4db2`) — state ERROR
- Passing deployment: `dpl_BUZvkNPcNLuEUbFYaiWdHARUL4Wh` (commit `9456b60e7`) — `Build Completed in /vercel/output [3m]`

Vercel was treated as strictly read-only: diagnosis used the Vercel connector's
`get_deployment` / `list_deployments` / `get_deployment_build_logs` only. No deploy,
redeploy, promote, rollback, env var, domain, or project-setting change. The new build was
triggered by a normal `git push` to the PR branch via Vercel's GitHub integration, not
from the CLI.

## It was NOT the 8 GB container, and NOT the release-age guard

Both ruled out from the failing build's own log:

- **Machine:** `Build machine configuration: 8 cores, 16 GB` (Enhanced Build Machine, iad1).
  Not the 8 GB class.
- **Timing/exit:** `Build failed with exit 1 after 193s`, against `vercel-build.sh`'s 480 s
  ceiling. Exit 1, not the 124/137 that `vercel-build.sh` maps to timeout/OOM. It also died
  *after* generating all 104 static pages, which a memory kill would not have reached.
- **Install:** `Lockfile is up to date, resolution step is skipped`, then `Packages: +3429`.
  The 60-day `minimum-release-age` guard never ran, exactly as predicted in TASK2.

## Exact failing step

```
18:05:28  ✓ Generating static pages using 7 workers (104/104) in 1270ms
18:05:28    Finalizing page optimization ...
18:05:29    Running onBuildComplete from Vercel
18:05:32  > Build error occurred
18:05:32  Error: ENOENT: no such file or directory, open '/vercel/path0/.next/next-server.js.nft.json'
18:05:32      errno: -2, code: 'ENOENT', syscall: 'open',
18:05:32      path: '/vercel/path0/.next/next-server.js.nft.json'
18:05:33   ELIFECYCLE  Command failed with exit code 1.
18:05:33  Error: Command "bash vercel-build.sh" exited with 1
```

Note Vercel's own `onBuildComplete` adapter hook ran to completion first — its Lambda
outputs were already built. The throw is Next's own standalone assembly afterwards.

## Root cause — three links, all verified in the installed 16.3.3 source

1. `.next/next-server.js.nft.json` is written by `collectBuildTraces`
   (`next/dist/build/collect-build-traces.js:139`).
2. `next build` **skips `collectBuildTraces` whenever the bundler is Turbopack** —
   `next/dist/build/index.js`, `#region NFT`, gated `bundler !== Bundler.Turbopack`.
   I extracted 16.2.6 from npm and diffed: **this gate is byte-identical in 16.2.6**, so the
   gate is not itself the regression — under 16.2.6 the file still ended up present on
   Vercel, under 16.3.3 it does not.
3. The standalone copy step opens that exact path unconditionally — `copyTracedFiles`,
   `next/dist/build/utils.js:1106` — and `build/index.js:2815` only reaches it under
   `if (config.output === 'standalone')`.

So `output: "standalone"` is the switch that turns a missing trace file into a failed build.

## Fix (inside the PR's scope — one `next.config.ts` change)

`output: "standalone"` is now set everywhere **except** on Vercel:

```ts
...(process.env.VERCEL ? {} : { output: "standalone" as const }),
```

This is not a workaround so much as removing waste: Vercel ignores standalone output
entirely (it serves the Lambda format its adapter produced one step earlier — the repo's
own pre-existing comment already said "Vercel ignores this setting"), so building that
bundle on the preview container was always pure cost on the container the team watches.

`.npmrc` was not touched, as instructed.

## Verification — both directions, on this PR's own CI run

- **Vercel:** deployment passes. `Build Completed in /vercel/output [3m]`, and the
  deployment now reports `lambdaRuntimeStats {"nodejs":6}` — matching the green 16.2.6
  previews, and absent from the failed one.
- **GitHub Actions:** `VERCEL` is unset there, so the bundle is still produced. The `build`
  job **passed**, and that job runs `cp -r public .next/standalone/` and packs
  `next-build.tar.zst` (qa-pipeline.yml:492-508) — it could not have passed without
  `.next/standalone`. Nightly E2E contract intact.
- Local `pnpm typecheck` green; pre-commit (tsc + biome lint-staged + design:check) green.

## Remaining reds on the PR

`qa-plan`, `verdict`, `qa-pipeline` — the known OAuth reds, ignored per instruction.
Everything else is green (build, smoke, all 6 test shards, quality-gate, static-checks,
review-gate, CodeRabbit, react-doctor, baseline-guard, checklist).

## Still open from TASK2 (unchanged, still needs your call)

`.npmrc` `minimum-release-age=86400` is 60 days, so no 16.3.x is mature until 2026-10-02
(16.3.0) / 2026-10-24 (16.3.3). Lockfile was resolved with the guard overridden once;
`.npmrc` untouched; CI/Vercel/daily installs verified unaffected. Options: (a) merge as is,
(b) hold for 16.3.0, (c) exclude `next` and `@next/*` from the guard.
