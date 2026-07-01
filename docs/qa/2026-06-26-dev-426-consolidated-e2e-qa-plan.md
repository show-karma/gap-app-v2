# DEV-426 Consolidated E2E QA Plan — Nonprofit Diligence Requests + Advisor Intros

**Date:** 2026-06-26
**Parent:** DEV-426 · **Backend:** DEV-427 · **Frontend:** DEV-428
**Scope:** Full-stack (FE + BE + DB) end-to-end verification on the **live local stack**.
**Execution model:** 5 parallel testing agents, each OWNS one surface/account to avoid shared-state collisions.
**This is a PLAN ONLY — do not execute. Hand to 5 parallel agents.**

---

## 0. Live environment facts (verified — design against these)

| Thing | Value |
|---|---|
| Frontend | `http://localhost:3000` (`pnpm run dev`) |
| Backend | `http://localhost:3002` |
| Postgres | `docker.exe exec karma-pg psql -U postgres -d gap -c "<SQL>"` |
| Redis | `localhost:6379` |
| Advisor auth | Privy Bearer JWT in header `Authorization: Bearer <jwt>`; read from browser `localStorage` key **`privy:pat`** |
| Email safety | **Non-prod redirects ALL recipients + BCC → `arthur@karmahq.xyz`.** No real nonprofit is ever emailed. |
| Secure-link base | config = `staging.karmahq.xyz`, so the **emailed** link is NOT localhost. Testers must build the local URL manually: `http://localhost:3000/nonprofit-research/diligence/<token>`. |
| Token sourcing | Plaintext response token lives **only** in the email/outbox; DB stores the **SHA-256 hash**. Read the plaintext from the BE outbox row / email payload. |

### Test accounts (email / OTP — OTPs may be stale; logins may reissue fresh codes)

| Agent | Account | OTP | Advisor identity |
|---|---|---|---|
| A1 (template) | `test-8970@privy.io` | `598767` | — |
| A2 (Ask) | `test-9744@privy.io` | `630970` | **"QA Advisor" `0x9b75…`**, owns report `6f35ca24` (2 candidates: "Daughters of Isabella", "Greene Plantation Historical Society", both in **"Also considered"** pool) |
| A3 (Connect) | `test-7095@privy.io` | `466874` | — |
| A4 (cross-cutting) | `test-3620@privy.io` | `363295` | — |
| A5 (public page) | — none (never logs in) | — | — |

> **Identity column trap:** `donor_advisor_account.privy_user_id` stores a **WALLET ADDRESS** (e.g. `0x9b75…`), NOT a Privy DID. Cross-advisor scoping must resolve to **404** (no existence leak). Verify on the `0xbe6328…` ("QA Advisor 3") vs `0x9b75…` boundary.

### Data fixtures

- **10 advisors / 31 reports / 65 candidates.**
- **Richest report** = `3b8036df-c89b-4897-8eb5-fd617683e8b0` (25 candidates, advisor **"QA Advisor 3" `0xbe6328…`**).
- Account `test-9744` ("QA Advisor" `0x9b75…`) owns report **`6f35ca24`** (2 candidates, both "Also considered").

### ⚠️ CRITICAL UX FACT — buttons are behind row expansion

The per-candidate **"Ask questions" / "Connect"** buttons (the `CandidateDiligenceActions` footer) render **only AFTER expanding a candidate row** on the report one-pager. They are **NOT** on the collapsed list. Every advisor-side step must expand the candidate first, or the footer (and its `GET …/diligence` call) never mounts.

### Routes

| Surface | Route |
|---|---|
| Report list | `/nonprofit-research` |
| Report view (advisor) | `/nonprofit-research/[reportId]` |
| Template editor | `/nonprofit-research/diligence-template` |
| Donor shared view | `/nonprofit-research/shared/[token]` |
| **Public response page** | `/nonprofit-research/diligence/[token]` (no auth) |

### Endpoints (FE-integration §8)

```
ADVISOR (authed — Bearer)
  GET  /v2/donor-research/me/diligence-template
  PUT  /v2/donor-research/me/diligence-template
  GET  /v2/donor-research/reports/:reportId/candidates/:candidateId/diligence
  POST /v2/donor-research/reports/:reportId/candidates/:candidateId/diligence-requests   -> 202
  POST /v2/donor-research/reports/:reportId/candidates/:candidateId/intro-requests        -> 202 | 202(blocked) | 422(email)
  PUT  /v2/donor-research/me   {email}    -> ⚠ UNVERIFIED advisor-email-capture endpoint (Connect 422 recovery)
PUBLIC (token = capability, no login)
  GET  /v2/donor-research/diligence-response/:token            (no-store, Origin+rate-limited)
  POST /v2/donor-research/diligence-response/:token   -> 201   (Origin + rate-limited)
ADMIN (staff)
  GET  /v2/admin/donor-research/diligence-requests[/:id]       (faucet-admin guard; ops manual entry)
```

