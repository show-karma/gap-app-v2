# Vercel frames — PR #2107 @ 8174b8d9a (dpl EB7jSs1bWEZNzyF4T5AJeaDUZxff), 48 → 31 paths

Read by the Tech Leader, window 18:31:40–18:32:09Z.

## Cleared by #2107 (verified in the export list)
find-funders/{foundations,grants,nonprofits,search}/[id]; nonprofit-research/[reportId], personas/[handleId];
all nine nested manage routes; financials; reports (index).

## New frame — `reports/[runDate]`, `reports/[runDate]/[configSlug]`
```
Error: Route ".../reports/[runDate]": Next.js encountered URL data `useParams()` in a Client Component outside of `<Suspense>`.
    at useUrlBuilder (hooks/use-url-builder.ts:23:27)
    at Link (src/components/navigation/Link.tsx:22:22)
    at CommunityCoverBar (app/t/[tenant]/(chrome)/community/[communityId]/(cover)/CommunityCoverBar.tsx:49:9)
    at CoverLayout (app/t/[tenant]/(chrome)/community/[communityId]/(cover)/layout.tsx:44:7)
  > 23 |   const params = useParams<{ community: string }>();
```
**Class:** the app-wide `Link` wrapper reads `useParams()` on every render. Harmless on routes whose params
are build-time samples; a blocker on any route with an unknown nested param (`[runDate]`, `[grantUid]`,
`[programId]`, `[referenceNumber]`…) where a `Link` renders above the content.
**Fix (Dev #2, shared infra — coordinate):** `useUrlBuilder` takes the community from a small client context
provided by the server `community/[communityId]/layout.tsx` (slug known there), with `targetCommunity`
still overriding; drop the `useParams()` call entirely (a hook call is flagged even when unused). Keep
`Link` behaviour byte-identical outside community routes; the Link tests pin it.

## Still failing, by owner (31 paths)
- Alpha: hub chain ×7 (`CommunityPageNavigator:120` / `Header.tsx:58`), `programs/[programId]`, `funding-map`,
  `projects`, grant routes ×15 (`ProjectProfileLayout:107`), `project/[projectId]/updates` (raw loader, warning-level)
- Dev #2: donate ×3 (`donate/layout.tsx:29`), reports/[runDate] ×2 (above)
