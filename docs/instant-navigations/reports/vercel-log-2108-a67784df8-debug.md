# Vercel build log digest — PR #2108 @ a67784df8 with `--debug-prerender` (dpl 55mHqzDNWzboTvtSr8Wm8asRi2Ah)

**48 paths failing — unchanged from 20b6b167d.** The extension round (prerenderSafe on explorers,
projects searchParams removal, GrantDetailLayout props) cleared nothing measurable. Real frames below.

## Frames captured (errors-only tail window)
| Routes | Frame | Fix owner |
|---|---|---|
| all nested `manage/funding-platform/[programId]/*`, `manage/portfolio-reports/[reportId]/*` | `components/Manage/ManageLayoutClient.tsx:8` `useParams()` via `manage/layout.tsx:9` | Dev #2 — communityId as a server prop |
| `financials`, `reports`, `reports/[runDate]`, `reports/[runDate]/[configSlug]` | `community/[communityId]/(cover)/layout.tsx:23-24` `await props.params` (`pagesOnRoot` check follows) — the frame points at the component; check whether the real dynamic access is a later uncached call in that layout (e.g. community details) | Dev #2 (community Stream) — pass the values down / cache the read / leaf boundary (these are Stream-class) |
| `nonprofit-research/[reportId]`, `personas/[handleId]` | `donor-research-section-layout.tsx:168` `usePathname()` | Dev #2 — mode prop (in progress) |
| `project/<sample>/funding/[grantUid]/{,edit,impact-criteria,milestones-and-updates,complete-grant}` | **`components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx:107` `useParams()` and `:108` `usePathname()`** via `(profile)/layout.tsx:29` — NOT GrantDetailLayout. The non-nested profile routes pass only because their params are build-time samples; an unknown `[grantUid]` makes `useParams()` runtime. | Alpha — projectId from the server ProfileLayout as a prop; the pathname-driven tab active-state either from a server-known prop or in a leaf boundary that holds no links |

## Frames NOT in this window (Alpha to pull with time windows from the same deployment)
`funding-map`, `projects`, `community/gitcoin` (hub), `community/gitcoin/funding-opportunities`,
`community/gitcoin/programs/[programId]`, `find-funders/*/[id]` ×4 (expected NonProfitsNavbar:106),
`browse-applications(+[referenceNumber])`, `impact(+project-discovery)`, `projects`, `updates`, `donate` ×3.
