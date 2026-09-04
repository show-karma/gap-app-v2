# Vercel frames — PR #2111 @ 531766bfd (dpl E1FKec3dat1qH2TkFHbDYjqUVj8D), 26 → 9 paths

Read by the Tech Leader, windows 19:55:20–19:56:00Z. All remaining routes are Alpha's; every one has a frame.

| Route | Frame | Fix (from the frame) |
|---|---|---|
| community hub `(with-header)/page.tsx` | `:64` `const searchParams = (await props.searchParams) ?? {}` → `parseCommunityProjectsPage` | Cache-class: prerender the default (page 1) list from the cached loader with NO searchParams read; `?page=N` handled by a leaf/client (toolbar-split shape, like `projects`) |
| `funding-opportunities` | `src/features/programs/hooks/use-programs.ts:48` `useQuery` (`Date.now()` in a Client Component) via `FundingOpportunitiesClient.tsx:158` | `staleTime: 'static'` opt-in on that hydrated query (prerenderSafe pattern), scoped to the above-content consumer |
| `programs/[programId]` ×2 samples | `page.tsx:191` `queryClient.setQueryData(...)` server-side (`Date.now()` while prerendering) | move the seed (setQueryData + dehydrate) inside the cached seed function (`buildDehydratedState` pattern) |
| `project/[projectId]/updates` ×3 samples | `updates/page.tsx:53` `await queryClient.prefetchQuery(...)` (`Date.now()` while prerendering) | same cached-seed pattern as the project layout — the updates page has its own prefetch |
| `funding-map` | `src/features/funding-map/components/funding-map-card.tsx:71` `new Date()` in a Client Component (`hasEnded`) via `FundingMapList:150` | [defer]: compute `hasEnded` after hydration (effect / client-only) with a server-safe initial value, or pass `hasEnded` from the cached server data; never `new Date()` during render |
| `projects` | `ProjectsExplorer.tsx:50` nuqs (known) | split in progress |

## Warnings (routes prerender, still worth fixing before the flip)
`generateMetadata` in `funding/[grantUid]/layout.tsx:71` → `getProjectGrants` (`project-grants.service.ts:40`) still authorized → `cookies()`
`HANGING_PROMISE_REJECTION` on every grant route. Use `publicReadOptions()` there (grants are public on the SSR path already, per #1571/#2098).
