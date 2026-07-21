# DEV-426 Nonprofit Diligence + Advisor Intros — E2E QA Results

**Date:** 2026-06-26 · **Stack:** local (FE :3000, BE :3002, Postgres pgvector :5433 w/ staging dump restored, Redis :6379)
**Method:** 1 QA-plan agent + 5 parallel API/DB agents (adversarially verified) + orchestrator browser E2E (Playwright).
**Plan:** `docs/qa/2026-06-26-dev-426-consolidated-e2e-qa-plan.md`

## Verdict

**Conditionally shippable.** Core flows and the anonymity gate work. **1 High** FE/BE seam bug blocks the Connect recovery path and should be fixed before release; **3 Medium** backend issues (2 log-PII leaks + 1 answer-shadowing correctness bug) should be fixed or explicitly waived. No BLOCKER. Several findings were **adversarially dismissed** as works-as-intended / env artifacts (documented below) — they are not bugs.

## Anonymity acceptance gate ("anonymous until Connect") — ✅ PASS (product layer)
- Ask Questions dialog: *"Your identity is never shared."* Connect dialog: *"Connecting reveals your identity."* — correct boundary.
- Public nonprofit response page content shows **org name only** (MODERN WOODMEN), no advisor identity. API `GET /diligence-response/:token` payload carries no advisor PII.
- Cross-advisor access is **404** (tenant isolation holds; `privy_user_id` is a wallet address).
- ⚠️ Caveat: advisor identity is clean, but capability **tokens and nonprofit answers leak into server logs** (see M1/M2) — an infra-layer leak, not a product-surface leak.

---

## Confirmed bugs

### H1 — Connect "email-capture" recovery is broken at the FE/BE seam  (High)
- Connect on an advisor with no auto-resolvable email correctly returns **422** and the FE shows an "Add your email" recovery dialog. Submitting it calls **`PUT /v2/donor-research/me` → 404** — the BE exposes only **`POST /me`** (onboarding, idempotent), whose `AdvisorOnboardingBodySchema` has an optional `email` field documented *for exactly this case*.
- FE: `src/features/donor-research/components/diligence/ConnectDialog.tsx` → `useUpdateAdvisorEmail()` (PUT). BE: `app/.../routes/donor-research/donor-research.routes.ts` (GET+POST /me only).
- **Impact:** a wallet-only / unresolved-email advisor can never complete Connect; failure is **silent** (no error toast, dialog just sits). Classic wire-contract mismatch (CLAUDE.md cross-service §3). API-only tests miss it.
- **Fix:** FE should `POST /me` with `{displayName, timezone, email}` (or BE adds `PUT /me`); also surface an error on non-2xx. Evidence: `e2e-connect-email-capture-branch.png`.

### M1 — Plaintext capability token logged server-side  (Medium, verified real-bug)
- The global request logger `app/modules/middleware/ActionLogger.ts` emits `{method, url, params}` un-redacted; the capability token rides in the URL/params of `/diligence-response/:token`, so real tokens land in logs in plaintext (one run: tokens appeared 39–52× each). Violates the design invariant "plaintext token never persisted/logged." DB correctly stores only the SHA-256 hash.
- Gated by `LOGGING`/log-level (this env ran verbose), so prod impact depends on log config — but capability-token-in-URL is inherently captured by access logging. **Fix:** redact the `:token` path segment / `params.token`, or move the token out of the URL.

### M2 — Nonprofit answer PII logged in plaintext  (Medium, verified real-bug)
- `app/modules/util/postgres-query-timing.ts` (`timePrismaOperation`, wired globally via `$extends $allOperations`) logs full Prisma `args` at DEBUG, including `args.data.answers` (e.g. *"Our annual operating budget is approximately 4.2 million USD."*). No pino `redact` config. Violates CLAUDE.md "PII in telemetry — hash or redact first." **Fix:** redact `answers`/`args` for donor-research models or disable arg logging.

### M3 — Duplicate diligence request shadows an accepted answer  (Medium, verified real-bug; B3-adjacent)
- `requestDiligence()` calls `modifier.create()` with **no server-side re-ask guard** (guard is FE/read-only); `findByAdvisorAndCandidate` is `findFirst orderBy created_at desc` (latest-wins, single row). So a later `contact_blocked` re-ask **shadows** an earlier `answered` request → advisor sees `coarseStatus=blocked, latestAnswers=null`, hiding a delivered answer (live: request `291e2e57` answered, hidden by `b1499d7b` blocked).
- **Fix:** server-side re-ask guard, or resolve coarseStatus/answers across all requests for the (advisor,candidate), preferring an accepted answer.

---