### coarseStatus → UI mapping (FE-integration §5)

| coarseStatus | Badge | Meaning |
|---|---|---|
| `not_requested` | (no badge) | Neither action used |
| `in_progress` | "Questions sent" | Diligence sent, awaiting answers |
| `answered` | "Answered" | ≥1 accepted answer exists |
| `blocked` | "Couldn't reach" | No safe contact / send/delivery failed / expired |
| `intro_sent` | "Intro sent" | Named intro sent — **OUTRANKS** all diligence states |

> **Buttons follow `actions.canAskQuestions`/`canConnect`. Badge follows `coarseStatus`.** They are independent — never re-derive one from the other. POST and GET share ONE resolver and must always agree.

---

## 1. ★ TOP ACCEPTANCE GATE — "ANONYMOUS UNTIL CONNECT" ★

**This invariant overrides every other result. A single violation fails the entire feature regardless of all other passes.** Advisor identity (name / email / wallet / org-of-advisor / handle / donor identity) must **NEVER** appear before an explicit Connect. Assert it at THREE layers — API payload, DB row, and rendered email HTML — at every listed surface:

| ID | Where | Assert exactly | Layer | Owner |
|---|---|---|---|---|
| **G1** | Ask-Questions email to nonprofit (BE outbox / Mailgun payload) | Rendered email HTML contains org name + question text **only**. Grep the HTML for the advisor's name, email substring, wallet `0x…`, donor handle → **all absent**. | **[db]** read outbox HTML column / `[api]` capture send payload | A4 + A2 |
| **G2** | `POST .../diligence-requests` request body & headers | Body empty/minimal; candidate identified by URL path only. No advisor identity in body or custom headers (only `Authorization`). | **[api]** | A2 |
| **G3** | `GET /v2/donor-research/diligence-response/:token` payload (public) | Returns ONLY `{orgName, questions, alreadySubmitted, expiresAt}`. **Zero** advisor/donor/contact/token-of-advisor fields. | **[api]** + **[browser]** DOM grep | A5 |
| **G4** | Public response page DOM (`/diligence/[token]`) | Only the nonprofit's own `orgName` may render. No "advisor", email, wallet, "Karma advisor", donor name anywhere in DOM. | **[browser]** | A5 |
| **G5** | Donor **shared** report view (`/shared/[token]`) — payload + DOM | `GET .../shared/:token` carries no diligence/advisor fields; shared DOM shows **no** diligence footer, badges, answers, or "Intro sent". | **[api]** + **[browser]** | A4 |
| **G6** | DB rows | `donor_research_diligence_request.target_email_encrypted` is **AES-GCM ciphertext (Bytes)**, not plaintext; `target_email_hash` is HMAC; `response_token_hash` is SHA-256, never plaintext. No plaintext email/answers/token in any column. | **[db]** | A4 |
| **G7** | Connect (named intro) email — the ONLY place identity may appear | Intro email **DOES** contain advisor identity + verbatim Q&A (truncated). This is the allowed reveal. Confirm diligence email (G1) for the **same candidate** still has none. | **[db]** outbox | A4 + A3 |

Any agent observing identity leakage on a pre-Connect surface files a **BLOCKER** immediately and halts that thread.

---

## 2. Shared setup & ownership rules (read before splitting)

### 2.1 First action (every authed agent)
Expand a candidate row on your assigned report, open DevTools Network, watch the first `GET /v2/donor-research/…/diligence` call. Record at top of report: backend **LIVE** (200+JSON) vs **ABSENT** (404/5xx/HTML) and the observed status. Backend is expected LIVE on `:3002`.

### 2.2 Login (A1–A4; A5 never logs in)
1. Navigate `http://localhost:3000/nonprofit-research`.
2. Trigger Privy login → enter assigned email → submit.
3. Enter OTP (use the table value; if rejected/stale, request a fresh code and use the one delivered to the inbox).
4. Confirm authed (advisor home renders). Capture `localStorage["privy:pat"]` exists (the Bearer). Screenshot logged-in state.

