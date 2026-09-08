# TASK-P2-3A — the D2 gate (P2-3 stage 1)

Draft PR **https://github.com/show-karma/gap-app-v2/pull/2098** -> `feat/instant-navigations`
Branch `feat/public-loaders-no-auth` @ `0bf43a6ad`, off `35a488ef0`.

**P2-3 stage 1 — the D2 gate. No `"use cache"` here; that is stage 2, at the flip.**

## Why

`utilities/api/client.ts:165` defaults `isAuthorized` to `true`, so every server-side
`api.get()` calls `TokenManager.getToken()` → `getServerToken()` → a *dynamic*
`import("next/headers")` → `cookies()`. The dynamic import is why a static grep for
`next/headers` importers never found it.

That costs twice on the four loaders behind the crawlable routes:

1. It is a request read, so the route can never be prerendered — "uncached or runtime data
   during prerendering", the reason the community, project, projects and funding-map routes
   cannot go Cache-class.
2. Once those payloads are cached, a response built with somebody's token would be served to
   everyone. That is the cache-poisoning line the plan draws.

## What changed

A new `utilities/api/public-read.ts` exporting `publicReadOptions()`: authorized on the
client, never on the server. Applied to the reads a crawlable route reaches in
`projects-explorer.service.ts`, `project.service.ts`, `funding-programs.service.ts` and
`getCommunityData.ts`.

`checkSlugExists` is deliberately untouched — a client-side polling loop during project
creation, never a render path. A test pins that it was not swept up.

The precedent is `services/project-grants.service.ts`, which has passed `isAuthorized: false`
on the public project-profile SSR path since #1571 for exactly this reason.

## The gate

Three layers, none of which needs the network at test time.

### 1. The indexer's auth posture, pinned per endpoint

`__tests__/fixtures/d2/indexer-auth-posture.json`, recorded from the gap-indexer route
definitions with `.phase2/scan-indexer-auth.py`.

| Endpoint | Posture |
|---|---|
| `/v2/projects` | PUBLIC |
| `/v2/projects/:identifier` | PUBLIC |
| `/v2/communities/:uidOrSlug` | PUBLIC |
| `/v2/communities/:slug/stats` | PUBLIC |
| `/v2/communities/:slug/projects` | PUBLIC |
| `/v2/program-registry/search` | optionalAuthentication |
| `/v2/program-registry/:programId` | optionalAuthentication |

**Five of the seven have no auth preHandler at all.** The route never reads the
`Authorization` header, so dropping it cannot change a byte — a proof, not a sample.

### 2. The two that can differ, and by exactly how much

`optionalAuthentication` on the program-registry pair adds **three fields**, and only for a
**staff** address (`authorizationService.isStaff`); a non-staff session changes nothing:

- `metadata.ingestionSource`
- `metadata.ingestionRunId`
- `metadata.rawData`

Source: `program-registry.read.controller.ts` `resolveIsStaff()` →
`program-registry.api.mapper.ts` `mapMetadataToApiResponse(metadata, includeAdminFields)`.

Both consumers of those fields fetch on the **client** and keep their token:

- `components/Pages/ProgramRegistry/ProgramDetailsDialog.tsx` on
  `/funding-map/manage-programs` — a `"use client"` component with its own `useQuery`, never
  the server prefetch.
- `src/features/funding-map/components/funding-program-details-dialog.tsx` on `/funding-map`
  — does not read the staff-only fields at all.

So nothing regresses for staff, and the server payload is provably staff-free, which is what
makes it cacheable in stage 2.

### 3. Recorded against the staging indexer

`__tests__/fixtures/d2/public-payload-parity.json`, recorded from
`https://gapstagapi.karmahq.xyz`: all seven endpoints answer **200 with a populated public
payload and no credential** (12–64 key paths each, pinned).

### What this does not cover — the one human-gated step

A live diff against a real **staff** session. That needs a staging Privy JWT, which no agent
here can obtain. Layer 2 pins what such a session would add (three ingestion-provenance
fields, `isStaff`-gated) and proves both consumers are client-side, which I believe closes
the risk on its own — but if you want the empirical leg, it is one command.

> **For whoever has a staging login — run this from the repo root on
> `feat/public-loaders-no-auth`:**
>
> ```bash
> INDEXER_TOKEN=<staging privy jwt> node scripts/record-d2-parity.mjs
> ```
>
> It hits every endpoint twice, with and without the header, and writes
> `__tests__/fixtures/d2/public-payload-parity.raw.json` with a per-endpoint verdict:
> `IDENTICAL`, or `DIFFERS: +N auth-only keys` plus the exact key paths. What we expect for a
> **non-staff** account is `IDENTICAL` on all seven; for a **staff** account, `IDENTICAL` on
> five and `+3 auth-only keys` on the two `program-registry` endpoints —
> `metadata.ingestionSource`, `metadata.ingestionRunId`, `metadata.rawData`. Anything else is
> a finding and should stop stage 2.
>
> The token is only read from the environment and is never written into the fixture. The
> recorder and the command are committed (`scripts/record-d2-parity.mjs`, commit `0bf43a6ad`),
> so this does not depend on my scratch clone.

The posture half of the evidence (`__tests__/fixtures/d2/indexer-auth-posture.json`) was read
from the gap-indexer route definitions; `scripts/scan-indexer-auth.py <path-to-gap-indexer>`
regenerates the survey it came from.

## Tests

- `__tests__/utilities/api/public-read.test.ts` — `publicReadOptions()` semantics, the
  posture fixture (fails if the indexer ever adds auth to one of the five public routes, or
  widens the staff-only field list), and the recorded payloads.
- `__tests__/utilities/api/public-loaders-no-auth.test.ts` — all seven reads send
  `isAuthorized: false` server-side and `true` client-side, plus the `checkSlugExists`
  carve-out. 15 cases.

`tsc` clean, `biome` clean on the 7 touched files, and the six SSR suites that exercise these
loaders pass unchanged (41 tests).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DuBL2m3rfvbqHEPTrsb2p9
