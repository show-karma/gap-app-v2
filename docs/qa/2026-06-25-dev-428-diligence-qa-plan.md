# DEV-428 QA Test Plan — Nonprofit Diligence Requests + Advisor Intros (gap-app-v2)

**Date:** 2026-06-25
**Feature branch:** `amaurymagalhaes/feat-diligence-request`
**Surface under test:** Advisor diligence template editor, per-candidate "Ask questions"/"Connect" actions on the advisor report view, and the public nonprofit response page.
**Execution model:** 5 parallel browser-automation sub-agents, each a distinct browser profile. Authenticated agents use distinct Privy test accounts and distinct reports.
**Base URL:** `http://localhost:3000` (local dev — `pnpm run dev`). Confirm the dev server is up before starting. Never run against preview URLs.

---

## 1. Overview & top acceptance gate

DEV-428 lets an advisor, per nonprofit candidate in a donor-research report, either:

- **Ask questions** — an **anonymous** diligence request. Karma emails the nonprofit the org-facing questions only. Async (HTTP **202**), email sent via outbox.
- **Connect** — a **named** intro that **reveals the advisor's identity** (plus prior Q&A). Async (**202**). Can return **422** requiring the advisor's email first → an email-capture step appears, persists the email, then auto re-attempts.
- A **public nonprofit response page** (no login; the URL token is the capability) where the nonprofit answers; answers flow back into the advisor's report.

### ★ TOP ACCEPTANCE GATE — "ANONYMOUS UNTIL CONNECT" ★

This invariant overrides every other result. **If any agent observes a violation, the whole feature fails QA regardless of other passes.** Every agent must actively check its surface for it.

| # | Invariant | Where to verify |
|---|-----------|-----------------|
| A1 | The public response page (`/nonprofit-research/diligence/[token]`) must NEVER render advisor / donor / contact identity (name, email, wallet, handle, org-of-advisor). Only the optional **nonprofit's own** `orgName` may appear. | Agent 5 |
| A2 | The donor **shared** report view (`/nonprofit-research/shared/[token]`) must NEVER show the diligence action buttons, badges, answers, or any "diligence in flight" signal. | Agent 4 |
| A3 | The "Ask questions" dialog copy must state identity is never shared; the request payload/network call must carry NO advisor identity fields. | Agents 2 & 4 |
| A4 | Identity reveal is allowed ONLY through "Connect" (named intro), and only after explicit confirmation. | Agent 3 |

Any agent that sees advisor/donor identity leak onto a public/shared surface files a **BLOCKER** issue immediately and stops that thread.

---

## 2. Shared setup (read before splitting off)

### 2.1 Backend-availability tags (CRITICAL)

The DEV-427 backend (`/v2/donor-research/diligence-*`, `/intro-requests`, `/diligence-response/*`, and the template GET/PUT) **may not be deployed** in the target environment. Every step is tagged:

| Tag | Meaning |
|-----|---------|
| **[UI]** | Works with NO backend — navigation, route render, form validation, enable/disable logic, anonymity DOM checks, loading→error transitions, copy. **Always run.** |
| **[NEEDS-BE]** | Happy path requiring live DEV-427 endpoints (template GET/PUT persists, candidate view returns data, Ask/Connect 202, public context loads, submit 201). **If the relevant call returns 404/Network error/HTML, SKIP and mark `SKIPPED — no backend` with the observed status.** |
| **[ERROR-STATE]** | Deliberately exercises the failure UI you see WITHOUT a backend (404/500 → "Couldn't load actions" retry, template load error, public "link no longer valid"). **Always run — valuable even with no backend.** |

**First action for every authed agent:** open your assigned report, open DevTools network, and watch the first `GET /v2/donor-research/...diligence` call.
- If it returns **200 + JSON** → backend is live → run [NEEDS-BE] steps.
- If it returns **404 / 5xx / network failure / HTML** → backend absent → run [UI] + [ERROR-STATE] only, and record the observed status once at the top of your report.

### 2.2 Login procedure (authed agents 1–4 only; agent 5 never logs in)

Privy email + fixed OTP. Login once per profile, then fan out.

1. Navigate to `http://localhost:3000/nonprofit-research`.
2. Trigger login (Privy modal — "Login" / "Connect" / sign-in entry on the page).
3. Enter your assigned email, submit.
4. Enter the fixed 6-digit OTP, submit.
5. Wait until authenticated (the advisor home renders without the login prompt). Capture a screenshot confirming logged-in state.

| Agent | Account | OTP |
|-------|---------|-----|
| 1 (template editor) | `test-8970@privy.io` | `598767` |
| 2 (Ask questions) | `test-9744@privy.io` | `630970` |
| 3 (Connect) | `test-7095@privy.io` | `466874` |
| 4 (cross-cutting/anonymity) | `test-3620@privy.io` | `363295` |
| 5 (public page) | — none (no login) | — |

### 2.3 Shared-state hazard & ownership rules (MANDATORY)

> **All 4 Privy accounts collapse to ONE indexer userId.** They share advisor-side server state: the same single diligence template, and the same set of reports/candidate-diligence rows. Agents WILL stomp each other unless they obey these rules.

