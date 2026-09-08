# TASK-P2-6-CHECKLIST — merge checklist written (Frontend Dev #2, 2026-09-02)

**Deliverable: `.maestri/briefs/instant-nav-p2-6-checklist.md`.** No code, no build, nothing left
running. Every fact in it was read off `feat/cache-components-flip` @ `2d8e25dc0` — the merged head,
so Alpha's #2108 and my #2107 are both in view — with file and line references rather than memory.
The scratch clone is back on `feat/stream-page-params`, clean.

Nine sections, ordered so the blocking ones come first: remove the two diagnostics; audit the flag
set; the `instant = false` inventory; the `generateStaticParams` samples; the `staleTime: "static"`
opt-ins; the `cacheLife`/`cacheTag` table; the no-JS parity crawl; the `instant()` suite unskip; the
deferred items. It closes with an order of work.

Four things I want to flag rather than leave buried in the file.

**The ceiling belongs in the same commit as the flag.** §1 covers `prerenderEarlyExit: false` and
`--debug-prerender` as you asked, and adds the build ceiling in `vercel-build.sh` to the same
commit. It is currently back at Alpha's 480, which is correct — but the three were added together
and are only coherent together, and a half-removal (early-exit off, no debug flag) produces a build
that reports many failures and names the cause of none.

**Nothing invalidates except the blog.** The `cacheLife`/`cacheTag` table came out complete, and
building it surfaced something the table alone does not say loudly enough, so §6 says it: **only
`app/api/blog/revalidate/route.ts` calls `revalidateTag`.** Community, project and program
mutations have tags on their cached reads but nothing that fires them, so every non-blog surface
is self-healing on the 60s `revalidate` alone. That is a launch decision — acceptable or not — and
it should be made before merge rather than discovered from a stale page.

**A sample that returns `[]` is invisible.** §4 asks for a check I would otherwise not have thought
to write down: each `generateStaticParams` reads from live data (`chosenCommunities()`, the
explorer, Sanity) and every one degrades to `[]` rather than failing the build. That is the right
design, but it means a sample that silently produced nothing looks exactly like one that worked —
while the layouts' top-level `await params` depends on it having worked. It has to be confirmed on
the preview, not assumed from the config.

**"Mostly skipped" is not green.** §8 notes that every case in the `instant()` suite discovers its
own link and calls `skipUnlessFound`, so a run against a thin environment passes while asserting
almost nothing. The skip count has to be read, not just the exit code.

On §7 I deliberately did **not** copy the 53 `SITEMAP_NO_LOADING` routes into the brief. That set
lives in `__tests__/app/route-file-structure.test.ts` and is enforced in both directions; a
duplicate list in a markdown file would rot silently and start disagreeing with the guard. The
brief names the set, the tool, the flags and the fail condition instead.

The three deferred items are recorded as you listed them, with the evidence attached: the blog
preview route (`instant = false`, `draftMode()` cookie, reached only through the validated preview
API), the `/communities` no-JS gap (685 visible chars, `<h1>` present, 8 internal links, 0 community
links — identical on production and preview, so pre-existing and explicitly out of scope), and the
staff-JWT parity leg (`tokenPresent: false` in the fixture; the anonymous half is recorded and the
two `optionalAuthentication` endpoints are covered by argument, but the authenticated diff needs a
staging Privy JWT nobody on this has).
