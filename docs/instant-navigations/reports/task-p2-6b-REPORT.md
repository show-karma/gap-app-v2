# TASK-P2-6B — build result read: BLOCKED on Vercel credentials (Frontend Dev #2, 2026-09-02)

**Status: incomplete. I could not read the build. Nothing was pushed; no code changed.**

## What I was asked and what I did

| Step | Result |
|---|---|
| 1. Find the P2-6B PR | **#2107** — `feat/stream-page-params` → `feat/cache-components-flip`, head `6cd574ba4`, still draft |
| 2. Read its Vercel build result via PR checks / bot link (not the MCP) | **Blocked** — see below |
| 3. Fix any `generateMetadata` fallout | Not reached |

## PR #2107 check status (from `gh`, complete)

Everything GitHub-side is green; the only red is the Vercel deployment.

```
Vercel          fail   Deployment has failed — run this Vercel CLI command:
                       npx vercel inspect dpl_EXvRBhz9v53dEexUSWnAFZxF1vv6 --logs
                       https://vercel.com/karma-devs/gap-app-v2/EXvRBhz9v53dEexUSWnAFZxF1vv6
quality-gate    pass 3m6s      static-checks  pass 2m12s     react-doctor  pass 1m56s
test (1)–(6)    pass           smoke pass 4m25s              checklist     pass 1m6s
gate-guard / baseline-guard / gate-check  pass
build           skipping (draft)          CodeRabbit  skipped (draft)
```

The Vercel bot PR comment carries the same inspector link and the word `Error`, nothing more.
The commit status API returns only the one-line description above — no log text.

## Why it is blocked

`npx vercel inspect dpl_EXvRBhz9v53dEexUSWnAFZxF1vv6 --logs --scope karma-devs` prints:

```
Vercel CLI 59.11.2 (Node.js 22.13.1)
> No existing credentials found. Starting login flow...
>   Visit https://vercel.com/oauth/device?user_code=WRXG-FQRX
Waiting for authentication...
```

**This machine has never authenticated the Vercel CLI.** `%LOCALAPPDATA%\com.vercel.cli\`
contains only `Cache/` — no `auth.json`; there is no `.vercel/` link in either scratch clone or
in the shared checkout, no `VERCEL_TOKEN` in the environment or in any `.env`/settings file I
checked. The device-code flow is interactive, so I cannot complete it, and I killed the hung
process rather than leave it running. Rule 4 of my brief rules out the Vercel MCP, which is how
the earlier prep reports (`task-p2-6-prep4`) actually obtained their logs — so that path is gone
with nothing behind it.

**Unblock, either one — it is a one-time action:**

- `! npx vercel login` in the session (device flow, ~30s in a browser), or
- create a Vercel access token and hand it over / set `VERCEL_TOKEN`; I then run
  `npx vercel inspect dpl_EXvRBhz9v53dEexUSWnAFZxF1vv6 --logs --scope karma-devs --token …`
  wrapped in `timeout 120`, and this report gets its real content within one turn.

## What is known without the log

A failed deployment is **not** evidence against this PR. Its base, `feat/cache-components-flip`
@ `822afcb7d`, already fails the build with 75 unprerenderable routes
(`task-p2-6-prep4-REPORT.md`); P2-6B addresses only six of them, so the build is expected to stay
red until the Cause-A layouts and the P2-3 stage-2 loaders land. **The question this build answers
is not pass/fail — it is whether the 75 dropped to 69 and what the six now print, if anything.**
That is exactly what needs the log.

### The six routes, and the classification they came from

All six are Cause B in prep4 — "no layout `params` read; the page itself is the blocker":

```
/(bare)/nonprofits/find-funders/foundations/[id]
/(bare)/nonprofits/find-funders/grants/[id]
/(bare)/nonprofits/find-funders/nonprofits/[id]
/(bare)/nonprofits/find-funders/search/[id]
/(chrome)/nonprofit-research/[reportId]
/(chrome)/nonprofit-research/personas/[handleId]
```

The other four Cause-B routes (`blog/[slug]`, `blog`, `funding-map`, `projects`) are Alpha's
uncached-loader cases on #2108, not mine.

### What #2107 changes (diff confirmed on the PR head)

Each of the six pages goes from `export default async function Page({ params })` awaiting
`params` in the page body, to a **synchronous** default export returning
`<Suspense fallback={<Loading />}><…Content params={params} /></Suspense>`, with the `await
params` moved into that async child. The fallback is each route's own existing `loading.tsx`, so
the streamed state is what the route already showed while fully dynamic. Each carries a comment
recording why a boundary above page content is permissible here (nothing under `find-funders` is
in the sitemap; donor-research is auth-gated and `noindex`) — DEV-612's ban is scoped to
crawlable routes.

### The predicted next error class — worth stating before the log arrives

`generateMetadata` was left untouched on purpose, and **five of the six still await `params`
inside it**: `foundations`, `grants`, `nonprofits`, `search` and `personas/[handleId]`. Only
`nonprofit-research/[reportId]` is clear (it uses a static `export const metadata`). If the log
shows the five failing with a metadata frame while `[reportId]` passes, that is a clean signal and
the step-3 fix is mechanical. If all six pass, `generateMetadata` genuinely does not block the
shell and the point is settled.

## Resource discipline

No local `next build`, no local dev server, no vitest run, nothing left in the background (the two
long `Bash` calls — the CLI login wait and a wide `grep` — were both stopped explicitly).
