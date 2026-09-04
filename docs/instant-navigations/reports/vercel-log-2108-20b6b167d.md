# Vercel build log digest — PR #2108 @ 20b6b167d (dpl 3Sa5Fu5LRVuCxTKreVN4QFU4NDat)

`Export encountered errors on 48 paths` (was 69). Read by the Tech Leader, errors-only tail.

## Cleared by the staleTime: 'static' (prerenderSafe) spike
All non-nested project profile routes, for all 3 samples: `(profile)` root, `about`, `team`, `impact`,
`contact-info`, `funding`, `funding/new`, `updates`. **Spike (a) works.**

## Still failing — unique routes (48 paths incl. 3× project samples)
**Dev #2's six (its metadata + debug-prerender push pending):** `nonprofits/find-funders/{foundations,grants,nonprofits,search}/[id]`,
`nonprofit-research/[reportId]`, `nonprofit-research/personas/[handleId]`

**Cache-class explorers (prerenderSafe extension pending):** `funding-map`, `projects`

**Community, sample `gitcoin`:**
- Cache-class: hub `(with-header)/page`, `funding-opportunities`, `programs/[programId]`
- Stream: `projects`, `updates`, `impact`, `impact/project-discovery`, `browse-applications`,
  `browse-applications/[referenceNumber]`, `financials`, `reports`, `reports/[runDate]`,
  `reports/[runDate]/[configSlug]`, `donate`, `donate/[programId]`, `donate/[programId]/checkout`
- Manage, only the ones with a further unknown segment: `manage/funding-platform/[programId]/{,applications,applications/[applicationId],milestones,milestones/[projectId],question-builder,setup}`,
  `manage/portfolio-reports/[reportId]`, `manage/portfolio-reports/[reportId]/preview`

**Project, nested only:** `funding/[grantUid]/{,complete-grant,edit,impact-criteria,milestones-and-updates}` × 3 samples

## The stack shown in the tail (manage nested routes)
```
digest: 'CLIENT_HOOK_DYNAMIC'
>  7 | export function ManageLayoutClient({ children }) {
   8 |   const params = useParams();
   9 |   const communityId = params.communityId as string;
```
`useParams()` in `ManageLayoutClient` is fine when every param is a build-time sample (the 25 non-nested
manage routes pass) but becomes runtime data once `[programId]`/`[reportId]` is unknown. Fix shape: the
server manage layout already has `communityId` — pass it as a prop and drop `useParams()`; or a boundary,
since manage is noindex. Expect the same shape behind `GrantDetailLayout` for `funding/[grantUid]/*`.