### 2.3 Shared-state ownership (MANDATORY — prevents stomping)
- The diligence **template is ONE global per-advisor row**. **Only A1 mutates it.** A2/A3/A4 treat it READ-ONLY (preview via Ask dialog only — never open the editor and save).
- **A1 timing:** finish all template steps and **leave it non-empty with ≥3 valid questions as the FINAL action**; post "Template left with N questions." A2/A3/A4 assert structure not an exact count.
- **Each authed agent uses a DIFFERENT (report, candidate)** so candidate-diligence rows don't collide:
  - **A2** → report `6f35ca24` (its own account owns it), candidate "Daughters of Isabella".
  - **A3** → richest report `3b8036df` (if A3's account owns/can-read it; else its own owned report), a distinct candidate.
  - **A4** → a third distinct report/candidate it owns; also drives the cross-advisor 404 probe against a report it does NOT own.
  - Never two agents on the same `(reportId, candidateId)`.
- Concurrency cap: **max 4–6 browser contexts**. Don't spawn extra tabs.

### 2.4 Evidence per step
Screenshot (`agentN-stepID-desc.png`) · console error/warning sweep · for API steps: method + full `/v2/donor-research/…` URL + status + whether body/headers carry identity (mandatory for anonymity steps) · for DB steps: the exact `psql` query + row output.

---

## 3. Five parallel agent worklists

Each step is tagged **[browser]** / **[api]** / **[db]**. Cover happy + edge + failure + boundary. Record the expected `coarseStatus` where relevant.

---

### AGENT A1 — Template editor (account `test-8970`; OWNS template mutations)

Route `/nonprofit-research/diligence-template`. Endpoint `GET`/`PUT /v2/donor-research/me/diligence-template`. Limits: **MAX_QUESTIONS=50**, **TEXT_MAX=1000** (textarea hard cap 1100). Editor supports **drag-and-drop reorder** (`DndContext`).

> **Discrepancy to verify:** the DEV-426 ask mentions a `"Save as my default"` vs `"Apply to this request"` split and an overwrite confirmation. The shipped editor exposes a **single global "Save questions"** (wholesale PUT) + a **clear-all confirmation** only — there is no per-request "apply" path (snapshots are frozen server-side at send). **If the two-mode UI is absent, record it as a spec/UX gap (Low), not a functional FAIL**, and test the actual single-default flow below.

| # | Tag | Action | Expected |
|---|---|---|---|
| A1.1 | [browser] | From `/nonprofit-research` open "Diligence questions". | Lands on editor. Eyebrow "Karma · Nonprofit Research", H1 **"Diligence questions"**, intro "…sent anonymously… editing here only affects future requests." |
| A1.2 | [api] | Watch initial `GET …/diligence-template`. | 200, stable shape `{questions, updatedAt}`. Brand-new advisor → `{questions:[], updatedAt:null}` empty state H2 **"No questions yet"** + "Add your first question". Never 404. |
| A1.3 | [browser] | Add 3 distinct questions ("Add question"). | Rows "1." "2." "3.", live counter "N/1,000", footer "**47 questions remaining.**" (pluralize). |
| A1.4 | [browser] | Clear one row to empty → "Save questions". | Inline "Add a question or remove this row." Save blocked, **no PUT**. |
| A1.5 | [browser] | Paste 1001 chars in a row. | Counter "1,001/1,000" destructive; on save "Use 1,000 characters or fewer."; blocked. |
| A1.6 | [browser] | **Boundary:** add rows to the 50 cap. | At 50, "Add question" **disabled**, footer "You've reached the 50-question limit." No 51st row. |
| A1.7 | [browser] | **Reorder (new):** drag row 3 above row 1. | Order persists in the list; labels renumber; ids unchanged (verify next save). Keyboard drag (Space+arrows) also works. |
| A1.8 | [api][db] | Trim to 3 valid → "Save questions". | "Saving…" → toast **"Diligence questions saved."** `PUT` body `questions[]` of `{id,text}` → 200 `{questions, updatedAt}`. "Last saved …" updates. **[db]** `SELECT questions FROM donor_research_diligence_template WHERE advisor_id=…` matches. |
| A1.9 | [api] | **ID stability:** note ids; edit row 2 text; re-save. | Row 2 `id` unchanged; new rows get fresh opaque (uuid-like) ids, never array indices. |
| A1.10 | [browser] | Remove row 1 (trash); re-save. | Remaining ids preserved; labels renumber only; caret not lost. |
| A1.11 | [browser][api] | **Clear-all confirm:** empty all rows → "Save questions". | Dialog **"Clear your diligence questions?"** (copy notes already-sent snapshots kept), "Clear questions"/"Cancel". Cancel → **no PUT**. |
| A1.12 | [api] | Re-empty → confirm "Clear questions". | `PUT {questions:[]}` → 200; editor returns to empty state. |
| A1.13 | [api] | **Duplicate-id guard:** if reachable via tooling, PUT two questions with the same `id`. | **422** (FE owns stable ids, so this is a backend-contract check). |
| A1.14 | [browser] | Reload after a save. | Re-hydrates from server; no stale/duplicate rows; background refetch with same `updatedAt` doesn't clobber. |
| A1.15 | [api] | **FINAL (mandatory):** leave ≥3 valid questions saved; post "Template left with N questions." | Persisted non-empty (A2–A4 depend on it). |

**A1 dogfood:** pluralization at 49 rows ("1 question remaining" singular), disabled-state clarity, empty→clear discoverability, drag a11y, mobile width, dark-mode counter contrast.

---

### AGENT A2 — Ask Questions full flow (account `test-9744`; report `6f35ca24`; READ-ONLY template)

Surface: expand candidate → footer → **AskQuestionsDialog**. Endpoints `GET …/diligence`, `POST …/diligence-requests`.

| # | Tag | Action | Expected |
|---|---|---|---|
| A2.1 | [browser] | Open report `6f35ca24`, **expand** "Daughters of Isabella". | Footer mounts: status area + "Ask questions" (outline) + "Connect". Record reportId+candidateId. |
| A2.2 | [api] | Watch `GET …/diligence`. | 200 with `coarseStatus`, `actions.canAskQuestions/canConnect`. Button disabled-state matches `actions.*`, NOT the badge. Initial expected `coarseStatus: not_requested` (no badge). |
| A2.3 | [browser] | Click "Ask questions". | Dialog "Ask questions anonymously"; description "Your identity is never shared — they only see that a funder is interested." |
| A2.4 | [browser] | With A1's non-empty template, observe preview. | Header "**N questions will be sent**" (pluralized), ordered `1. 2. 3.` of question texts (live template since no prior request). "Send questions" enabled. |
| A2.5 | [browser] | **Empty-template path (opportunistic):** if template ever empty, dialog shows "You haven't added any diligence questions yet…" + "Edit your question template" link → editor; Send disabled. Else mark SKIPPED (A1 owns template). | Guard copy + link when empty. |
| A2.6 | [api][db] | Click "Send questions". | Button loading → `POST …/diligence-requests` **202** `{requestId, coarseStatus:"in_progress"}`. Toast "Questions sent", dialog closes. **[db]** new `donor_research_diligence_request` row exists with `questions_snapshot` frozen, `status='email_queued'` (or `contact_blocked`), `target_email_encrypted` non-null **ciphertext**. |
| A2.7 | [api] | **★G2 anonymity:** inspect the POST body + headers. | Empty/minimal body; only `Authorization` header carries identity; **no advisor name/email/wallet** anywhere. |
| A2.8 | [api] | Post-send refetch `GET …/diligence`. | Re-fetched badge "Questions sent" (`in_progress`). `actions.canAskQuestions` likely now `false`. |
| A2.9 | [api][db] | **★G1 anonymity in email:** read the diligence outbox/email HTML for this request. | HTML has org name + questions only. Grep for advisor name / email substring / `0x9b75` / donor handle → **all absent**. Recipient redirected to `arthur@karmahq.xyz`. |
| A2.10 | [api][db] | **Idempotency / duplicate candidate:** re-POST `…/diligence-requests` for the SAME candidate (with and without re-using the `Idempotency-Key`). | Collapses to the SAME `requestId` — no second DB row (partial unique `uq_diligence_request_idempotency`). Safe retry. Record both header variants. |
| A2.11 | [browser] | **Double-click guard:** click "Send questions" twice same-tick. | At most one POST should be the canonical request; backend dedupes regardless. Note if 2 POSTs fire (Low — known FE same-tick gap on the public form; check advisor side too). |
| A2.12 | [browser][api] | **Frozen-snapshot integrity:** after A1 edits the template, reopen Ask preview / answers for the already-sent request. | Renders against `request.questions` (frozen), NOT the live template. |
| A2.13 | [api][db] | **blocked path:** trigger/observe a candidate with no safe contact. | Next view `coarseStatus:"blocked"` → badge "Couldn't reach". **[db]** row `status='contact_blocked'`, no outbox send, no Mailgun call. |
| A2.14 | [api] | **answered render (if a token is submitted by A5/ops):** observe view. | `coarseStatus:"answered"` (unless intro outranks); `latestAnswers` populated; "Nonprofit's response" panel renders answers keyed to frozen snapshot; missing → italic "No answer provided". |
| A2.15 | [db] | **Token hand-off to A5:** read the plaintext response token from the outbox/email for the A2.6 request. Build `http://localhost:3000/nonprofit-research/diligence/<token>` and pass to A5. | Token captured from outbox (never from FE). |

**A2 dogfood:** focus-trap + Escape on dialog, pluralization at N=1 ("1 question will be sent"), badge contrast light/dark, send-then-immediately-close behavior.

---

### AGENT A3 — Connect / named-intro flow (account `test-7095`; its own distinct report/candidate)

Surface: expand candidate → footer → **ConnectDialog**. Endpoints `POST …/intro-requests` (202 queued | 202 blocked | 422 email), `PUT /v2/donor-research/me {email}` (⚠ UNVERIFIED).

| # | Tag | Action | Expected |
|---|---|---|---|
| A3.1 | [browser] | Expand a distinct candidate, click "Connect" (disabled when `canConnect=false`). | Dialog step "confirm", title "Send a named intro". |
| A3.2 | [browser] | **★G7 identity-reveal copy.** | "Connecting reveals your identity to this nonprofit, along with any answers they've already shared. Karma sends them a warm intro on your behalf." This is the ONLY reveal announcement; requires explicit confirm. |
| A3.3 | [browser][api] | Click "Cancel". | Dialog closes; **no** network call. |
| A3.4 | [api][db] | Reopen → "Send intro". | `POST …/intro-requests` **202** `{introRequestId, coarseStatus:"intro_sent"}`. Toast "Intro sent", dialog closes, view invalidates. **[db]** `donor_research_intro_request` row with encrypted target + `qa_context_snapshot`. |
| A3.5 | [api] | Observe post-intro footer. | Badge "Intro sent" (`intro_sent` outranks diligence). Muted label "Intro queued" if `sentAt` null, else "Intro sent {relative}". `actions.canConnect:false`. |
| A3.6 | [db] | **★G7 intro email vs diligence email.** | Intro outbox HTML **DOES** contain advisor identity + verbatim Q&A (truncated via `truncateForEmail`). The diligence email for the same candidate (if any) still has none. Reply-To = advisor's email; BCC redirected to `arthur@`. |
| A3.7 | [api] | **blocked Connect:** candidate with no resolvable nonprofit email. | `POST` **202** `{coarseStatus:"blocked"}`, `intro:null` on GET. Badge "Couldn't reach", NOT "Intro sent". |
| A3.8 | [api][browser] | **422 email-capture branch:** advisor with no resolvable email. | `POST` **422** `{requiredFields:["email"], message}` — **no intro row created**. Dialog switches to "email" step: title "Add your email", input `#advisor-email`, "Save and send intro". |
| A3.9 | [browser] | Email step: submit invalid ("not-an-email") then empty. | Inline "Enter a valid email address."; no PUT fires. |
| A3.10 | [api] | Enter valid email → "Save and send intro". | `PUT /v2/donor-research/me {email}` (⚠ **UNVERIFIED** — record exact status/shape). On success, dialog **auto re-attempts** `POST …/intro-requests`. |
| A3.11 | [api] | Observe auto-retry. | 202 → "Intro sent", closes. 422 again → error toast + email step stays. |
| A3.12 | [browser] | **UNVERIFIED-endpoint failure:** if `PUT /me` 404s. | Toast "Couldn't save your email. Please try again."; dialog stays; no crash. **Flag the UNVERIFIED contract prominently.** |
| A3.13 | [browser] | Reopen Connect after closing mid-email-step. | Resets to "confirm" step, email cleared (reset-on-open). |
| A3.14 | [api] | **intro_sent outranks answered:** on a candidate that is both answered AND has an intro. | `coarseStatus:"intro_sent"` (not "answered"); badge "Intro sent"; `latestAnswers` may still be populated for the answers panel. |
| A3.15 | [browser] | Hard error (5xx/network) on confirm. | Toast "Couldn't send the intro. Please try again."; dialog stays; no identity leak, no crash. |

**A3 dogfood:** UNVERIFIED `PUT /me {email}` is highest risk — confirm it actually persists (if it silently 200s without persisting, the re-attempt loops). Double-fire guard on "Send intro", email `autocomplete`, irreversibility clarity of the reveal.

---

### AGENT A4 — Cross-cutting: anonymity gate, scoping, resolver agreement, a11y (account `test-3620`)

Covers G5/G6, cross-advisor 404, POST-vs-GET resolver agreement, blocked/needs-contact, shared-view absence, console, a11y, responsive.

| # | Tag | Action | Expected |
|---|---|---|---|
| A4.1 | [browser] | Expand candidates on your owned report; confirm footer on lead, runner-up, AND "also considered" cards. | Footer with Ask/Connect on all candidate types (advisor variant only). |
| A4.2 | [api][browser] | **★G5 — generate donor share link** ("Share with donor" → "Copy share link"), open `/nonprofit-research/shared/[token]`, expand EVERY candidate. | Shared view renders report but **NO** diligence footer/buttons/badges/answers/"Intro sent". DOM grep for "Ask questions"/"Connect"/"Questions sent" → **absent**. Any diligence UI here = **BLOCKER**. |
| A4.3 | [api] | **★G5 payload:** inspect `GET …/shared/:token`. | No diligence/advisor-identity fields. |
| A4.4 | [api] | **Cross-advisor 404 scoping:** as `test-3620`, `GET /v2/donor-research/reports/3b8036df…/candidates/<id>/diligence` (a report owned by `0xbe6328` "QA Advisor 3", NOT this account). Repeat for `POST …/diligence-requests` and `…/intro-requests`. | **404** for all (never 403 — no existence leak). The `privy_user_id`=wallet boundary must scope correctly. |
| A4.5 | [api] | **Resolver agreement (POST vs GET):** for a candidate, capture the `coarseStatus` in the 202 POST body, then immediately `GET …/diligence`. | Identical `coarseStatus` (one shared resolver). Run for in_progress, blocked, intro_sent. |
| A4.6 | [browser][api] | **Button-gating semantics:** find a candidate where badge ≠ button-enablement. | Disabled state derives from `actions.*`; badge from `coarseStatus`; independent. |
| A4.7 | [browser] | **Badge mapping:** confirm all observable labels. | `in_progress`→"Questions sent", `answered`→"Answered", `blocked`→"Couldn't reach", `intro_sent`→"Intro sent", `not_requested`→**no badge**. |
| A4.8 | [db] | **★G6 PII at rest:** `SELECT target_email_encrypted, target_email_hash, response_token_hash FROM donor_research_diligence_request LIMIT 5;` and same for intro/response tables. | `*_encrypted` is binary ciphertext (not readable email); `*_hash` is HMAC/SHA-256; **no plaintext** email/answers/token in any column. |
| A4.9 | [browser] | Footer **loading** (hard reload) and **error** (throttle/offline) states. | "Loading actions…" spinner; "Couldn't load actions." + working "Retry". Never `null`/blank. |
| A4.10 | [browser] | **Console sweep** across report view, Ask dialog, Connect dialog, shared view, template editor (read-only). | No uncaught errors, no React key/hydration warnings. List anything red. |
| A4.11 | [browser] | **A11y/keyboard** Ask + Connect dialogs: open via keyboard, Tab focus-trap, Escape closes, focus returns to trigger, `role="dialog"` + accessible title. | Keyboard-operable, focus trapped + restored, labelled. |
| A4.12 | [browser] | **Contrast** spot-check badges + destructive counter in light AND dark mode. | Meets contrast. |
| A4.13 | [browser] | **Responsive** footer + both dialogs at ~375px and 1280px. | Wraps gracefully, no overflow/clipping. |

**A4 dogfood:** be adversarial on share-link anonymity (view source, search JSON, open shared link in clean context). Hunt identity bleeding into tooltips/aria-labels, badge↔button spacing, why disabled buttons are disabled.

---

### AGENT A5 — Public nonprofit response page (NO auth; distinct profile; never logs in)

Route `/nonprofit-research/diligence/[token]`. Endpoints `GET`/`POST /v2/donor-research/diligence-response/:token`. Limits: **MAX_ANSWERS=50**, **TEXT_MAX=5000**, ≥1 non-empty required. Get a valid token from A2.15 (outbox). The page hook uses `staleTime:0/gcTime:0`.

| # | Tag | Action | Expected |
|---|---|---|---|
| A5.1 | [browser][api] | Fresh profile, navigate `/nonprofit-research/diligence/bogus-token-123`. | Loads with **no login prompt**. Skeleton → "This link is no longer valid" card. `GET` → **404** (unknown). |
| A5.2 | [browser] | **★G4** DOM grep the invalid page for advisor/donor/contact identity. | None (not even orgName on the invalid page). No "Karma advisor", email, wallet. |
| A5.3 | [browser][api] | **noindex + no-store + Origin:** check meta robots, response `Cache-Control: no-store`, and standalone layout. | `robots: noindex,nofollow`; `no-store` on GET; standalone `<main>` (note: prior run flagged F1 — global app chrome still renders; record as Low if so). |
| A5.4 | [browser][api] | Transient GET failure (offline/throttle, non-404). | "Couldn't load this request" card + "Try again" (distinct from "no longer valid"). |
| A5.5 | [browser][api] | **Valid token** (from A2.15) load. | Skeleton → H1 "You've received a research request" (+ "for {orgName}"), question fields (Label = question text + Textarea placeholder "Type your answer (optional)" `maxLength=5000`), "This link expires on {date}." `GET` **200**. |
| A5.6 | [browser][api] | **★G3/G4** scan payload + DOM. | `GET` returns ONLY `{orgName, questions, alreadySubmitted, expiresAt}` — no advisor/donor/contact/token-of-advisor. Page shows none. |
| A5.7 | [browser] | Submit label pluralizes: "Submit answers" (>1) / "Submit answer" (1). | Correct. |
| A5.8 | [browser][api] | **Empty submit** (all blank). | Array error "Please answer at least one question before submitting." + toast. **No POST.** |
| A5.9 | [browser] | **Char cap:** type/paste 5001 chars. | Textarea hard-caps at 5000; if bypassed, zod "Answers must be 5000 characters or fewer." Can't submit >5000. (Backend returns **400** on shape >5000 — Low contract note, no FE impact.) |
| A5.10 | [browser][api][db] | Fill ONE answer, leave others blank, Submit. | Only non-empty answers sent. `POST` **201** `{accepted:true, submitted:true}`. Toast "Thanks — your answers were received." Flips to thank-you. **[db]** `donor_research_diligence_response` row `status='accepted'`; the matching request `answered_at` set, `latestAnswers` populated on advisor view (regression B3). |
| A5.11 | [api] | **First-accepted-wins / resubmit no-op:** POST again to the SAME (now-answered) token sequentially. | **201** `{accepted:false, submitted:true}` (NOT 500 — regression **B2**). No DB clobber; loser row `status='duplicate'`. |
| A5.12 | [browser] | **accepted:false success path.** | FE shows thank-you on `accepted:false` 201, no error. |
| A5.13 | [browser][api] | **alreadySubmitted:** reload the answered token. | Form HIDDEN; thank-you card "Thanks — your answers were received". `GET` shows `alreadySubmitted:true`. |
| A5.14 | [api] | **Rate-limit (fail-closed):** burst ~12 POSTs within 60s. | First ≤10 processed; **≥2 → 429** (atomic INCR+EXPIRE per (IP, tokenHash)). Toast "Please wait a moment and try again." Form preserved, no auto-retry. Confirm 429 also fires if Redis is degraded (fail closed, never fail open). |
| A5.15 | [api] | **422 unknown question id:** POST a `questionId` not in the snapshot. | **422**. Toast "Some answers couldn't be accepted. Please review and try again." Form preserved. |
| A5.16 | [api] | **Origin enforcement:** POST with a foreign/missing `Origin` header. | **403** (cross-origin). Same-site fetch satisfies it. |
| A5.17 | [browser][api] | **Expired token → 404/410 collapse.** If a token can be expired (or TTL forced), load it. | Public surface shows "This link is no longer valid" (410 collapsed to 404 by design). Indistinguishable from unknown. |
| A5.18 | [browser] | **Token scrubbing:** check console/network logs + any Sentry breadcrumb. | Plaintext token never logged; only hash referenced server-side. |
| A5.19 | [browser] | a11y/keyboard: Tab through fields (each labelled by its question), submit reachable, "Submitting…" + `aria-busy` while pending. | Keyboard-operable, labelled, busy announced. |
| A5.20 | [browser] | Responsive ~375px + desktop; weird tokens (very long, URL-encoded, empty segment). | Single-column readable; weird tokens → graceful 404, no crash. |

**A5 dogfood:** adversarial identity-leak hunt (G3/G4). Is "optional per question but ≥1 required" obvious? Expiry clarity, thank-you finality, submit pluralization at 1, raw ALL-CAPS orgName (prior dogfood note — consider title-casing), the **~8× duplicate GET-context refetch on load** (staleTime:0/gcTime:0 + remounts — efficiency Low).

---

## 4. Regression checks (previously found + fixed — must stay GREEN)

| ID | Bug (resolved) | Regression assertion | Owner | Tag |
|---|---|---|---|---|
| **B1** | coarseStatus didn't flip to `intro_sent` after Connect (`intro` returned null; POST said `blocked`, GET said `in_progress`). | After `POST …/intro-requests` 202, GET returns `coarseStatus:"intro_sent"` with `intro.introRequestId` == the POST id; `intro_sent` outranks `answered` AND `blocked`; POST & GET agree. | A3 (A4 resolver agreement) | [api] |
| **B2** | Sequential resubmit to an already-answered token returned **500**. | Sequential resubmit → **201** `{accepted:false, submitted:true}`, no 500, no clobber. (Concurrent resubmit also → one `accepted:true` + one `accepted:false`, both 201.) | A5 (A5.11) | [api] |
| **B3** | Accepted answers never surfaced in candidate view (`answeredAt` set but `latestAnswers` stayed null). | After a nonprofit submit, advisor `GET …/diligence` returns `latestAnswers:{answers:{qId:text}, receivedAt}`; DiligenceAnswers panel renders against the frozen snapshot. | A2 (A2.14) + A5 (A5.10) | [api][browser] |

---

## 5. Idempotency / security matrix (cross-agent — assert each cell)

| Property | Assertion | How | Owner | Tag |
|---|---|---|---|---|
| Duplicate diligence request collapses | Re-POST (same candidate, ±Idempotency-Key) → same `requestId`, **no** second DB row (partial unique `uq_diligence_request_idempotency`). | re-POST + `SELECT count(*) … WHERE research_report_candidate_id=…` | A2.10 | [api][db] |
| One accepted response per request | 2nd accepted submit blocked by `uq_diligence_response_one_accepted` (`WHERE status='accepted'`); loser stored `duplicate`. | A5 resubmit + `SELECT status FROM donor_research_diligence_response` | A5.11 | [api][db] |
| Token hashed, not plaintext | `response_token_hash` = SHA-256; plaintext token never persisted/logged. | `SELECT response_token_hash …` + log/console grep | A4.8 / A5.18 | [db][browser] |
| Target email encrypted | `target_email_encrypted` = AES-GCM ciphertext; `target_email_hash` = HMAC; no plaintext column. | `psql` row inspection | A4.8 | [db] |
| No PII in telemetry | No raw email/answers/token in Sentry breadcrumbs/tags or console. | console + network sweep | A4.10 / A5.18 | [browser] |
| Rate-limit fail-closed | >10/60s per (IP, tokenHash) → 429; Redis-down still 429 (never open). | burst test | A5.14 | [api] |
| Cross-advisor scoping → 404 | Other advisor's report/candidate read+write → 404, not 403. | A4 cross-advisor probe | A4.4 | [api] |
| Origin enforcement | Foreign Origin on public POST → 403. | A5.16 | A5.16 | [api] |
| Outbox idempotent / no double-send | Two sweeper ticks never double-send (lease `*_locked_at`); `email_sent` only after provider returns. | `SELECT outreach_locked_at, outreach_sent_at, outreach_retry_count …` | A4 (spot) | [db] |

---

## 6. Dogfooding pass (woven into every agent)

Each agent freely explores its surface and logs rough edges with full repro evidence. Hunt specifically:

- Broken/empty/loading/error states that flash, stick, or render `null`.
- **Mis-pluralization** ("1 questions", "0 answers", "1 days left") — use `pluralize`; verify at counts 0/1/2.
- Conditional blocks tied to a count must hide when 0.
- Layout/contrast, especially **dark mode** and **375px**.
- Disabled controls with no explanation; destructive actions without confirmation.
- **Console errors / React key / hydration warnings.**
- The **~8× duplicate GET-context refetch** on the public response page load (efficiency, Low) — confirm whether it also occurs on the report list / candidate view.
- Raw ALL-CAPS orgName on the public page (humanize?).
- Public page / shared page rendering inside full app chrome (prior **F1** — standalone expected; record intended-vs-fix).
- **Any anonymity smell → escalate to BLOCKER immediately.**

Log each finding:
```
### ISSUE: <one-line title>   [Severity: BLOCKER | High | Medium | Low]
- Surface/URL:
- Repro: 1) … 2) … 3) …
- Expected / Actual:
- Evidence: <screenshot / network status / psql output>
- Tag: [browser] | [api] | [db]
```

---

## 7. Per-agent reporting template

```
# Agent AN report — <surface>
- Account: test-XXXX@privy.io  (A5: none)
- Backend: LIVE | ABSENT  (first GET …/diligence returned: <status>)
- Report/candidate used: <reportId> / <candidateId>
- Template left state (A1 only): N questions
- Valid response token obtained (A5): yes/no (source: outbox)

## Step results
| Step | Tag | Result | coarseStatus seen | Evidence | Notes |
|------|-----|--------|-------------------|----------|-------|
| AN.1 | [browser] | PASS/FAIL/SKIPPED/BLOCKER | … | aN-1-*.png | … |

## Anonymity gate (G1–G7 relevant to this agent)
- [ ] No advisor/donor/contact identity leaked pre-Connect (payload + DB + email HTML)
- Findings:

## Regression checks (B1/B2/B3 if owned)
- B?: PASS/FAIL + evidence

## Security/idempotency matrix cells owned
- <cell>: PASS/FAIL + psql/network evidence

## Dogfooding issues
<ISSUE blocks per §6>

## Summary
- Totals: X PASS / Y FAIL / Z SKIPPED / B BLOCKER
- Top risks:
- UNVERIFIED contracts (A3: PUT /v2/donor-research/me {email}):
```

### Orchestrator roll-up gate
- **Ship-blocking:** ANY anonymity BLOCKER (G1–G7); any regression FAIL (B1/B2/B3); any security-matrix FAIL (token plaintext, unencrypted email, cross-advisor 403/200, rate-limit fail-open, Origin not enforced).
- **High:** advisor cannot read answers; resolver POST/GET disagreement; UNVERIFIED `PUT /me {email}` not actually persisting.
- All 5 agents run **against the same live stack** (FE `:3000` + BE `:3002`) so this is the cross-service E2E gate — no "[NEEDS-BE] deferred."
```
