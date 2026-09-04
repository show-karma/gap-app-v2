**P2-4b, slice 1 of 2. The rest of P2-4b is deferred on purpose — measurement below.**

## What this does

Three client components in the community hub read `usePathname()` to answer "which
sub-route is this", and the route tree already answers all three. Only the `(with-header)`
group renders them, and `manage/`, `donate/` and `admin/` are **siblings** of that group
rather than routes inside it, so none of the tests could ever be true.

- **`CommunityHeader`** — dropped `isAdminPage` / `isReviewerPage` / `isDonatePage` and the
  hook. Its own comment already said the route group decides this: *"The (with-header) route
  group layout renders this component — if we're here, show it."* `AdminCommunityHeader`
  goes with them; the only branch that rendered it was unreachable.
- **`CommunityContentWrapper`** — dropped `isManagePage` and, with it, every hook. It is a
  server component now.
- **`CommunityImpactFilterRow`** — moved from the impact layout into the impact index page.
  The layout covers `/impact` and `/impact/project-discovery`; the filters belong to the
  first, so the layout asked the pathname. The page asking nothing is the same answer with
  no URL read.

### It also fixes a latent bug

`pathname.includes("/donate")` matched any community whose slug merely *started* with
"donate" — `/community/donate-dao/projects` included — and silently dropped the header for
it. `CommunityPageNavigator`, in the same tree, already carries a comment warning against
exactly this pattern: *"never against the raw pathname — a community slug containing
'reports' or …"*.

## Why the rest of P2-4b is not here

I measured before writing more, and the measurement says the remaining work is currently
**unverifiable**.

A `cacheComponents: true` + `prerenderEarlyExit: false` build on this branch is
**identical to the `35a488ef0` baseline**: 161 / 161 routes failing, 2632 `usePathname`
errors, the same offender histogram. These changes moved nothing measurable.

The reason is that the export reports the offenders it *reaches*, and the shell fails first
on every route:

| Offender | Errors | Owner |
|---|---:|---|
| `footer-switcher.tsx:8` | 640 | #2096 |
| `useContractOwner.ts:126` | 640 | #2096 (via `useAuth`) |
| `DeferredLayoutComponents.tsx:66` | 640 | #2095 |
| `whitelabel-navbar.tsx:237` | 560 | #2096 |
| `footer.tsx:54` | 81 | #2095 |
| `global-navbar-slot.tsx:12` | 80 | #2096 |

Across all 161 routes only **16 distinct offender modules** are ever named, and **not one of
them is a Group P, C, F or N module**. `ProjectProfileLayout`, `SidebarProfileCard`,
`EndorsementDialog`, `GrantDetailLayout`, `CommunityPageNavigator`, `Community/Header`,
`CommunityContentWrapper` and `FilterRow` appear **zero** times in the log, before or after
this change.

So adding leaf boundaries to the rest of Group P/C/F/N on this base would be writing
unverifiable code against a list produced by static reachability — which has already
overstated twice in this initiative (`ContributorProfileDialog` and `useAgentContextSync`
turned out to be `ssr: false`-only and never blocked anything). I would rather not make that
mistake a third time at ~20 modules of scale.

**Recommendation:** rebase slice 2 onto the integration branch *after* #2095 and #2096 land,
re-run the readiness build, and let the offender list that finally surfaces drive the work —
including whether `EndorsementDialog` and friends are real blockers at all.

The three changes in this PR stand on their own regardless: they remove unreachable code,
fix a real slug-collision bug, and turn one component back into a server component.

## Tests

`tsc` clean, `biome` clean on the touched files. The community suites that cover these
components pass unchanged: `community-cover-group` and `CommunityPageNavigator` (45 tests),
`community-subpage-canonicals` (32), `community-hub-itemlist-ssr`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DuBL2m3rfvbqHEPTrsb2p9
