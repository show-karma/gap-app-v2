# Vercel build log digest — PR #2108 @ 80847fd1c (dpl_BJp7rZp6cjKZ6BT51ihYwwB2S9cM)

Read by the Tech Leader via the Vercel connector (errors only). `Export encountered errors on 69 paths`
(paths, not unique routes — the project sample slugs `partido-misso`, `qa-bug-sweep-project-1752`,
`xyz` each count separately).

## Cleared since the previous flip build (822afcb7d, 75 failing)
- `blog`, `blog/[slug]`
- 25 of the 28 `community/[communityId]/manage/*` routes (all the non-nested ones — the ManageChromeBoundary
  from #2101 plus generateStaticParams on the community layout did their job)
- `community/[communityId]/programs` (listing), `applications/*`, `claim-funds`, `ask-karma`,
  `admin/kyc-settings`, `programs/[programId]/apply`

## Still failing — unique routes
**Dev #2's six (pending its metadata + debug-prerender push):**
`nonprofits/find-funders/{foundations,grants,nonprofits,search}/[id]`, `nonprofit-research/[reportId]`,
`nonprofit-research/personas/[handleId]`

**Cache-class, still failing despite cached loaders:** `funding-map`, `projects`,
`community/gitcoin` (hub), `community/gitcoin/funding-opportunities`, `community/gitcoin/programs/[programId]`,
`project/<sample>` (profile) — stacks for funding-map/projects/hub NOT shown in the errors-only tail;
project profile stack IS shown (below).

**Community (Stream):** `financials`, `reports`, `reports/[runDate]`, `reports/[runDate]/[configSlug]`,
`browse-applications`, `browse-applications/[referenceNumber]`, `impact`, `impact/project-discovery`,
`projects`, `updates`, `donate`, `donate/[programId]`, `donate/[programId]/checkout`,
`manage/funding-platform/[programId]/{,applications,applications/[applicationId],milestones,milestones/[projectId],question-builder,setup}`,
`manage/portfolio-reports/[reportId]`, `manage/portfolio-reports/[reportId]/preview`

**Project (all 12 profile routes × 3 samples):** `about`, `contact-info`, `funding`, `funding/new`,
`funding/[grantUid]/{,complete-grant,edit,impact-criteria,milestones-and-updates}`, `impact`, `(profile)` root,
`team`, plus `updates`.

## The stack that matters (new class)
```
Error: Route "/t/[tenant]/project/[projectId]/team": Next.js encountered the unstable value `Date.now()` in a Client Component.
This value would be evaluated during the prerender, instead of recomputed on each visit.
  - [stream]  Wrap the Client Component in <Suspense fallback={...}>
  - [defer]   Move the read into a useEffect or event handler
  - [measure] use performance.now()
    at <unknown> (hooks/useProject.ts:12:17)               <- useQuery({...})
    at <unknown> (hooks/v2/useProjectProfile.ts:75:68)
    at <unknown> (components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx:137:80)
```
And on `funding/[grantUid]/milestones-and-updates`: `digest: 'CLIENT_HOOK_DYNAMIC'` at
`ProjectProfileLayout.tsx:103` (same layout, URL hook).

Interpretation: React Query's `useQuery` calls `Date.now()` internally (staleness) whenever a client
component that uses it renders during the prerender. Routes whose `useQuery` consumers sit under a leaf
Suspense boundary pass (that is why the manage routes cleared). Crawlable routes render those consumers
ABOVE the content (`ProjectProfileLayout`, the community hub, the funding-map and projects explorers),
where DEV-612 forbids a boundary. `funding-map`/`projects`/hub are probably the same class — to be
confirmed with `--debug-prerender` (Dev #2 is enabling it on the flip build).