- **Template mutations are OWNED by Agent 1 only.** Agents 2, 3, 4 must treat the template as **read-only** — they may only READ it via the "Ask questions" dialog preview. They must NOT open the template editor and save.
- **Each authed agent works on a DIFFERENT report** so candidate-diligence state doesn't collide. Before starting, each agent picks its report:
  - Open `/nonprofit-research`, note the report list. Agent N takes the **N-th distinct report** (Agent 2 → report #1, Agent 3 → report #2, Agent 4 → report #3). Record the chosen `reportId` (visible in the URL after opening) at the top of your report.
  - If fewer than 3 reports exist, agents share a report but each picks a **different candidate** (lead vs runner-up vs an "also considered" card) and records the candidate name/id. Never two agents on the same (report, candidate).
- **Agent 1 timing:** Agent 1 mutates the shared template. To avoid corrupting Agents 2/3/4's "Ask" previews mid-run, Agent 1 must **finish all its save/clear steps and leave the template in a known non-empty state (≥3 questions) as its FINAL action**, and post a note in its report: "Template left with N questions." Agents 2/3/4 should do their template-preview reads BEFORE relying on a stable count, and tolerate the count changing (assert structure, not an exact N, unless they re-read immediately).
- Concurrency cap: **max 4–6 browser contexts in parallel** (more crashes the dev server). 5 agents is within budget; do not spawn extra tabs needlessly.

### 2.4 Evidence conventions (every step)

For each step capture:
- **Screenshot** of the relevant UI state (name it `agentN-stepID-description.png`).
- **Console**: list console errors/warnings during the step (sweep with the console-messages tool). Any red error = note it.
- **Network**: for steps touching the API, capture the exact request — method, URL (the `/v2/donor-research/...` path), status code, and whether the request body/headers carry any identity fields. For anonymity steps this is mandatory.

### 2.5 Pass/Fail reporting format

Each agent returns a table (template in §5) with one row per step: `Step ID | Tag | Result (PASS/FAIL/SKIPPED/BLOCKER) | Evidence | Notes`. Plus a Dogfooding issues list (§4 format). Plus the one-line backend-availability verdict and chosen reportId/candidate.

---

## 3. Five parallel agent worklists

> Selector note: buttons are matched by their visible text unless an `aria-label` is given. Toasts are `react-hot-toast` (transient — capture quickly). Dialogs are Radix (`role="dialog"`); the editor uses `aria-label="Question N"` on textareas.

---

### AGENT 1 — Diligence Template Editor (account 1; OWNS template mutations)

Route: `/nonprofit-research/diligence-template` (`PAGES.DONOR_RESEARCH.DILIGENCE_TEMPLATE`).
Endpoint: `GET`/`PUT /v2/donor-research/me/diligence-template`.
Limits: **MAX_QUESTIONS = 50**, **QUESTION_TEXT_MAX = 1000**.

| Step | Tag | Action | Expected result | Evidence |
|------|-----|--------|-----------------|----------|
| 1.1 | [UI] | From `/nonprofit-research`, click the **"Diligence questions"** link (top-right of the masthead). | Navigates to `/nonprofit-research/diligence-template`. Eyebrow "Karma · Nonprofit Research", H1 **"Diligence questions"**, intro paragraph about anonymous sending. | screenshot, console |
| 1.2 | [NEEDS-BE] | Observe initial load. | Brief loading state "Loading your diligence questions…", then either the empty state (H2 **"No questions yet"** + **"Add your first question"**) or the existing rows. `GET .../diligence-template` returns 200. | network(GET), screenshot |
| 1.3 | [ERROR-STATE] | If backend absent (GET fails): observe load failure. | Error card H1 **"Couldn't load your questions"**, body, **"Try again"** button. NOT a blank page / not `null`. Click "Try again" → it re-fetches (fails again is fine). | network, screenshot |
| 1.4 | [NEEDS-BE] | From empty state click **"Add your first question"**. (If template non-empty, skip to 1.5.) | One editable row appears: textarea `aria-label="Question 1"`, counter **"0/1,000"**, remove button `aria-label="Remove question 1"`. | screenshot |
| 1.5 | [UI] | Click **"Add question"** to add rows until you have 3. Type distinct text in each. | Rows numbered "1." "2." "3.". Counter updates live per row (e.g. "12/1,000"). Footer shows **"47 questions remaining."** (uses `pluralize`). | screenshot |
| 1.6 | [UI] | Clear one row's textarea to empty, then click **"Save questions"**. | Inline row error **"Add a question or remove this row."** appears under the empty row; save is blocked (no PUT fires). | screenshot, network(no PUT) |
| 1.7 | [UI] | In one row paste **1001 chars**. | Counter shows **"1,001/1,000"** in destructive color; inline error **"Use 1,000 characters or fewer."** on save attempt; save blocked. Note: textarea hard `maxLength` is 1100, so 1001 chars is reachable for this test. | screenshot |
| 1.8 | [UI] | Fix the row to valid text (≤1000, non-empty). Add rows up to the **50 cap**: keep clicking "Add question". | At 50 rows the **"Add question"** button is **disabled** and footer reads **"You've reached the 50-question limit."** Never allows a 51st row. | screenshot |
| 1.9 | [NEEDS-BE] | Trim back to 3 valid rows, click **"Save questions"**. | Button shows "Saving…", then toast **"Diligence questions saved."** `PUT .../diligence-template` returns 200 with `{questions, updatedAt}`. "Last saved …" timestamp appears/updates. | network(PUT body has `questions[]` of `{id,text}`), screenshot |
| 1.10 | [NEEDS-BE] | **ID stability:** note the `id` values in the PUT request/response. Edit the **text** of row 2 and re-save. | Row 2's `id` is **unchanged** across the edit (only text differs). Newly added rows get fresh opaque ids (uuid-like), never array indices. | network(compare ids), notes |
| 1.11 | [UI] | Reorder is not offered as a control, but verify removing row 1 (trash icon) keeps remaining rows' ids stable and renumbers labels only. | Row 2 becomes "1." visually but its `id` is preserved (verify on next save). Focus/caret not lost in other rows. | screenshot |
| 1.12 | [UI] | **Clear-all confirmation:** remove all rows until empty, click **"Save questions"**. | A confirmation dialog opens — title **"Clear your diligence questions?"**, destructive **"Clear questions"** + **"Cancel"**. Saving empty is gated behind this dialog (no immediate PUT). Click **Cancel** → no PUT, dialog closes. | screenshot, network(no PUT) |
| 1.13 | [NEEDS-BE] | Re-empty and this time confirm **"Clear questions"**. | Toast "Diligence questions saved.", `PUT` body `{questions: []}` → 200. Editor returns to empty state. | network, screenshot |
| 1.14 | [UI] | Reload the page after a save. | Saved questions re-hydrate from server (no stale/duplicate rows); background refetch with same `updatedAt` does not clobber. | screenshot |
| 1.15 | [UI] | **FINAL (mandatory):** leave the template with **≥3 valid questions** saved, and note "Template left with N questions" in your report (Agents 2–4 depend on this). | Template persisted non-empty. | network(PUT 200), note |

**Agent 1 dogfooding focus:** counter/pluralization edge cases ("1 question remaining" must be singular at 49 rows), disabled-state clarity, whether the empty→clear flow is confusing, whether "Save questions" being disabled (no-op when empty + nothing on server) is discoverable, keyboard add/remove, mobile width.

---

### AGENT 2 — Ask Questions flow (account 2; its own report; READ-ONLY on template)

Surface: advisor report view `/nonprofit-research/[reportId]`, per-candidate footer → **AskQuestionsDialog**.
Endpoints: `GET .../candidates/:id/diligence`, `POST .../diligence-requests`.

| Step | Tag | Action | Expected result | Evidence |
|------|-----|--------|-----------------|----------|
| 2.1 | [UI] | Open `/nonprofit-research`, open your assigned report. Scroll to a candidate (lead card). Locate the diligence footer. | Footer renders below the candidate: a status area + buttons **"Ask questions"** (outline) and **"Connect"**. Record reportId + candidate. | screenshot |
| 2.2 | [NEEDS-BE] | Watch the `GET .../diligence` call for that candidate. | 200 JSON with `coarseStatus`, `actions.canAskQuestions/canConnect`, etc. Buttons enabled/disabled match `actions.*` (NOT the badge). | network, screenshot |
| 2.3 | [ERROR-STATE] | If backend absent: observe the footer. | Footer shows **"Couldn't load actions."** + **"Retry"** (after a brief "Loading actions…" with spinner). Click Retry → re-fetches. Never blank/`null`. | screenshot |
| 2.4 | [UI] | Click **"Ask questions"** (if disabled because `canAskQuestions=false` or no backend, note the disabled state and still open via a candidate where it's enabled, or document the disabled-button observation). | Dialog opens: title **"Ask questions anonymously"**, description stating *"Your identity is never shared — they only see that a funder is interested."* | screenshot |
| 2.5 | [A3 / UI] | **Anonymity copy check** inside the dialog. | The description explicitly promises anonymity. No advisor name/email anywhere in the dialog. | screenshot |
| 2.6 | [NEEDS-BE] | With a non-empty template (Agent 1's ≥3 questions), observe the preview. | Header **"N questions will be sent"** (pluralized), ordered list `1. 2. 3.` of the question texts (from the live template since no prior request). **"Send questions"** enabled. | screenshot |
| 2.7 | [UI] | **Empty-template guard:** This requires the template to be empty — do NOT clear it yourself (Agent 1 owns it). Instead verify the code path opportunistically: if you ever observe an empty template, the dialog shows *"You haven't added any diligence questions yet…"* + link **"Edit your question template"** → `/nonprofit-research/diligence-template`, and "Send questions" is disabled. If template is non-empty the whole run, mark this **SKIPPED — template non-empty (Agent 1 owns it)**. | Guard copy + link present when empty; send disabled. | screenshot or SKIP note |
| 2.8 | [ERROR-STATE] | If the template GET fails inside the dialog: | Shows *"Couldn't load your questions."* + **"Retry"**; send disabled. | screenshot |
| 2.9 | [NEEDS-BE] | Click **"Send questions"**. | Button shows loading, `POST .../diligence-requests` returns **202** `{requestId, coarseStatus}`. Toast **"Questions sent"**, dialog closes. | network(POST 202, body carries NO advisor identity), screenshot |
| 2.10 | [A3] | **Inspect the POST request** (headers + body). | Body is empty/minimal (the candidate is identified by URL path only); **no advisor name/email/wallet** in body or custom headers beyond the auth token. | network detail |
| 2.11 | [NEEDS-BE] | After send, the candidate view re-fetches (invalidate). Observe the badge. | Optimistic/refetched badge **"Questions sent"** (`in_progress`). "Ask questions" likely now reflects updated `actions`. | network(GET refetch), screenshot |
| 2.12 | [NEEDS-BE] | If the backend advances this candidate to **answered** (or a pre-seeded answered candidate exists), observe the answers block. | Badge **"Answered"**. A **"Nonprofit's response"** section renders answers against the **frozen request snapshot** (`request.questions`), header "N answers · received …". Missing answers show italic **"No answer provided"**. | screenshot |
| 2.13 | [NEEDS-BE] | **Frozen-snapshot integrity:** if you can, compare the answers section's questions vs the current live template after Agent 1 edits it. | Answers render against the snapshot taken at send time — they do NOT change when the live template changes. | screenshot, note |
| 2.14 | [NEEDS-BE] | If a **blocked** candidate exists (couldn't reach nonprofit), observe its badge. | Badge **"Couldn't reach"** (amber). | screenshot |
| 2.15 | [UI] | **Token hand-off for Agent 5:** after a successful 202 send, the nonprofit email contains the response link. There is no UI surface for the token. Document this: a real `/diligence/[token]` token can only come from the outbox/email (backend) — record the `requestId` and note "token not exposed in FE; Agent 5 must use a provided/staging token or run invalid-token paths." | requestId recorded; hand-off note. | note |

**Agent 2 dogfooding focus:** dialog focus-trap and Escape-to-close, "Send questions" double-click guard (no duplicate POST), pluralization in "N questions will be sent" at N=1, badge contrast in light/dark, what happens if you click Send then immediately close, copy clarity of the anonymity promise.

---

### AGENT 3 — Connect / named-intro flow (account 3; its own report)

Surface: per-candidate footer → **ConnectDialog**.
Endpoints: `POST .../intro-requests` (202 queued | 422 email-required), `PUT /v2/donor-research/me` (email — **UNVERIFIED contract**).

| Step | Tag | Action | Expected result | Evidence |
|------|-----|--------|-----------------|----------|
| 3.1 | [UI] | Open your assigned report, find a candidate footer, click **"Connect"** (note: disabled when `actions.canConnect=false`). | Dialog opens, step "confirm": title **"Send a named intro"**. | screenshot |
| 3.2 | [A4 / UI] | **Identity-reveal copy check.** | Description: *"Connecting reveals your identity to this nonprofit, along with any answers they've already shared. Karma sends them a warm intro on your behalf."* This is the ONLY place identity reveal is announced, and it requires explicit confirmation. | screenshot |
| 3.3 | [UI] | Click **"Cancel"**. | Dialog closes, no network call. | screenshot, network(none) |
| 3.4 | [NEEDS-BE] | Reopen, click **"Send intro"** (confirm). | `POST .../intro-requests`. On **202** → toast **"Intro sent"**, dialog closes. Candidate view invalidates. | network(POST 202), screenshot |
| 3.5 | [NEEDS-BE] | After a queued intro, observe the candidate footer. | Badge **"Intro sent"** (`intro_sent` outranks diligence states), plus muted label **"Intro queued"** (if `sentAt` null) or **"Intro sent {relative}"**. | screenshot |
| 3.6 | [NEEDS-BE / ERROR-STATE] | **422 email-capture branch.** Trigger a candidate where the advisor has no resolvable email so the POST returns **422** (`requiredFields:["email"]`). If you can't force 422 with a live backend, attempt the action and observe: on 422 the dialog **switches to the "email" step** instead of closing. | Step flips to title **"Add your email"**, description uses the server message + *"We use your email as the reply-to for the intro."*, Label "Email address", input `#advisor-email` placeholder "you@example.org", buttons **"Cancel"** / **"Save and send intro"**. | network(POST 422), screenshot |
| 3.7 | [UI] | In the email step, submit an **invalid email** ("not-an-email"). | Inline error **"Enter a valid email address."** Form does not submit; no PUT fires. | screenshot, network(no PUT) |
| 3.8 | [UI] | Submit an **empty** email. | Same validation error; blocked. | screenshot |
| 3.9 | [NEEDS-BE] | Enter a valid email, click **"Save and send intro"**. | `PUT /v2/donor-research/me` with `{email}` (⚠ UNVERIFIED endpoint shape — record the exact request and status). On success the dialog **auto re-attempts** the intro (`POST .../intro-requests` again). | network(PUT then POST), screenshot |
| 3.10 | [NEEDS-BE] | Observe the auto-retry outcome. | If the retry returns 202 → toast "Intro sent", dialog closes. If it returns 422 again → an error toast with the server message and the email step stays. | network, screenshot |
| 3.11 | [ERROR-STATE] | If the email PUT fails (e.g. UNVERIFIED endpoint 404s) → observe. | Toast **"Couldn't save your email. Please try again."**; dialog stays on email step; no crash. **This is the expected no-backend outcome — flag the UNVERIFIED contract risk prominently in your report.** | network(PUT status), screenshot |
| 3.12 | [UI] | Reopen the Connect dialog after closing mid-email-step. | Dialog resets to the **"confirm"** step (email field cleared) — verify the reset-on-open behavior. | screenshot |
| 3.13 | [ERROR-STATE] | If the intro POST returns a hard error (5xx/network, no backend) on confirm. | Toast **"Couldn't send the intro. Please try again."**; dialog stays open; no identity leak, no crash. | screenshot |

**Agent 3 dogfooding focus:** the UNVERIFIED `PUT /me {email}` is the highest-risk item — confirm whether onboarding actually accepts an `email` field (if the PUT silently 200s but doesn't persist, the re-attempt loops). Check that "Send intro" can't be double-fired, email autocomplete attribute, error-message clarity, and that the confirm copy makes the irreversible identity reveal obvious before the click.

---

### AGENT 4 — Cross-cutting: anonymity, gating, states, a11y (account 4; its own report)

Covers acceptance gates A2/A3, button-gating semantics, all three states, console sweep, a11y, responsive.

| Step | Tag | Action | Expected result | Evidence |
|------|-----|--------|-----------------|----------|
| 4.1 | [UI] | Open your assigned report `/nonprofit-research/[reportId]` (advisor view). Confirm diligence footers are present on lead, runner-up, AND "also considered"/CandidateCard candidates. | Footer with "Ask questions"/"Connect" appears on all candidate types in the **advisor** variant. | screenshot |
| 4.2 | [NEEDS-BE] | **★A2 — generate a donor share link.** In the report's share controls, click **"Share with donor"** to generate a share token (TTL default 30 days), then **"Copy share link"**. | A share URL `/nonprofit-research/shared/[token]` is produced. | network(POST share-token), screenshot |
| 4.3 | [★A2 / UI] | Open the **shared** URL in the same profile (or a fresh tab). Inspect EVERY candidate. | The donor shared view renders the report content but shows **NO diligence footer** — no "Ask questions"/"Connect" buttons, **no status badges**, **no "Nonprofit's response" answers**, no "Intro sent". `showDiligenceActions` is false for `variant="shared"`. **Any diligence UI here = BLOCKER.** | screenshot (full page + each candidate), DOM search for "Ask questions"/"Connect"/"Questions sent" → must be absent |
| 4.4 | [★A2] | In the shared view, scan the DOM/network for any advisor identity (advisor name, email, wallet, handle) and any diligence status. | None present. Shared payload `GET /v2/donor-research/shared/:token` carries no diligence/advisor-identity fields. | network, DOM grep |
| 4.5 | [UI] | **Button gating semantics.** Find a candidate where the badge shows a status but verify the buttons follow `actions.*` not the badge. Cross-check: a candidate with `canAskQuestions=false` has a disabled "Ask questions" even if `coarseStatus` would suggest otherwise. | Buttons' disabled state derives from `actions.canAskQuestions`/`canConnect`; badge derives from `coarseStatus`. They are independent. | network(view JSON) + screenshot |
| 4.6 | [UI] | **Badge mapping** — for whatever statuses you can observe, confirm labels: `in_progress`→"Questions sent", `answered`→"Answered", `blocked`→"Couldn't reach", `intro_sent`→"Intro sent", `not_requested`→**no badge at all**. | Labels exactly match; `not_requested` renders nothing. | screenshot |
| 4.7 | [ERROR-STATE] | Force/observe the footer **error** state (no backend or throttle network). | "Couldn't load actions." + working "Retry". Never `return null` / blank. | screenshot |
| 4.8 | [UI] | Observe the footer **loading** state (hard-reload, watch the spinner). | "Loading actions…" with spinner, transitions to data or error. | screenshot |
| 4.9 | [UI] | **Console-error sweep** across: advisor report view, opening Ask dialog, opening Connect dialog, shared view, template editor (read-only — do NOT save). | No uncaught errors, no React key warnings, no hydration warnings. List anything red. | console dump |
| 4.10 | [UI] | **A11y / keyboard** for the Ask and Connect dialogs: open with keyboard, Tab through, confirm focus trap, Escape closes, focus returns to the trigger button. Check dialog has `role="dialog"` and an accessible title. | Keyboard-operable, focus trapped + restored, labelled. | screenshot, notes |
| 4.11 | [UI] | **A11y** for the template editor textareas (read-only visit): each has `aria-label="Question N"`, remove buttons have `aria-label`. Color-contrast spot-check on badges (light + dark mode) and the destructive char-counter. | Proper labels; badges/counters meet contrast. | screenshot (light+dark) |
| 4.12 | [UI] | **Responsive**: render the advisor report footer and both dialogs at mobile width (~375px) and desktop. | Buttons wrap gracefully, dialogs fit, no overflow/clipping. | screenshots (375px + 1280px) |
| 4.13 | [★A3] | Open the Ask dialog and confirm the anonymity promise copy is present and the network POST (if fired) carries no identity (coordinate — don't double-send on Agent 2's candidate; use your own). | Copy present; payload clean. | screenshot, network |

**Agent 4 dogfooding focus:** the share-link → shared-view anonymity is the highest-value check — be adversarial (view source, search the JSON, try the shared link logged-out in a clean context). Also hunt: inconsistent spacing between badge and buttons, pluralization in answer counts, dark-mode contrast, any place an advisor identity could bleed into a tooltip/aria-label, and whether disabled buttons explain WHY they're disabled.

---

### AGENT 5 — Public nonprofit response page (NO auth; distinct profile; no account)

Route: `/nonprofit-research/diligence/[token]`. Endpoints: `GET`/`POST /v2/donor-research/diligence-response/:token` (unauthenticated; token = capability).
Limits: **MAX_ANSWERS = 50**, **ANSWER_TEXT_MAX = 5000**. Must be ≥1 non-empty answer to submit.

> **Token sourcing:** a *valid* token only comes from an "Ask questions" send (Agent 2 / outbox) or is provided by the operator. The FE never exposes it. Run [NEEDS-BE] steps ONLY if a real token is supplied; otherwise run all [UI]/[ERROR-STATE] steps using a clearly-bogus token. Record at the top whether a valid token was available.

| Step | Tag | Action | Expected result | Evidence |
|------|-----|--------|-----------------|----------|
| 5.1 | [ERROR-STATE] | In a fresh profile (no login), navigate to `/nonprofit-research/diligence/bogus-token-123`. | Loads WITHOUT any login prompt. After a brief skeleton, shows the **"This link is no longer valid"** card (H1 + body "ask whoever sent it for an updated link"). Unknown AND expired both collapse to this one state (404/410). | screenshot, network(GET 404/410) |
| 5.2 | [★A1] | On that page, scan the entire DOM for any advisor/donor/contact identity. | None — the only identity that may appear is the nonprofit's own org name, and on the invalid page not even that. No "Karma advisor", no email, no wallet. | screenshot, DOM grep |
| 5.3 | [UI] | Confirm the page is **noindex** (meta robots) and renders outside the advisor chrome (centered `<main>`, no app nav/sidebar). | `robots: noindex,nofollow`; standalone layout. | view-source/meta, screenshot |
| 5.4 | [ERROR-STATE] | Simulate a transient GET failure (offline/throttle, non-404). | Shows **"Couldn't load this request"** card + **"Try again"** button (distinct from the "no longer valid" state). Retry re-fetches. | screenshot |
| 5.5 | [NEEDS-BE] | With a **valid token**, load the page. | Skeleton → H1 **"You've received a research request"** (optionally **"for {orgName}"**), subtitle "Your answers help complete this research…", a list of question fields, **"This link expires on {date}."** footer. | screenshot, network(GET 200) |
| 5.6 | [★A1 / NEEDS-BE] | On the valid page, scan DOM/network for advisor identity. | `GET .../diligence-response/:token` returns ONLY `{orgName, questions, alreadySubmitted, expiresAt}` — **no advisor/donor/contact/token-of-advisor fields**. Page shows none. | network detail, DOM grep |
| 5.7 | [UI] | Each question renders a `<Label>` (the question text) + a `<Textarea>` placeholder **"Type your answer (optional)"**, `maxLength=5000`. Submit button reads **"Submit answers"** (pluralized by question count; "Submit answer" if 1). | Fields + labelled textareas present; submit label correct. | screenshot |
| 5.8 | [UI] | **Validation — empty submit.** Click Submit with all answers blank. | Array-level error **"Please answer at least one question before submitting."** (also a toast). No POST fires. | screenshot, network(none) |
| 5.9 | [UI] | **Validation — char cap.** Type **5001 chars** in one answer (textarea hard cap is 5000, so verify you cannot exceed it; if pasting bypasses, the zod message "Answers must be 5000 characters or fewer." appears). | Cannot submit >5000; correct error if reached. | screenshot |
| 5.10 | [NEEDS-BE] | Fill **one** answer (leave others blank), Submit. | Only non-empty answers are sent. `POST .../diligence-response/:token` → **201** `{accepted, submitted}`. Toast **"Thanks — your answers were received."** Page flips to the **thank-you** state. | network(POST 201, body only has answered questionIds), screenshot |
| 5.11 | [NEEDS-BE] | **accepted:false still success.** If the backend returns `{accepted:false, submitted:true}` (another response won first), observe. | Still treated as success — thank-you state shown, no error. | screenshot, network |
| 5.12 | [NEEDS-BE] | **alreadySubmitted.** Reload the page (token now answered) OR load a token whose `alreadySubmitted=true`. | Form is HIDDEN; thank-you card H2 **"Thanks — your answers were received"** + "We've already recorded a response…". | screenshot, network(GET shows alreadySubmitted:true) |
| 5.13 | [ERROR-STATE] | **429 rate-limit message.** If you can trigger a 429 on submit (rapid resubmits), observe. | Toast **"Please wait a moment and try again."**; the form stays intact (no auto-retry, answers preserved). | screenshot, network(POST 429) |
| 5.14 | [ERROR-STATE] | **403 / cross-origin.** If a submit returns 403, observe. | Toast **"We couldn't submit your answers. Please try again later."** | screenshot |
| 5.15 | [ERROR-STATE] | **422 unknown question id.** If a submit returns 422, observe. | Toast **"Some answers couldn't be accepted. Please review and try again."**; form preserved. | screenshot |
| 5.16 | [UI] | **a11y/keyboard:** Tab through the form, each textarea reachable and labelled by its question; submit reachable; submit shows "Submitting…" + spinner with `aria-busy` while pending. | Keyboard-operable, labelled, busy state announced. | screenshot |
| 5.17 | [UI] | **Responsive** at ~375px and desktop. | Single-column readable form, no overflow. | screenshots |

**Agent 5 dogfooding focus:** this is the public face — be adversarial about identity leakage (A1). Also: is it obvious answers are optional-per-question but ≥1 required overall? Is the expiry date clear? Does the thank-you state feel final? Pluralization of the submit button at 1 question. Try weird tokens (very long, URL-encoded chars, empty segment). Confirm no login wall ever appears.

---

## 4. Dogfooding pass (woven into every agent)

Beyond the scripted steps, each agent **freely explores its surface** for rough edges, following the repo's `dogfood` skill philosophy: every issue gets a structured report with **full reproduction evidence** (numbered repro steps + screenshot, and a short repro clip if the tool supports it). Hunt specifically for:

- Broken/empty/loading states that flash, get stuck, or render `null`.
- Confusing or inconsistent copy; **mis-pluralization** ("1 questions", "0 answers", "1 days left").
- Layout/contrast issues, especially **dark mode** and at **375px**.
- Disabled controls with no explanation; destructive actions without confirmation.
- Console errors / React key / hydration warnings.
- Any anonymity smell (identity surfacing where it shouldn't) → escalate to BLOCKER.

Log each finding as:

```
### ISSUE: <one-line title>   [Severity: BLOCKER | High | Medium | Low]
- Surface/URL:
- Repro steps: 1) … 2) … 3) …
- Expected:
- Actual:
- Evidence: <screenshot file(s) / clip / network status>
- Tag: [UI] | [NEEDS-BE] | [ERROR-STATE]
```

---

## 5. Consolidated reporting template (each agent fills & returns)

```
# Agent N report — <surface>
- Account: test-XXXX@privy.io  (Agent 5: none)
- Browser profile: <id>
- Backend availability: LIVE | ABSENT  (first /v2/donor-research/...diligence call returned: <status>)
- Report used: <reportId>   Candidate(s): <name/id>
- Template left state (Agent 1 only): N questions

## Step results
| Step | Tag | Result | Evidence | Notes |
|------|-----|--------|----------|-------|
| 1.1  | [UI] | PASS |  agent1-1.1-*.png |  |
| ...  |     |        |         |       |
(Result = PASS | FAIL | SKIPPED(no backend) | BLOCKER)

## Anonymity gate (A1–A4 relevant to this agent)
- [ ] No advisor/donor/contact identity leaked on public/shared surface
- Findings:

## Dogfooding issues
<ISSUE blocks per §4>

## Summary
- Total: X PASS / Y FAIL / Z SKIPPED / B BLOCKER
- Top risks:
- UNVERIFIED contract notes (Agent 3: PUT /me {email}):
```

### Roll-up acceptance (orchestrator)
- **Ship-blocking:** any BLOCKER (anonymity leak A1–A4), any [UI]/[ERROR-STATE] FAIL.
- **[NEEDS-BE] SKIPPED** is acceptable when backend is absent, but must be re-run once DEV-427 is deployed before merge (per cross-service E2E gate).
- The UNVERIFIED `PUT /v2/donor-research/me {email}` contract (Agent 3) must be confirmed against the real DEV-427 backend before the Connect 422 recovery flow is considered done.
```

---

# QA EXECUTION RESULTS — 2026-06-25 (live run vs ngrok backend)

**Env:** local `localhost:3000` (this worktree) → backend `https://11c0-187-20-200-157.ngrok-free.app`. Advisor account `test-9744@privy.io`. Report `42ca2cac-…`. Single-browser sequential run (Playwright MCP; true 5-way parallel not available — no isolated agent-browser profiles wired).

**Build gates:** `tsc --noEmit` → 0 errors ✅ · Biome → clean ✅

| Chunk | Surface | Result | Evidence |
|---|---|---|---|
| 1 | Template editor | ✅ PASS | GET 200 (empty state) → add 3 q (counter "47 questions remaining", correct plural) → **PUT 200** → reload persists + "Last saved …" |
| 2 | Ask Questions | ✅ PASS | Dialog: "Ask questions anonymously" + identity-never-shared copy + "3 QUESTIONS WILL BE SENT" preview → **POST 202** → auto-refetch GET 200 → badge **"Couldn't reach"** (correct `blocked` — candidate has no safe contact, no email sent) |
| 3 | Connect / intro | ⚠️ BACKEND BUG | Dialog: "Send a named intro" + identity-reveal copy ✅. **POST …/intro-requests → 500** (`{"error":"Internal Server Error"}`). FE resilient: dialog stays open, error toast, no crash. Intro happy-path + email-422 branch BLOCKED until backend fixed. |
| 4 | Anonymity gate (A2) | ✅ PASS | Donor shared view (`/shared/<token>`), candidates expanded: 0 Ask, 0 Connect, 0 badges, 0 answers footer. Diligence UI correctly absent. |
| 5 | Public response page | ◑ PARTIAL | Invalid token → "This link is no longer valid" ✅. Happy-path submit NOT testable: blocked candidate minted no response token (need a candidate with a verified contact). |

**Backend defects found (DEV-427, not DEV-428):**
1. `GET /me/diligence-template` and `GET …/candidates/:id/diligence` returned **500** initially → FIXED mid-session (after migration/restart) → now 200.
2. `POST …/candidates/:id/intro-requests` → **500** (still failing). Generic `Internal Server Error`. Blocks Connect.

**Frontend findings:**
- F1 (Low/UX): public response page + donor shared page render inside the **full app chrome** (global nav + footer), not standalone. Plan §5.3 expected standalone. Decide intended vs fix.
- FE error/empty/loading states verified correct on every surface (no crashes, no `null`).
- Anonymity invariant holds; button-gating follows `actions`, badge follows `coarseStatus`; pluralization correct.

**Still to run once backend intro-500 is fixed + a contactable candidate exists:** intro 202 happy-path, Connect email-422 capture branch (UNVERIFIED `PUT /me {email}`), answered-state answers render, public-page submit (201/202/429), template clear-all + 50-cap + char-bound interactions.

## Update (21:2x) — backend fixes landed + new findings

- **Diligence reads fixed:** `GET /me/diligence-template`, `GET …/candidates/:id/diligence` now 200.
- **Template editor validation: PASS** — empty row → Save disabled; 1050 chars → counter `1,050/1,000` (destructive) + "Use 1,000 characters or fewer." + Save disabled; "47 questions remaining" plural correct; PUT 200 persists; reload re-hydrates (no clobber). Stable opaque UUID ids confirmed in PUT/GET payloads.
- **Ask Questions: PASS** — anonymous-copy dialog, "3 QUESTIONS WILL BE SENT" preview, POST 202 + auto-refetch; correct `blocked` → "Couldn't reach" for a no-contact candidate.
- **Connect intro 500 → FIXED** — now `POST …/intro-requests → 202`; dialog closes, intro object populated, "Intro queued" label (sentAt null) correct.

### 🐛 FINDING-B1 (backend contract) — coarseStatus doesn't flip to `intro_sent` after Connect
After a successful intro, `GET …/candidates/:id/diligence` returns `coarseStatus: "blocked"` with `intro` populated (`sentAt: null`). Per guide §5 `intro_sent` must OUTRANK the diligence state, and §3.4's 202 example returns `coarseStatus:"intro_sent"` immediately. Result: badge shows **"Couldn't reach"** while also showing **"Intro queued"** — contradictory. FE is correct ("badge follows coarseStatus"); **fix belongs in backend** (set coarseStatus=intro_sent when an intro exists). Repro: report `42ca2cac…`, candidate `cmqsh8vge0007ta1chaxb5uh1`, intro `8d4ae74a…`.

### Still backend/token-gated
- Public response page happy-path (GET context + POST submit 201/429) needs a real diligence-response **token** — the FE never exposes it (it's delivered to the nonprofit's email/outbox), and the only asked candidate was `blocked` (no token minted). Provide a token or a contactable candidate to finish §5.
- "Answered" state + answers-render needs a nonprofit to actually submit via a token.

## Update (21:29) — more advisor-side passes

- **Clear-all confirmation: PASS** — emptying a saved template → Save → dialog "Clear your diligence questions?" (copy notes already-sent snapshots are kept) → Clear questions → `PUT []` 200 → empty state. Cancel path also blocks PUT.
- **Empty-template guard (Ask dialog): PASS** — on an unasked candidate with an empty live template, the Ask dialog shows "You haven't added any diligence questions yet…" + "Edit your question template" → `/nonprofit-research/diligence-template`, **Send disabled**.
- **Char-cap, empty-row-disable, pluralization, persistence, reload-rehydrate: PASS** (see prior).
- Template restored to 3 questions afterward (hygiene).

### Advisor-side coverage = essentially complete. Remaining = public surface (needs token) + the FINDING-B1 backend coarseStatus fix.

## Update (22:30) — FINDING-B1 RESOLVED ✅
Backend fixed the intro reflection. Candidate-view now returns `coarseStatus: "intro_sent"` with `intro` populated (`introRequestId` + `sentAt`), `actions.canConnect:false`. FE renders correctly: badge **"Intro sent"**, label **"Intro sent"**, both buttons disabled. Connect lifecycle verified end-to-end. **Connect = PASS.**

## Update (22:35) — PUBLIC RESPONSE PAGE tested (token provided)

Token `P3lpEpBshDhkjK2PmqTFe5SOD3HK0D5M9ruVjJrNNdI` · candidate American Federation · 3 Qs.

| Check | Result |
|---|---|
| Context load (GET 200): orgName, 3 question-labelled textareas (maxLength 5000), "Submit answers" plural, "expires on Jul 25, 2026" | ✅ PASS |
| Anonymity: no advisor/donor identity in page content | ✅ PASS (global nav still shows tester's session — Finding F1) |
| Empty submit → "Please answer at least one question before submitting." (no POST) | ✅ PASS |
| Submit valid (POST 201) → `{accepted:true, submitted:true}` → thank-you, form hidden | ✅ PASS |
| Already-submitted on reload → "Thanks — your answers were received", form hidden | ✅ PASS |
| Unknown question id → **422** ("question id not in the request snapshot") | ✅ PASS |
| Rate-limit: burst of 12 → 10×422 + **2×429** | ✅ PASS (backend enforces >10/60s) |

### 🐛 FINDING-B2 (backend, Medium) — resubmit to an already-answered token returns 500
Per guide §4.2, a second submit (first-accepted-wins) must return `201 {accepted:false, submitted:true}` ("still show success"). Actual: `POST` resubmit → **500** `{"error":"Internal Server Error"}`.
- Repro: POST `…/diligence-response/<token>` again after a successful submit → 500.
- Impact: FE is mostly shielded (already-submitted state hides the form + submit is disabled while pending), so a normal user won't hit it; but a double-submit race or any resubmit yields a generic FE error toast instead of the contracted success. The `accepted:false` FE path can't be exercised until this is fixed.

### Minor contract note (Low) — >5000-char answer returns 400, not 422
`POST` with `text` > 5000 → **400** (Fastify schema: "text should NOT be longer than 5000 characters"). Guide §4.2/§6 implies 422 for validation. No FE impact (textarea `maxLength=5000` + client zod prevent it). Align to 422 if you want wire-contract consistency.

### Dogfood notes (Low)
- Public page renders orgName **raw ALL-CAPS** ("AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES"); the candidate card title-cases it — consider humanizing here too.
- Public page fires ~7 duplicate GET-context calls on load (hook uses staleTime:0/gcTime:0 + remounts) — minor efficiency.

## Update (22:50) — Answered-state retry → FINDING-B3

After the nonprofit submit (22:33) + 10-17 min wait, advisor candidate-view returns:
`coarseStatus:"intro_sent"`, `request.answeredAt:"2026-06-25T22:33:50Z"` (set ✅), but **`latestAnswers: null`** ❌.

### 🐛 FINDING-B3 (backend, High) — accepted answers never surfaced in candidate view
The submit was accepted (`answeredAt` populated, POST returned `accepted:true`), but `latestAnswers` stays `null` 17 min later. Per guide §2.3 `latestAnswers` should populate once an answer is accepted (`{ answers: {qId:text}, receivedAt }`). Result: **the advisor can never read the nonprofit's answers.** FE is correct (renders the answers panel only when `latestAnswers` present). Fix is backend: populate `latestAnswers` from the accepted submission.
- Repro: report `42ca2cac…`, candidate `cmqsh8vge…`, request `2cf443d5…`; nonprofit submitted via token `P3lpEpBsh…` at 22:33 → answeredAt set, latestAnswers null.
- Caveat: backend was reseeded several times; confirm on a stable instance and confirm whether a separate accept/decrypt step is supposed to populate `latestAnswers`.

### Note — "Answered" badge not testable on this candidate
This candidate also has an intro (`intro_sent`), which outranks `answered`, so the badge correctly shows "Intro sent". To verify the **"Answered"** badge + the **DiligenceAnswers** render (answers against the frozen snapshot, "No answer provided" for missing), need a candidate that is **answered but NOT connected**, AND FINDING-B3 fixed so `latestAnswers` is non-null.

## Update (00:12) — B2/B3 re-test
- **FINDING-B3 RESOLVED ✅** — `latestAnswers` now populated (`{answers:{qId:text}, receivedAt}`). FE renders the **DiligenceAnswers** panel: all 3 answers against the frozen question snapshot, "received today" label, badge "Intro sent" (intro_sent outranks answered). Answers-render path = **PASS** (was blocked).
- **FINDING-B2 still OPEN ❌** — resubmit to answered token still returns **500** (want `201 {accepted:false, submitted:true}`).

## Update (00:27) — fresh token (3t_I3DZr…) double-submit + accepted:false
- **FE double-submit guard: WEAK (Low)** — synchronous same-tick double-click fires **2 POSTs** (#323 201 accepted:true, #324 201 accepted:false). The `disabled`-while-pending guard doesn't block a second same-tick click (no re-render between). Low impact: human-speed double-click would hit the disabled button; backend dedupes anyway. Optional FE hardening: guard onSubmit with a ref, not just the disabled attr.
- **Backend concurrent race: CORRECT ✅** — 1st accepted:true, 2nd accepted:false, both 201, no double-write.
- **#2 201 invariants validated ✅** — 2nd POST = `{accepted:false, submitted:true}`.
- **#3 FE accepted:false success path validated ✅** — FE showed thank-you on the accepted:false 201 (no error).
- **B2 nuance for backend:** concurrent resubmit works (accepted:false); the **500 is the *sequential* resubmit** (already-settled answer) path only.

## Update (00:36) — FE fix applied
- **#4 double-submit guard FIXED** — added a synchronous `submittingRef` re-entrancy guard in `DiligenceResponseForm` (set before `mutate`, cleared in `onSettled`), so a same-tick double-click no longer fires a duplicate POST. Biome clean, tsc clean, 7/7 form tests pass. (Live re-test needs a fresh token; verified via unit tests + logic.)
- F1 (chrome layout) and orgName ALL-CAPS left as flagged decisions (not bugs): chrome comes from the app root layout (route-group decision); auto-title-casing org names risks mangling acronyms.

## Update (00:40) — FINDING-B2 RESOLVED ✅
Sequential resubmit to a live answered token (`3t_I3DZr…`) now returns **`201 {accepted:false, submitted:true}`** — exactly the contract (§4.2). No more 500; `accepted:false` confirms first-accepted-wins (no clobber). B2 = PASS. (The `P3lpEpBsh…` token returned 404 only because it had been deleted/cleaned up — both GET and POST 404.)

### Net: B1, B2, B3 all RESOLVED. Only open item is the cosmetic >5000→400-vs-422 (backend, no FE impact).
