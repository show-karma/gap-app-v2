# Vercel build log digest — PR #2107 @ 38e9dea11 with `--debug-prerender` (dpl 8L4ySTGGN1GdTApTZeJGmBZcz15U)

Base: flip head 822afcb7d WITHOUT #2108's changes, so the count is the old 75 — the value of this
build is the server-side stacks, which are now exact. Read by the Tech Leader, errors-only tail.

## Confirmed causes (file:line)
| Route(s) | Frame | Class | Owner / fix |
|---|---|---|---|
| `nonprofit-research/[reportId]`, `nonprofit-research/personas/[handleId]` | `src/features/donor-research/components/common/donor-research-section-layout.tsx:168` `usePathname()` (CLIENT_HOOK_DYNAMIC) | URL hook in section layout above page | Dev #2: server layouts pass an explicit mode prop, delete the hook (approved) |
| `nonprofits/find-funders/*/[id]` ×4 | not in the tail; Dev #2's `NonProfitsNavbar:106 usePathname()` finding stands | same class | Dev #2: route-tree split for `isHomepage` (approved) |
| `community/[communityId]/**` (all) | `app/t/[tenant]/(chrome)/community/[communityId]/layout.tsx:102` `await props.params` | layout params read | Alpha #2108: generateStaticParams sample (already cleared most) |
| `project/[projectId]/**` (all) | `app/t/[tenant]/(chrome)/project/[projectId]/layout.tsx:91` `await props.params` | layout params read | Alpha #2108 (cleared non-nested; nested `funding/[grantUid]/*` still open) |
| `blog` | `blog/page.tsx:46` `await getPublishedPosts()` uncached | uncached loader | Alpha #2108 (cleared) |
| `blog/[slug]` | `blog/[slug]/page.tsx:79` `await params` + `draftMode()` | params + request state | Alpha #2108 (cleared) + preview route |
| `funding-map` | `funding-map/page.tsx:42` `await prefetchDefaultPrograms()` | uncached seed | Alpha #2108 cached seed (verify in next build) |
| **`projects`** | **`projects/page.tsx:34` `parseProjectsExplorerRequest(await searchParams)`** | **searchParams read at top level of a crawlable page** | **Alpha: NEW — prerender the default list from the cached loader outside any boundary; read searchParams in a leaf Suspense child that swaps in the filtered list client-side (the funding-opportunities toolbar-split shape, #2102)** |

## Notes
- `--debug-prerender` is worth keeping on the flip branch until the count reaches zero, then remove
  with the `prerenderEarlyExit` diagnostic.
- Dev #2's branch must be rebased onto the flip head once Alpha's #2108 lands in it; until then its
  builds show the pre-#2108 count.
