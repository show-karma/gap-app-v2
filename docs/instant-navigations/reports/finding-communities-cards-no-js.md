# Finding — `/communities` renders no community links without JavaScript

**Status:** pre-existing, live in production, **not in scope** for Instant Navigations unless
the user says so. Filed out of TASK-P2-5, where it turned up while looking for a community with
several open programs.

**Severity:** medium. A crawlable sitemap route whose entire subject matter — the list of
organizations — is invisible to a reader that does not execute JavaScript, and invisible to the
two gates that exist to catch exactly that.

---

## What was measured

Plain unauthenticated `fetch`, no browser. Extractor is the repo's own
`extractNoJsVisibleHtml` + `visibleTextLength` from `scripts/indexability/crawl-sitemap.mjs`.

| Target | visible chars (no-JS) | h1 | internal links | community links |
|---|---|---|---|---|
| `https://www.karmahq.org/communities` | 685 | "Organizations on Karma" | 8 | **0** |
| #2102 preview `/communities` | 685 | "Organizations on Karma" | 8 | **0** |

Identical on production and on a preview, so this is the route's normal behaviour, not a
deployment artefact.

Every internal href in the no-JS HTML, in full:

```
/  /for-projects  /for-agents  /blog  /terms-and-conditions  /privacy-policy
/manifest.json  /favicon.ico
```

Navbar and footer chrome, and nothing else. **Not one `/community/<slug>` link.** The visible
text is the page's marketing copy — heading, intro paragraph, and the "Add Your Community" CTA.

## Why

`app/t/[tenant]/(chrome)/communities/page.tsx` is a server component that renders exactly one
thing of substance: `<CommunitiesPage />`. That component
(`components/Pages/Communities/CommunitiesPage.tsx`) is `"use client"` and loads its data on the
client through `useCommunities({ limit: 12, includeStats: true })` and `useCommunityStats()`.
There is no server fetch on this route at all.

It then renders the cards through `react-virtualized`'s `Grid` inside an `AutoSizer`, which
needs a measured viewport width before it renders any cell. So even the "first paint after
hydration" is a windowed subset; with scripting off it is nothing.

## Why neither existing gate catches it

1. **The DEV-612 ratchet** (`__tests__/app/route-file-structure.test.ts`) asks whether a
   `loading.tsx` sits anywhere on a crawlable route's segment chain. `/communities` has none, so
   it passes — correctly, by that rule's own terms. The rule models one failure mode: content
   hidden behind a Suspense fallback as a `<div hidden id="S:n">` late chunk. This is a
   different failure mode — the content was never server-rendered in the first place, so there
   is no hidden chunk to find. Measured: `hidden chunks with text = 0`.
2. **The sitemap crawl** (`scripts/crawl-sitemap.mjs --visibility-mode no-js`) classifies a page
   as meaningful when `textLength >= 200 && Boolean(h1)` (`DEFAULT_MIN_CONTENT_CHARS = 200`).
   `/communities` has 685 characters and an h1, so it passes on marketing copy alone. The check
   has no notion of "this route's content is a list, and the list is empty".

That gap is the transferable part of this finding: **both gates measure the shape of the HTML,
neither measures whether the route's actual subject matter is in it.**

## Blast radius

- SEO: the internal link graph from `/communities` to the ~N community hubs does not exist for
  any crawler that does not execute JS. Community hub pages are reachable through the sitemap,
  so they are not orphaned, but they get no link equity or crawl path from their index.
- AI fetchers, which mostly do not execute JS, see a page that says organizations exist and
  names none of them.
- `/communities` is listed in `SITEMAP_NO_LOADING` in the route-structure ratchet, i.e. the
  repo already classifies it as crawlable and holds it to the DEV-612 standard.

## Not investigated

Whether other index routes in `SITEMAP_NO_LOADING` share the pattern. `/projects` and
`/funding-map` are the obvious candidates — both are list routes and both appear in the
triage matrix's list of loaders that P2-3 would annotate with `"use cache"`, which implies they
*do* fetch on the server, but that was not measured. Anyone picking this up should run the
same probe across the crawlable set before sizing a fix.

## If it is ever picked up

The fix is a server fetch for the first page of communities rendered into the initial HTML, with
the client component taking over for pagination and virtualization — the same shape
`community/[communityId]/funding-opportunities` already uses for its program cards. That is a
route-level change, not a boundary change, which is why it does not belong inside the Instant
Navigations phases: none of P2-1..P2-6 would fix it, and P2-6's no-JS parity pass would report
it as unchanged rather than as a regression.

A cheaper interim guard, if the fix is not wanted now: extend the sitemap crawl with a
per-route expectation of a minimum number of internal links, so a list route that renders zero
of its own items fails loudly instead of passing on chrome and marketing copy.
