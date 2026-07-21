## Summary

<!-- One paragraph: what changes and why. -->

## User flows verified

<!--
List every end-to-end user flow this PR makes work. For each, say HOW it was
verified (deployed preview + manual walkthrough, Playwright run, etc).
Files compiling and unit tests passing are NOT verification.
-->

- [ ] Flow 1: …
- [ ] Flow 2: …
- [ ] Flow 3: …
- [ ] Edge case: …
- [ ] Failure path: …

## Cross-service (FE + BE)?

<!-- Tick if this PR pairs with a gap-indexer PR. -->

- [ ] N/A — frontend-only
- [ ] Yes — paired with show-karma/gap-indexer#____

If yes:

- [ ] Both branches deployed to the same preview before this is ready
- [ ] End-to-end flow walked through on the preview (link or screenshots in §Smoke results below)
- [ ] Wire contract documented in plan doc (which headers/cookies/methods the proxy forwards, which the BE reads)
- [ ] Proxy contract test asserts forwarding for `Authorization`, session headers, `Origin`, `Idempotency-Key`, etc.

## Smoke results

<!-- Paste link to Playwright run, video, or screenshots showing each user flow above completed end-to-end. "Deferred" is not acceptable for cross-service PRs. -->

## Review waivers

<!--
If the embedded reviewer (CodeRabbit / karma-coding-ai / /code-review) flagged
any HIGH-severity finding, either fix it in this PR or list it here with a
one-line justification and an inline `// REVIEW-WAIVED: <reason>` comment at
the cited line. An approver must sign off on each waiver.

Past examples that should NOT be waived: rate-limit TOCTOU race, raw
X-Forwarded-For trust, empty catch on auth-relevant code, duck-typed casts
on optional methods.
-->

- [ ] No HIGH findings, OR all HIGH findings fixed
- [ ] HIGH findings waived (listed below with reasons)

## Pre-PR checklist (super-gap CLAUDE.md)

- [ ] Every data-fetching component handles loading, empty, AND error states
- [ ] No `any` / `as any` casts
- [ ] All mutations use React Query `useMutation` with optimistic updates
- [ ] No hardcoded URLs/colors; uses `PAGES`, `envVars`, theme tokens
- [ ] `pluralize()` for every dynamic count
- [ ] Empty-state UI hidden when count is 0
- [ ] List items in `.map()` are `React.memo()`'d
- [ ] `"use client"` on any file importing Radix
- [ ] `useParams()` / `useRouter()` destructured to primitives before useEffect deps
- [ ] Heavy libs lazy-loaded with `dynamic()`
- [ ] `pnpm lint:fix` passes
