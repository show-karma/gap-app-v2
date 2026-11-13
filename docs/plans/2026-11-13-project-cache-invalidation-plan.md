# 2026-11-13 — Project page cache invalidation (FE + BE)

## Summary

Public project pages are cached by `"use cache"` loaders (`services/project.cached.ts`). Until now the
cache refreshed every 60 seconds, because nothing told the app when a project changed: every edit is
written by gap-indexer (on-chain attestations indexed by it, or its REST endpoints), never by this app.
Most project pages are visited every day or two, so nearly every visit rebuilt and re-stored the page,
which is a large share of the Vercel ISR write bill.

This adds the missing signal. gap-indexer sends a signed notice to the app after every write to a
project or one of its grants, and the app expires that project's cache entries immediately. With
that in place the project pages can revalidate once a day, and an edit still shows on the next
request.

Two earlier, previously unpushed commits are part of the branch because the change does nothing
without them:

- the root layout's render clock (cached for one minute) capped every route at revalidate 60 s /
  expire 1 h. It moves to the community layout, the only subtree that judges deadlines with it;
- page output is made byte-identical across regenerations, so a background revalidation that finds
  nothing changed is not stored again.

## User flows

Each flow: an edit lands in the indexer → the indexer notifies the app → the next request for the
project page, by uid or by slug, shows the change.

1. **Owner edits project details** (title, description, links, logo) via `ProjectDialog` → `Project`/
   `ProjectDetails` attestation → `ProjectRepository.update` → notice → `/project/<slug>` shows the new
   title on the next request.
2. **Owner posts a project update, impact or milestone** → `ProjectUpdate`/`ProjectImpact`/
   `ProjectMilestone` attestation → embedded in `projects.*` → `ProjectRepository.update` → notice → the
   Updates and Impact tabs show it.
3. **Grantee adds a grant update or completes a milestone; a reviewer verifies it** →
   `GrantUpdate`/`Milestone`/`MilestoneStatus`/`GrantCompleted` → `GrantRepository.update` or
   `addMilestoneAtomically` → notice with the grant's `projectUID` → the Funding tab and
   `/funding/<grantUid>` show it. Covers reviewers working from community admin screens.
4. **Revocations and deletions** (delete an update, a milestone, a grant, remove a member, revoke an
   endorsement) → `GrantRepository.delete`/`ProjectRepository.update`/`delete` → notice → gone on the next
   request.
5. **Slug change and project merge** → the project's entries are tagged with its uid as well as the slug
   the route used, so the notice by uid expires the old-slug entries too; they then redirect to the new
   slug. A merge notifies the surviving project; a grant moved between projects notifies both.
6. **Failure: the app is unreachable or answers 5xx** → the indexer retries after 2 s and 10 s, then
   reports to Sentry. The page refreshes when its revalidate (one day) runs out.
7. **Failure: forged, replayed or malformed notice** → 401 (no or bad signature, older than five
   minutes), 400 (not a list of ≤ 100 project uids), 413 (body over 16 KB). Nothing expires.
8. **Failure: no secret configured** (local development, preview deployments) → the indexer sends
   nothing and the app refuses every notice; pages refresh on their lifetime alone.

## Production reality

| Assumption | Verified by |
|---|---|
| Every runtime write to the data behind project pages goes through `ProjectRepository` or `GrantRepository` in gap-indexer | gap-indexer grep of `.(projects\|grants).(create\|update\|upsert\|delete\|updateMany\|deleteMany\|createMany)(` and `$runCommandRaw` outside `scripts/`: only `project.repository.ts` (create, update, delete, mergeProjectCollections, addPointerAtomically) and `grant.repository.ts` (create, update, addMilestoneAtomically, delete, deleteByProjectUID, updateProjectUIDAndOriginal). `project-merge-references.repository.ts` rewrites other collections only |
| Project members, endorsements, milestones, impacts and updates are embedded in `projects`; grant milestones and updates in `grants`, keyed by `projectUID` | gap-indexer `prisma/schema.prisma`, models `projects` and `grants` |
| The four reads behind project pages hit MongoDB, not the indexer's Redis response cache | gap-indexer `app/modules/hooks/on-request.ts` serves Redis only for `?cache=true`; none of `services/project.service.ts`, `project-grants.service.ts`, `project-impacts.service.ts`, `project-updates.service.ts` sends it |
| `/projects/:id/impacts` (v1) reads the `attestation` collection | gap-indexer `Project.controller.getProjectImpacts`. Impact attestations are inserted before the v2 processor writes `projects.impacts`, so the notice always follows the data |
| The indexer knows the app's origin per environment | gap-indexer `app/config/domain.config.ts` `APP_ORIGIN` (`APP_HOST`, default `www.karmahq.org` in production, `staging.karmahq.org` otherwise) |
| `/api/*` is not rewritten or blocked by `proxy.ts` | `proxy.ts` matcher excludes `/api` |
| staging and production accept unauthenticated requests on `/api/*` (no Vercel deployment protection in front) | `GET https://staging.karmahq.org/api/geo` and `https://www.karmahq.org/api/geo` → 200 JSON, 2026-11-13 |
| A webhook must expire with `revalidateTag(tag, { expire: 0 })` | Next 16.4 docs, `revalidateTag`: `updateTag` is Server Actions only; `"max"` would serve the old page once more |
| An inner `"use cache"` with a shorter life does not shorten an outer one that calls `cacheLife` | Next 16.4 docs, `cacheLife` → "Nested caching behavior" |
| Project routes' lifetime after this change | `next build` route table (see Smoke results) |
| `getProject`, `getProjectGrants`, `getProjectImpacts` returned an empty result on any error, which a cache would store | read in `services/*.service.ts`; the cached loaders now pass `rethrow: true` |
| Vercel's ISR cache is per deployment | Vercel docs; a deploy still starts every page cold |

