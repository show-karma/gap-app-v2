# TASK-VERIFY-SCRIPT — draft PR #2112 (Frontend Dev #2, 2026-09-02)

**Draft PR #2112**, `feat/verify-flip-preview` → `feat/instant-navigations`, head `16d9363e9`,
one commit, no trailers. `tsc --noEmit` exit 0; `biome lint` and `biome format` clean on all three
files; **46 unit tests pass, fixtures only, no network**. No build, no dev server, no browser,
nothing left running. Scratch clone back on `feat/stream-page-params`.

## Shape

I extended rather than duplicated: the CLI is `scripts/verify-flip-preview.mjs`, the logic and its
tests live in `scripts/indexability/` next to the crawler whose extractors it imports. That mirrors
the existing `crawl-sitemap.mjs` split (thin import-safe CLI, testable library, `node --test` suite
in `__tests__/`), and it is what keeps the no-JS numbers comparable: `extractNoJsVisibleHtml` and
`visibleTextLength` are the *same functions* the DEV-612 crawl used, not a second implementation
that would drift.

Three files, plus one line added to `indexability-monitor.yml` so the unit tests run in CI beside
the other `node --test` suites. Manual-only otherwise, exactly like `crawl-sitemap.mjs` — it hits a
deployment, so CI never runs the crawl itself.

## (1) Samples — checked, not assumed

Each sample route is fetched and classified from `x-nextjs-prerender`, `x-vercel-cache` and
`cache-control`, with TTFB recorded alongside. Three calls in that classifier I want on the record,
because each one is a way this gate could have produced a confident wrong answer:

- **A `MISS` is not evidence of a dynamic route.** A first request to a prerendered route misses the
  edge cache. Treating MISS as dynamic would have made the gate fire on a cold preview every time.
- **Disagreeing signals produce `unknown`, not a verdict**, and `unknown` is never a regression.
  Only an explicit `no-store`/`private` with no prerender marker is called dynamic.
- **TTFB is reported and never decides.** A cold edge and a slow network look identical to a dynamic
  render; it is a useful corroborating number and a terrible gate.

Sample *values* come from the deployment's own sitemap, which is fed by the same sources the samples
read (`chosenCommunities()`, the explorer, `getPublishedSlugs()`). It cannot know which exact three
the build baked and **does not need to**: when a sample was empty, no value in that segment is
prerendered, so any value in it exposes the failure.

**`program` and `grant` do not exist on the flip branch.** You listed five sample kinds; the flip
head (`2d8e25dc0`) has four `generateStaticParams` — tenant, community, project, blog — and none for
programs or grants. Rather than invent them, both are declared in `SAMPLE_SEGMENTS` with
`declared: false`, so a run **reports them as undeclared** instead of quietly omitting them, and
adding a real sample later is a one-word change. A unit test pins that list in both directions, so
if Alpha lands a grant sample and nobody updates this, the test says so.

## (2) No-JS — the 53 plus the whitelabel spot checks

Route ids are read out of `route-file-structure.test.ts` **at runtime**. I did not copy the 53 into
the script for the same reason I kept them out of the checklist brief: that set is the source of
truth and fails in both directions, and a copy would rot silently. Parsing **throws** rather than
returning `[]` if the set is renamed — an empty list would make the whole run pass while checking
nothing, which is the worst failure mode a gate can have.

Five of the 53 carry a dynamic segment (`blog/[slug]`, `project/[projectId]/(profile)`, the two
`community/[communityId]/(with-header)` ones, and the whitelabel `programs/[programId]`). They are
resolved from the samples; **anything unresolvable is reported as skipped**, never fetched with a
literal `[programId]` in the URL and never silently dropped from the table.

Two measurements are new on top of the shared extractors:

- **Internal links counted on the no-JS HTML, not the raw markup.** A link inside a hidden streamed
  chunk is exactly the DEV-612 failure; counting it would hide the regression this script exists to
  find.
- **Hidden chunks that carry real text** — empty `<div hidden>` is ordinary React streaming and is
  ignored; one holding paragraphs of the page's own content on a crawlable route is the finding.

Whitelabel spot checks hit `app.opgrants.io` at `/`, `/projects`, `/programs`. Worth saying why that
host specifically: the karma shell is the only tenant prerendered at build, so a whitelabel host
takes one cold render per deploy and is the case most likely to differ from the karma measurement.

## (3) Exit codes

**1** on any regression, **2** on a usage or setup error, **0** otherwise.

With no baseline the absolute floors still apply — 200, an `<h1>`, 200+ visible chars, no content in
hidden chunks — so a first run against a fresh preview is meaningful rather than vacuously green.
Against a baseline it adds text drops beyond 10%, lost internal links, and content that moved into a
hidden chunk. **Rows match by path, not by URL**, so a baseline captured on one preview host
compares cleanly against a run on another.

The 10% tolerance is deliberate: text length moves a little between deploys (a count, a date, a
newly published item), and a gate that fires on one character is a gate people learn to ignore.

## The bug the tests caught

Worth reporting because it is precisely the failure this script exists to prevent. `probe()`
originally read the response body only when `content-type` included `html`. `discoverSamples()`
reads sitemaps through that same probe, and a sitemap is served as `application/xml` — so discovery
silently found no sample values, the sample table came back empty, and **the run would have exited 0
having checked nothing**. The `run` unit test failed on it immediately. Fixed by reading html *and*
xml, still skipping anything else.

That is the argument for the tests being more than box-ticking here: a verification script that
passes while measuring nothing is worse than no script.

## Notes

- No application code touched. Three new files and one line in a workflow.
- Base is `feat/instant-navigations` as instructed, which also means the script survives whatever
  happens to the flip branch.
- Left undone deliberately: **I have not run it against a real preview.** There is no green flip
  preview yet, and running it against production would produce a baseline for the wrong thing. The
  first real run should be baseline-capture against an integration-branch preview, then the flip
  preview — that ordering is in the CLI docstring and in §7 of the merge checklist.