## Low / dogfooding
- **L1 (spec gap):** the spec's "Save as my default template" vs "Apply to this request" split is **not implemented** — the shipped editor is a single global `PUT /me/diligence-template`. Confirm with product whether this is acceptable for v1.
- **L2 (perf):** report list refetches the same 5 donor-research endpoints **~8×** on load (`me`, `me/counters`, `handles`×2, `reports`).
- **L3 (env, fix dev only):** FE had a stale **ngrok backend** baked into `.next` + browser HTTP cache from the prior QA session; cleared. CRLF in FE `.env` fixed.

## Adversarially dismissed (NOT bugs — verified)
- Template accepts numeric `id/text` and coerces to string (200) → **works-as-intended** (Fastify AJV `coerceTypes`; no crash/corruption; FE always sends strings).
- Re-POST after a `contact_blocked` request creates a 2nd row → **works-as-intended** (partial-unique `uq_diligence_request_idempotency` excludes terminal states). *(Note: this is the mechanism M3 exploits on the read side.)*
- "MODERN WOODMEN should be sendable but blocked" → **env artifact** (see below).

## Notable PASSes
- Template CRUD + bounds (1000-char / 50-item limits inclusive; all malformed bodies → 400, never 500); **per-advisor isolation** (other advisors' templates byte-identical across mutations).
- Connect 422 email-capture branch triggers correctly; cross-advisor **404** scoping.
- Public endpoint: 12/12 (invalid token → 404 enumeration-safe; already-answered → graceful "answers were received", **B2 regression fixed — no 500**; expiry shown).
- Anonymity copy + payloads clean (gate PASS).

## Environment limitation (affects coverage — action for the team)
- The restored data's **contact-resolution/target-selection blocks every assigned candidate** — even MODERN WOODMEN, which has both a public `email` and `website_url`, resolves to `contact_blocked` (the gate requires a *confident, identity-matched* contact, not just any email). Consequently the full **sendable happy path** (`in_progress → email_sent → token emailed → answered → intro_sent`) could not be exercised end-to-end on the assigned candidates, and **regression B1** (coarseStatus → `intro_sent` after Connect) could not be confirmed live.
- A few `email_sent`(1)/`answered`(2) rows do exist in the dump, which is how M1/M2/M3 were still observed. **Recommendation:** seed at least one candidate with a contact that passes target-selection so the happy path + B1 can be verified before ship.

## Fixes applied (2026-06-26)

| # | Status | Change |
|---|--------|--------|
| **H1** | ✅ Fixed | FE `updateAdvisorEmail` now `POST /me {displayName, orgName, timezone, email}` (the onboard contract that persists the email to the contributor profile) instead of the nonexistent `PUT /me`. Verified live: OLD `PUT` → **404**, NEW `POST` → **201**. Files: `services/diligence.service.ts`, `services/donor-research.service.ts` (added optional `email`), `ConnectDialog.tsx` (comment). FE typecheck + biome clean. |
| **M2** | ✅ Fixed | `postgres-query-timing.ts` logs `argKeys` (top-level key names) instead of raw `args` — nonprofit answers/emails no longer reach logs. Verified live: 0 raw `args` in new `[postgres-query]` lines. New `summarizeArgKeys` + tests. |
| **M1** | ◑ Mitigated | Capability token redacted in `ActionLogger` (`redactActionLog`) and in the dev Fastify pino logger via a `req` serializer (`redactSensitiveUrl`, scrubs `/diligence-response/:token`). Verified live: `[REDACTED]` present, ActionLogger/pino no longer leak. **Residual:** the `Response:` logger in `app/modules/hooks/on-response.ts` still logs the raw URL — that path is **frozen V1** (write-protected) so it was left untouched; it is gated by `config.logging`+`logLevel` (off by default in prod). Proper long-term fix is architectural (don't carry the capability token in the URL path). New `ActionLogger.test.ts`. |
| **M3** | ✅ Fixed | Read path now prefers the answered request: new provider `findAnsweredByAdvisorAndCandidate` + `candidate-diligence.read.service` uses `answered ?? latest`, so an accepted answer is never shadowed by a later `contact_blocked` re-ask (which is stored as a separate row the partial-unique index excludes). Verified live: the shadowed candidate now returns `coarseStatus=answered` + answers (was `blocked`/`null`). New read-service regression test + 1005 donor-research tests pass. Files: `i-diligence-request.repository.ts`, `diligence-request.repository.ts`, `candidate-diligence.read.service.ts`. |

BE: 1005 donor-research unit tests pass, `yarn typecheck` clean, eslint clean. FE: `tsc --noEmit` clean, biome clean.

## Evidence
Screenshots in repo root `.playwright-mcp/` and: `smoke-diligence-buttons.png`, `e2e-ask-questions-anonymous-empty-template.png`, `e2e-connect-email-capture-branch.png`, `e2e-public-response-page-answered.png`. Raw agent findings: workflow run `wf_f90249ec-6a9`.