## Wire contract

| gap-indexer sends | Transport | gap-app-v2 reads |
|---|---|---|
| `POST ${APP_ORIGIN}/api/cache/projects/revalidate` | HTTPS, 5 s timeout | `app/api/cache/projects/revalidate/route.ts` `POST` |
| `content-type: application/json`, body `{"projects":[{"uid":"0x…64 hex"}]}`, uids lower-cased, ≤ 100 | as-is | `projectRevalidationNoticeSchema` (`src/domain/cache/project-revalidation.ts`); body ≤ 16 KB |
| `x-karma-signature: t=<unix s>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>` | as-is | `isValidProjectRevalidationSignature`, ±300 s, constant-time compare |
| `PROJECT_CACHE_REVALIDATION_SECRET` (gap-indexer env, ≥ 32 chars) | out of band | `PROJECT_CACHE_REVALIDATION_SECRET` (gap-app-v2 server env) |
| retries on network error or non-2xx: after 2 s, then 10 s; then Sentry warning | | 200 `{ok, revalidated}`; 401/400/413 are final; 500 means retry |

Both sides pin the same signature test vector: secret `secret`, `t=1700000000`, body `{}` →
`b8569b78799ff9e3cbff0fc2d63a33a2b57f3282abd07c37ae5e8e7d79a5f163`.

## Architecture

### gap-indexer

- `app/modules/v2/external/frontend-cache/`: `IProjectCacheInvalidator`, `FrontendProjectCacheInvalidator`
  (collects uids for 1 s, sends them in batches of ≤ 100, signs, retries, reports; never throws),
  `NoopProjectCacheInvalidator`, and a per-process factory.
- `ProjectRepository` and `GrantRepository` take an optional `cacheInvalidator` and call it after each
  successful write listed above. Existing `new …Repository()` call sites keep working.
- `PROJECT_CACHE_REVALIDATION_SECRET` in `app/config/env.ts`, `config.projectCacheRevalidation`, `.env-example`.

### gap-app-v2

- `app/api/cache/projects/revalidate/route.ts`, `src/domain/cache/project-revalidation.ts`.
- `services/project.cached.ts`: every entry tagged with routed id, uid and slug; entries whose project
  cannot be identified keep the `"minutes"` life; loaders ask the reads to throw on failure.
- `projectTag` lower-cases its id.
- `PROJECT_PAGE_CACHE_LIFE`: revalidate one day, expire one week (separate commit, see Rollout).

## Tests

- gap-indexer unit: invalidator (batching, dedupe, signing, bounded batches, retries, Sentry, never
  throws), factory, every repository write notifies the right project and a failed write does not.
- gap-app-v2 unit: signature (shared vector, wrong secret, tampered body, replay window, malformed
  headers), notice schema, route (200 with `{ expire: 0 }` per uid, dedupe, 401 ×4, 400 ×2, 413, 500),
  loader tags and lifetimes, `rethrow` on the three reads.
- E2E on a shared preview: see the gate.

## Rollout

1. Merge the app side with revalidate still 60 s (everything but the last commit). Harmless alone: the
   route refuses notices until the secret exists.
2. Set `PROJECT_CACHE_REVALIDATION_SECRET` to the same value in gap-app-v2 (Vercel, staging and
   production) and gap-indexer (staging and production). Someone with access to those secrets does this.
3. Deploy gap-indexer to staging; walk flows 1–5 and 7 on staging; watch Sentry for flow 6.
4. Production for both, then merge the revalidate-one-day commit.

Rolling back: revert the last commit (pages go back to 60 s); unsetting the secret stops the notices.

## Smoke verification gate

- [ ] FE and BE branches deployed to the same environment (staging)
- [ ] Flows 1–5 walked end-to-end, by slug and by uid
- [ ] Failure paths 6 and 7 verified
- [ ] Smoke results in both PR descriptions

## Local evidence (not the gate)

Production build of this branch, `next start`, reading the production indexer, test secret, 2026-11-13:

- Route table: project routes' build-time shells went from `1m / 1h` (main) to `30d / 1y`. The per-URL
  entry is what matters: `/project/tally` answers `Cache-Control: s-maxage=86400,
  stale-while-revalidate=518400` (one day, then a week), and its second request is a `HIT`.
- Notice signed with a wrong secret → 401; signed an hour ago → 401; the page stays `HIT`.
- Valid notice for Tally's uid, sent upper-cased → 200 `{revalidated: 1}`; the next `/project/tally`
  request renders fresh (no `x-nextjs-cache`), the one after is `HIT` again; `/project/gitcoin` stays
  `HIT` throughout. `/project/<uid>` is a 308 to the slug, so the slug's entry is the page.

## Out of scope / deferred

- Community pages, the projects explorer and the funding map keep their current lifetimes.
- Changes that do not go through the two repositories: a community's name or logo shown on grant cards,
  member profiles, one-off scripts under `gap-indexer/app/modules/scripts/`. They reach the page within
  the one-day revalidate.
- Preview deployments get no notices (no secret there).
- Notices pending in the indexer's one-second window are lost if the process stops; the page then
  refreshes within a day.

## Open questions

- Who sets the secret in Vercel and in the indexer's hosting.
