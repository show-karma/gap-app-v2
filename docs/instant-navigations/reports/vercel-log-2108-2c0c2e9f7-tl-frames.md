# Vercel frames — PR #2108 @ 2c0c2e9f7 (dpl B7BHKvjAz2Qd2Aw61Y4U826xipjp), window 18:13:30–18:14:05Z

Read by the Tech Leader with a time-windowed errors-only pull. Complements Alpha's digest
(`vercel-log-2108-2c0c2e9f7-alpha-frames.md`).

## `projects` — captured
```
Error: Route "/t/[tenant]/projects": Next.js encountered URL data `useSearchParams()` in a Client Component outside of `<Suspense>`.
    at ProjectsExplorer (components/Pages/Projects/ProjectsExplorer.tsx:50:54)
    at ProjectsExplorerLoader (app/t/[tenant]/(chrome)/projects/page.tsx:87:10)
    at Projects (app/t/[tenant]/(chrome)/projects/page.tsx:52:7)
  > 50 |   const [searchQuery, setSearchQuery] = useQueryState("q", {
  digest: 'CLIENT_HOOK_DYNAMIC'
```
Fix (Cache-class, no boundary above the list): list container renders the server default page with
no nuqs read; search box + filters move into a toolbar client component behind a leaf boundary that
owns the `useQueryState` reads (lines 50/57/63/70) — the #2102 toolbar-slot shape. Owner: Alpha.

## Confirmed again in this window (unchanged frames)
- nested manage: `ManageLayoutClient.tsx:8 useParams()` — Dev #2
- `(cover)` financials/reports: `(cover)/layout.tsx:23` (the layout's uncached `getCommunityDetails`, axios) — Dev #2 → cached twin
- nonprofit-research: `DonorResearchSectionLayout:168 usePathname()` — Dev #2 (fixed on its branch, pending rebase)
- nested grant routes: `ProjectProfileLayout.tsx:107 useParams()` — Alpha
