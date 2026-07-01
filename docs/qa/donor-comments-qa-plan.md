# Donor-Shared Report Commenting — QA Test Plan (LLM agent-browser execution)

> Scope: the **commenting feature** on the donor-shared report view in `gap-app-v2`,
> plus the advisor onboarding/report flows that surround it. Executed by **5 parallel
> LLM agents** driving a browser (agent-browser / playwright MCP) against
> **http://localhost:3000**. This document is the plan only — do not treat it as a
> record of results; fill in Pass/Fail/Notes as you execute.

Legend:
- 🔴 = unhappy / negative path
- 🐞 = regression guard for a specific recent fix (the fix it guards is named in the case)
- "coordination" note = the case requires two lanes to act in sequence; both lanes must read it

---

## 1. Environment & parallel-execution rules

### 1.1 Target & routing
- Base URL: `http://localhost:3000`. **Always test locally**, never a preview/staging URL.
- The donor-facing share route is **`/nonprofit-research/shared/[token]`** (NOT `/donor-research/...`).
  The `/donor-research/...` path is the internal API proxy mount, not a user page.
- Existing live share link: `http://localhost:3000/nonprofit-research/shared/XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw`
- Advisor dashboard / onboarding live under the `/nonprofit-research` tree (advisor-facing).
- Comment traffic goes browser → Next API proxy `/api/donor-research/shared/[token]/comments`
  → gap-indexer `/v2/donor-research/shared/[token]/comments`.

### 1.2 Isolated browser profiles (MANDATORY)
Auth/session state for this feature is **origin-scoped** and lives in cookies + localStorage:
- `drsc_session` — HttpOnly, `SameSite=Lax`, scoped to `/api/donor-research/shared/` on the FE origin.
- `drsc_name` — **JS-readable** (HttpOnly=false), scoped to `Path=/` so the share page can read it.
- Privy auth tokens (for advisor / authenticated lanes) in localStorage.

Therefore **each lane MUST run in its own browser context/profile** with NO shared
cookies or localStorage. If two lanes share a context they will clobber each other's
`drsc_session`/`drsc_name` and Privy tokens and produce false failures. Use a fresh
`browser_new_context` (playwright MCP) or a dedicated profile per lane. Do not reuse the
anonymous lane's context for any authenticated lane.

### 1.3 Accounts (one login per lane — do not hammer Privy)
Privy login is **rate-limited** when hammered. Each authenticated lane logs in **exactly
once** at the start of its run and reuses that session for all its cases. Use the
email + fixed-OTP flow (no real inbox needed).

| Lane | Role | Account | Fixed OTP | Notes |
|------|------|---------|-----------|-------|
| A | Anonymous donor | none (never log in) | — | Pure public capability via token |
| B | Advisor (owner of report) | `test-8970@privy.io` | `598767` | Owns report `ad3947ae`; share token `XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw` |
| C | Authenticated non-advisor | `test-9744@privy.io` | `630970` | Logged-in with email; NOT the report owner |
| D | Onboarded advisor | `test-7095@privy.io` | `466874` | Already onboarded; has dashboard + can create/share reports |
| E | Fresh / unonboarded | `test-3620@privy.io` | `363295` | NO advisor row yet → sees onboarding flow |

Login procedure (lanes B–E): open the app, trigger Privy login, choose **email**, enter
the lane's email, submit, then enter the lane's fixed OTP. Confirm authenticated state
before proceeding. If login returns a Privy rate-limit (429) or "too many attempts",
wait 60s and retry once; if it still fails, mark the lane BLOCKED (env), not FAIL.

### 1.4 Backend flakiness (colleague's ngrok — READ THIS)
The gap-indexer backend is a colleague's **ngrok tunnel that flaps intermittently**.
Symptoms: comment GET/POST returns **500 or 502**, or the Next proxy returns
`{"error":"indexer_unreachable"}` (proxy emits 502 when it can't reach the indexer).
Rules for every case that touches comments:
1. On a 500/502/`indexer_unreachable`, **retry up to 3 times with ~5s backoff** before
   concluding anything.
2. Distinguish a **flap** (intermittent; a retry succeeds within 3 tries) from a **real
   failure** (reproducible across all 3 retries AND across a fresh reload). Only a
   reproducible failure is a 🔴 FAIL; a flap that recovers is a Note ("backend flapped, recovered").
3. Cases that *intentionally* assert error UI (B-/A- error cases) are the exception —
   there you are validating the FE's handling of the 5xx, not the backend health.
4. If the backend is down for >5 min across all lanes, pause and report environment
   blocked rather than logging mass FAILs.

### 1.5 Concurrency guardrail
- Run **at most 5 parallel lanes**. Do NOT spin up more browser contexts than that —
  ~10 concurrent contexts has historically crashed the local dev server.
- Lanes A–E are designed to NOT overlap on accounts or on the same report mutations,
  except in the explicitly-marked **Cross-lane / multi-user** cases (§7), which require
  Lane A + Lane B to coordinate.
- Each lane runs its scenarios sequentially within its own context.

### 1.6 Evidence
For every case capture: a screenshot of the end state; on any anomaly, a screenshot +
the exact repro steps + relevant console/network entries. For 🐞 cases, screenshot the
specific element the fix concerns.

### 1.7 Key selectors / affordance text (grounded in code)
- Comment overlay container: fixed bottom-right cluster (`bottom-24 right-6`).
- Sheet trigger button text: **"Comments"** when count is 0, else pluralized e.g. **"3 comments"** (`pluralize("comment", n, true)`).
- Sheet title: **"Comments"**.
- Loading skeleton: `[data-testid="comments-loading"]`.
- Empty state copy: exactly **"Be the first to comment."** (never "0 comments").
- Comments-load error: `role="alert"` block with heading **"We couldn't load the comments"** + a **"Try again"** button (label flips to **"Retrying…"** while fetching).
- Comment row: `[data-comment-row]`; wrapper carries `[data-comment-id="<id>"]`; active row has `[data-active]` and `aria-current="true"`.
- Pending state text: **"Sending…"**; failed state text: **"Couldn't send"** + a **"Retry"** button; failed card background tint red (`bg-red-50` / dark `bg-red-900/20`).
- Name skeleton while sending without a resolved name: `Skeleton` (h-3 w-20) in the row header.
- Timestamp: a `<time>` element on its **own line** below the name, text ending in **"(Local)"**, format like `Jun 23, 2026, 5:17 PM (Local)`.
- Advisor badge in a row: `Badge` text **"Advisor"** (uppercase).
- Identity badge (overlay): **"Commenting as <name>"** with a pencil (aria-label "Edit display name") and a **"Not me — switch"** link; advisor variant reads **"Commenting as Advisor"** (no edit/switch).
- Pin badge: `[data-comment-pin]`, `[data-target-key]`, label = `pluralize("comment", count, true)`, amber dot.
- Add-comment "+" button: `[data-add-comment]`, aria-label `Add comment on <label>` (e.g. "Add comment on lead candidate"). Pin + "+" are clustered top-right (`absolute right-2 top-2`).
- Selection affordance (floating): `[data-selection-affordance]`, text **"Comment"** with a message icon.
- Text-range highlight band: `[data-comment-highlight]` (always `pointer-events:none`); thread marker: `[data-comment-marker]`, aria-label **"View comment thread"**, glyph `≡`, `pointer-events:auto`.
- Composer: textarea placeholder **"Add a comment…"** (root/general) or **"Write a reply…"** (reply); submit button **"Comment"** / **"Reply"**, flips to **"Posting…"** while submitting; **"Cancel"** button. Context line above textarea: **"On the whole report"** (general), **"Replying to <name>"** (reply), **"On <sectionKey>"** / **"On this candidate"** / `On "<quote…>"` (anchored). Textarea `maxLength=5000`.
- Collapsed-replies toggle (depth ≥ 4): **"Show N more replies"** (pluralized).
- Orphan lane: `<section aria-label="Orphan comments">`, heading `pluralize("orphan comment", n, true)`, original quote in a blockquote.
- aria-live announcer: `[data-testid="comment-announce"]`, `aria-live="polite"`, sr-only; text **"Comment added by X"** / **"Reply added by X"**.
- Karma AI chat button: `button[aria-label="Open chat"]` (and its fixed-positioned container). Must be **hidden** (visibility:hidden) while the sheet is open.
- Identity dialog title: **"Add your name and email"** (post) / **"Update your display name"** (edit-name). Inputs `#displayName`, `#email`; locked-email hint text **"From your signed-in account."**; submit **"Continue"** / **"Save"** (→ **"Saving…"**).
- Masthead: `[data-section="masthead"]`; eyebrow line includes **"Issued <Month D, YYYY>"** and conditionally **"Updated <Month D, YYYY>"**.
- Onboarding: WizardStepper steps **"Welcome" → "Sample report" → "Get started"**; step-3 fields in order Display name, **Email** (`#onboarding-email`, type=email), Organization (optional), Timezone.

---

## 2. Lane A — ANONYMOUS donor (no login)

Context: fresh browser context, never authenticated. Start each run by clearing
`drsc_name`/`drsc_session` so the "first comment" identity flow is exercised cleanly.
All cases use share token `XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw` unless noted.

### A1 — Open share view & comment overlay loads (happy)
- Account/Profile: Lane A (anonymous).
- Preconditions: cleared cookies for the FE origin.
- Steps: 1) Navigate to `/nonprofit-research/shared/XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw`. 2) Wait for report body `[data-brief]` to render (retry on 500/502 per §1.4). 3) Confirm the fixed bottom-right "Comments" trigger button exists. 4) Click it to open the Sheet.
- Expected: report renders; trigger reads **"Comments"** (count 0) or **"N comments"** (>0); Sheet opens with title "Comments"; composer textarea (placeholder "Add a comment…") is present at the bottom.
- Pass/Fail/Notes:

### A2 — Empty state copy (boundary) 🐞 (guards: no "0 comments")
- Preconditions: a report/token with zero comments (if `XogX...` already has comments, note count and skip the empty assertion, validating instead via the loading→list transition).
- Steps: open the Sheet on an empty thread.
- Expected: body shows exactly **"Be the first to comment."** — NOT "0 comments" anywhere; trigger button reads "Comments", not "0 comments".
- Pass/Fail/Notes:

### A3 — First comment triggers identity dialog (happy)
- Preconditions: no `drsc_name` cookie.
- Steps: 1) Open sheet. 2) Type "Looks great, thank you" in the composer. 3) Click **"Comment"**.
- Expected: because the anonymous viewer has no identity and cannot defer to backend, the **identity dialog** ("Add your name and email") opens immediately (no backend round-trip needed). The email field is **editable** (anonymous → no locked email).
- Pass/Fail/Notes:

### A4 — Identity capture + post completes; optimistic row (happy)
- Steps: 1) From A3's dialog, enter Display name "Dana Donor", email "dana@example.com", click **"Continue"**. 2) Observe the composer area.
- Expected: dialog closes; an optimistic comment row appears showing **"Sending…"**, card slightly dimmed (opacity-70); after the POST settles the row resolves to the real comment with name "Dana Donor" and an absolute "(Local)" timestamp. Retry on 500/502 per §1.4.
- Pass/Fail/Notes:

### A5 — Identity persists; "Commenting as" badge; no re-prompt on 2nd comment 🐞 (guards: identity persistence, drsc_name JS-readable at Path=/)
- Preconditions: A4 completed (cookie `drsc_name=Dana Donor` set).
- Steps: 1) Verify the **"Commenting as Dana Donor"** badge is visible in the overlay cluster. 2) In DevTools/console read `document.cookie` and confirm `drsc_name` is present and JS-readable. 3) Post a SECOND comment "Second one".
- Expected: the identity dialog does **NOT** reappear on the second post; the comment posts directly using the stored name; badge still shows "Commenting as Dana Donor".
- Pass/Fail/Notes:

### A6 — Identity persists across reload 🐞 (guards: persistence across reload)
- Steps: 1) Reload the page. 2) Re-open the sheet.
- Expected: badge still shows **"Commenting as Dana Donor"** without any dialog; prior comments still listed.
- Pass/Fail/Notes:

### A7 — Ordering oldest→newest + auto-scroll to latest 🐞 (guards: ordering + auto-scroll)
- Preconditions: ≥3 comments exist (post more if needed).
- Steps: 1) Close and re-open the sheet. 2) Inspect the order of `[data-comment-row]` root items and the scroll position of the scroll container.
- Expected: roots render oldest→newest (newest at the **bottom**); on open, the body auto-scrolls to the bottom (latest visible). Post one more and confirm it appears at the bottom and the body scrolls to it.
- Pass/Fail/Notes:

### A8 — Absolute local timestamp on its own line 🐞 (guards: timestamp format)
- Steps: inspect a comment row's `<time>` element.
- Expected: timestamp is an ABSOLUTE local time ending in **"(Local)"** (e.g. "Jun 23, 2026, 5:17 PM (Local)"); NOT relative ("2 minutes ago"); the date is NOT duplicated; the `<time>` sits on its OWN line below the name (block-level).
- Pass/Fail/Notes:

### A9 — General / whole-report comment via always-present composer 🐞 (guards: general composer always present)
- Steps: 1) Open the sheet but do NOT click any pin or "+". 2) Confirm the composer at the bottom shows context line **"On the whole report"**. 3) Type "Overall this is helpful" and submit.
- Expected: comment posts successfully as a general comment (anchored to masthead under the hood); appears in the list. No 422 surfaced to the user (the general path satisfies the backend's non-null-anchor rule).
- Pass/Fail/Notes:

### A10 — Section anchoring via "+" affordance (happy, core)
- Steps: 1) Hover/locate a section (e.g. the lead-candidate section, `[data-section="lead-candidate"]`). 2) Click its `[data-add-comment]` "+" button (aria-label "Add comment on lead candidate"). 3) Confirm composer context line reads **"On lead-candidate"**. 4) Submit "Strong lead pick".
- Expected: comment posts anchored to that section; a pin badge `[data-comment-pin]` appears top-right of that section reading "1 comment".
- Pass/Fail/Notes:

### A11 — Candidate anchoring via "+" (happy, core)
- Steps: locate a candidate card `[data-candidate-id]`; click its "+" (aria-label "Add comment on this candidate"); confirm composer reads **"On this candidate"**; submit.
- Expected: comment posts; candidate card shows a pin badge.
- Pass/Fail/Notes:

### A12 — Text selection → floating "Comment" affordance → text-range anchor (happy, core)
- Steps: 1) Select a phrase of text inside one section (single target). 2) Wait ~100ms for the debounced affordance. 3) Confirm a floating `[data-selection-affordance]` "Comment" button appears near the selection end. 4) Click it; confirm composer context reads `On "<the selected text…>"`. 5) Submit "Quoting this line".
- Expected: text-range comment posts; a yellow highlight band `[data-comment-highlight]` appears over the quoted text and a `[data-comment-marker]` (≡) sits at the end of the range.
- Pass/Fail/Notes:

### A13 — Re-select previously-commented text 🐞 (guards: highlight pointer-events:none, marker opens thread)
- Preconditions: A12 created a highlight.
- Steps: 1) Click-drag to RE-SELECT text that overlaps the existing highlight band. 2) Confirm a new floating "Comment" affordance appears (the band did not intercept the drag). 3) Separately, click the `[data-comment-marker]` ≡ badge.
- Expected: the highlight band is `pointer-events:none` so re-selection works and a fresh affordance appears; clicking the marker opens the sheet and focuses/scrolls to that comment's row (row gets `[data-active]`).
- Pass/Fail/Notes:

### A14 — Selection straddling two targets → NO affordance (boundary, core) 🔴
- Steps: select text that starts in one section/candidate and ends in a different one.
- Expected: NO floating "Comment" affordance appears (capture returns null when start/end anchor ancestors differ).
- Pass/Fail/Notes:

### A15 — Quote > 500 chars → NO affordance (boundary, core) 🔴
- Steps: select a contiguous block of text whose normalized length exceeds 500 characters within a single target.
- Expected: NO affordance appears (`QUOTE_MAX = 500`).
- Pass/Fail/Notes:

### A16 — Threaded reply (happy, core)
- Steps: 1) Open sheet, pick a root comment, click its **"Reply"** button. 2) Confirm composer reads **"Replying to <name>"** with placeholder "Write a reply…". 3) Submit "Replying here".
- Expected: reply nests under the parent (indented, left border), submit button read "Reply" → "Posting…".
- Pass/Fail/Notes:

### A17 — Pin pluralized counts (boundary) 🐞 (guards: pluralized counts)
- Steps: create exactly 1 then 2 comments on the same section; inspect the pin label and the trigger button.
- Expected: pin reads **"1 comment"** then **"2 comments"** (never "1 comments"); trigger reads "1 comment"/"2 comments".
- Pass/Fail/Notes:

### A18 — Post failure leaves a "Couldn't send" row (NOT silent vanish) 🐞 🔴 (guards: failed optimistic row)
- Steps: 1) In DevTools, set network offline OR block the `/api/donor-research/shared/.../comments` POST. 2) Submit a comment. 3) Restore network is NOT required for the assertion.
- Expected: the optimistic row does NOT disappear; it transitions to a **"Couldn't send"** state with red tint (`bg-red-50`) and a **"Retry"** button. (Distinguish from a real backend flap: this is a deliberately-induced failure.)
- Pass/Fail/Notes:

### A19 — Retry a failed comment (error/recovery) 🐞
- Steps: from A18 (or re-induce), restore network, click the row's **"Retry"** button.
- Expected: row attempts the post again; on success it reconciles to a normal posted row (no duplicate).
- Pass/Fail/Notes:

### A20 — Comments-load error shows message + working "Try again" 🐞 🔴 (guards: load-error UI)
- Steps: 1) Block/fail the comments **GET** so the query errors (or catch a genuine 500 — but force it to be reproducible by blocking in DevTools). 2) Open the sheet.
- Expected: `role="alert"` block with **"We couldn't load the comments"** and a **"Try again"** button. 3) Unblock, click "Try again" → button shows "Retrying…" then the list loads.
- Pass/Fail/Notes:

### A21 — "Not me — switch" clears identity (happy)
- Preconditions: a `drsc_name` exists ("Commenting as Dana Donor").
- Steps: click **"Not me — switch"** in the identity badge.
- Expected: badge disappears; `drsc_name` cleared (verify `document.cookie`); next comment attempt re-opens the identity dialog.
- Pass/Fail/Notes:

### A22 — Chat button hidden while drawer open; no overlap 🐞 (guards: chat button hide + overlay non-overlap)
- Steps: 1) With sheet CLOSED, confirm the Karma AI chat button (`button[aria-label="Open chat"]`) is visible and the comment trigger/badge does NOT visually overlap it. 2) Open the sheet; check the chat button's fixed container visibility. 3) Close the sheet.
- Expected: while the sheet is open the chat button's fixed container is `visibility:hidden`; on close it returns to its prior visibility; at no point do the comment overlay and chat button overlap.
- Pass/Fail/Notes:

### A23 — 30s polling + pause on tab blur (core)
- Steps: 1) Open the sheet with comments visible. 2) Watch network for the comments GET to repeat roughly every 30s while the tab is focused. 3) Switch to a different tab (blur) for ~40s, then return.
- Expected: polling fires ~every 30s while focused; while the tab is hidden the interval does NOT fire (`refetchIntervalInBackground:false`); on refocus it refetches.
- Pass/Fail/Notes:

### A24 — Cookie scoping & HttpOnly in DevTools (security)
- Steps: in DevTools → Application → Cookies for the FE origin, inspect `drsc_session` and `drsc_name` after posting a comment.
- Expected: `drsc_session` is **HttpOnly**, SameSite=Lax, Path `/api/donor-research/shared/`; `drsc_name` is **NOT HttpOnly** (JS-readable), Path `/`. The session value never appears in `document.cookie`.
- Pass/Fail/Notes:

### A25 — XSS / sanitization in comment body (security) 🔴
- Steps: post a comment with body: `<img src=x onerror=alert(1)>` and another with `<script>alert('x')</script>` and `"><b>bold</b>`.
- Expected: NO script executes, NO alert dialog; the markup renders as **literal text** (the backend escapes `& < > " '`, FE `decodeEntities` shows the literal characters the user typed). Confirm no `<img>`/`<script>` node is injected into the DOM.
- Pass/Fail/Notes:

### A26 — HTML entities round-trip (security/boundary)
- Steps: post a comment containing `5 < 10 & "quotes" don't break`.
- Expected: renders exactly as typed (`5 < 10 & "quotes" don't break`), no double-escaping (no visible `&lt;`/`&amp;`).
- Pass/Fail/Notes:

### A27 — Long body boundary (boundary) 🔴
- Steps: paste a 5000-char body, then try to add a 5001st char; submit at exactly 5000.
- Expected: textarea hard-caps at 5000 (`maxLength=5000`); the 5000-char comment posts and renders with preserved newlines (`whitespace-pre-wrap`).
- Pass/Fail/Notes:

### A28 — Empty / whitespace-only submit blocked (boundary) 🔴
- Steps: focus composer, type spaces/newlines only; observe submit button.
- Expected: submit button is disabled while body trims to empty; pressing it does nothing.
- Pass/Fail/Notes:

### A29 — Keyboard / a11y on the comment surface (a11y)
- Steps: 1) Tab to the "Comments" trigger and open with Enter. 2) Tab through the sheet (rows are `role="button"` tabindex 0, activate with Enter/Space). 3) Tab to a pin and activate with Enter/Space. 4) Open the identity dialog and confirm focus trap + Escape closes it.
- Expected: all interactive affordances are keyboard reachable and operable; focus-visible rings show; dialog traps focus and Escape dismisses; row activation via Enter/Space sets `[data-active]`.
- Pass/Fail/Notes:

### A30 — Responsive / mobile / touch (responsive)
- Steps: 1) Resize to 375×812 (mobile). 2) Open the sheet — confirm it takes full width (`w-full`, `sm:max-w-md`). 3) Use a touch tap to open a pin and submit a comment. 4) Test text selection via touch → affordance (touchend listener).
- Expected: sheet is usable full-width on mobile; pins/"+"/composer all tappable; touch text selection produces the affordance; no horizontal overflow.
- Pass/Fail/Notes:

### A31 — Dark mode (dark mode)
- Steps: toggle dark mode; open sheet; create a comment; induce a failed row.
- Expected: rows, badges, highlights (`dark:bg-amber-300/30`), failed tint (`dark:bg-red-900/20`), active tint (`dark:bg-amber-900/20`) all render with correct dark contrast; no unreadable text.
- Pass/Fail/Notes:

### A-DOG1 — Dogfooding: break the anonymous comment surface
- Steps (open-ended, ~15 min): rapidly double-click submit; spam the "+" buttons; select-deselect text repeatedly; resize between mobile/desktop mid-compose; back/forward navigation while the sheet is open; paste emoji + RTL text + 4-byte unicode; open the sheet, scroll up to old comments while a new poll lands; very long single-word (no spaces) body to test wrapping.
- Expected: no crashes, no duplicate posts from double-submit, no layout breakage, no orphaned dialogs. Log every anomaly with repro steps + screenshot.
- Pass/Fail/Notes:

---

## 3. Lane B — ADVISOR (owner of report `ad3947ae`)

Context: own browser context. Log in ONCE as `test-8970@privy.io` / OTP `598767`.
This account is the **advisor/owner** for share token `XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw`.

### B1 — Advisor opens the shared view; "Commenting as Advisor" badge (happy) 🐞 (guards: advisor identity badge)
- Steps: 1) While authenticated, navigate to `/nonprofit-research/shared/XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw`. 2) Wait for the advisor-resolution to settle. 3) Inspect the identity badge.
- Expected: badge reads **"Commenting as Advisor"** (no edit pencil, no "Not me — switch"). The advisor branch is active because the Privy session resolves to the report's advisor.
- Pass/Fail/Notes:

### B2 — Advisor posts without identity dialog (JWT-forwarding) 🐞 (guards: defer-to-backend for advisor)
- Steps: 1) Open the sheet. 2) Type "Advisor note: confirmed EIN" and submit.
- Expected: NO identity dialog appears (advisor defers to backend; the Privy JWT is forwarded via the proxy `Authorization` header and the BE stamps `is_advisor`). The posted row shows an **"Advisor"** badge.
- Pass/Fail/Notes:

### B3 🔴 — Advisor name Skeleton while sending (advisor optimistic name) 🐞 (guards: name Skeleton while sending)
- Steps: 1) Throttle network to "Slow 3G" so the POST is slow. 2) Submit an advisor comment. 3) Immediately inspect the optimistic row header.
- Expected: while the optimistic row has no resolved displayName yet, the header shows a **Skeleton** (h-3 w-20) in place of the name (not an empty/blank line); status shows **"Sending…"**; once settled the real name + "Advisor" badge appear.
- Pass/Fail/Notes:

### B4 — Advisor reply to a donor comment (happy)
- Coordination: depends on Lane A having posted at least one comment (or post one yourself first from a second tab is NOT allowed — instead coordinate with Lane A, or use a pre-existing donor comment).
- Steps: reply to an existing non-advisor comment; submit.
- Expected: reply nests under the donor comment, carries the **"Advisor"** badge.
- Pass/Fail/Notes:

### B5 — Advisor on shared view sees pins, highlights, orphan lane (core)
- Steps: with multiple anchored comments present, confirm pins on sections/candidates, text highlights, and (if any unresolved anchors) the orphan lane render the same for the advisor as for anonymous.
- Expected: full comment surface renders; advisor sees identical anchoring UI.
- Pass/Fail/Notes:

### B6 — Advisor: comment header long name wraps with Advisor badge 🐞 (guards: long-name wrap)
- Steps: ensure a comment exists whose displayName is very long (e.g. an advisor-set or donor-set 80-char name). Inspect the row header where the name + "Advisor" badge co-exist.
- Expected: long name **wraps cleanly** (`flex-wrap`, `break-words`, `min-w-0`); the "Advisor" badge stays intact (`shrink-0`); layout not broken, no overflow.
- Pass/Fail/Notes:

### B7 🔴 — Advisor JWT NOT forwarded path (negative, defensive)
- Steps: in a controlled way, strip/expire the Privy session (log out in this context) then attempt to post on the shared view.
- Expected: the viewer is no longer treated as advisor; behaves like an anonymous donor → identity dialog appears on first post. (Confirms advisor stamping is driven by the forwarded JWT, not a sticky FE flag.)
- Pass/Fail/Notes (re-login afterward to restore Lane B state):

### B8 — Dark mode + a11y spot-check for advisor badge (dark mode / a11y)
- Steps: dark mode on; inspect "Commenting as Advisor" badge and row "Advisor" badge contrast; keyboard-reach the composer.
- Expected: legible in dark mode; composer keyboard operable.
- Pass/Fail/Notes:

### B-DOG2 — Dogfooding: advisor commenting edge cases
- Steps (open-ended): post as advisor, then immediately use "Not me — switch" is absent (good) — verify there's no way to spoof a donor name as advisor; rapidly toggle the sheet; post advisor comment then reload and confirm "Advisor" badge persists (BE-stamped, authoritative); try posting with the session mid-expiry. Log anomalies with repro + screenshot.
- Pass/Fail/Notes:

---

## 4. Lane C — AUTHENTICATED NON-ADVISOR

Context: own browser context. Log in ONCE as `test-9744@privy.io` / OTP `630970`.
This account is authenticated but is **NOT** the owner of report `ad3947ae`.

### C1 — Email-lock identity dialog (logged-in-with-email) 🐞 (guards: email prefilled + locked)
- Steps: 1) While authenticated, navigate to `/nonprofit-research/shared/XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw`. 2) Open the sheet, type a comment, submit. 3) Because this viewer is authenticated, the FE first defers to the backend; the BE returns `requiresIdentity:true` (not the advisor) → the identity dialog opens. 4) Inspect the dialog's email field.
- Expected: the dialog's **email field is PREFILLED with the signed-in email and read-only** (`readOnly`, `aria-readonly`, muted styling), with helper text **"From your signed-in account."** The Display name field is editable.
- Pass/Fail/Notes:

### C2 — Defer-to-backend gate (no premature dialog) 🐞 (guards: authenticated defers to BE)
- Steps: 1) Clear any `drsc_name`. 2) Submit a comment as this authenticated non-advisor.
- Expected: the dialog does NOT open immediately on click (unlike anonymous A3); the FE posts first, and only opens the dialog after the BE responds `requiresIdentity`. (Observe a POST attempt in the network tab before the dialog appears.)
- Pass/Fail/Notes:

### C3 — Complete identity + post (happy)
- Steps: in the C1 dialog, enter Display name "Casey Client" (email already locked), click **"Continue"**.
- Expected: post completes; row shows "Casey Client" with NO "Advisor" badge (this account is not the report's advisor); `drsc_name` set so subsequent posts skip the dialog.
- Pass/Fail/Notes:

### C4 — Locked email cannot be edited (security/boundary) 🔴
- Steps: in the identity dialog, attempt to type into / clear the email field.
- Expected: email field is non-editable (readOnly); value stays the signed-in address; no validation error path needed since it's pre-filled valid.
- Pass/Fail/Notes:

### C5 — Wallet-without-email comparison note (boundary)
- Steps: N/A to execute if no wallet login is available; document expectation: a wallet login with no email would get an **editable** email field (no lock). Mark SKIPPED-no-wallet if not testable.
- Expected (documented): editable email for wallet-without-email.
- Pass/Fail/Notes:

### C6 — Persistence + reload for authenticated non-advisor (happy)
- Steps: after C3, reload; reopen sheet.
- Expected: "Commenting as Casey Client" badge persists; no re-prompt.
- Pass/Fail/Notes:

### C7 — Dark mode + responsive spot-check (dark mode / responsive)
- Steps: dark mode; mobile width; open dialog and confirm locked-email styling is legible and the dialog fits the viewport.
- Pass/Fail/Notes:

### C-DOG3 — Dogfooding: authenticated non-advisor
- Steps (open-ended): submit before the advisor-resolution settles to probe the race; rapidly open/close the dialog; verify you are never mislabeled "Advisor"; try editing the display name via the pencil and confirm the email stays locked there too. Log anomalies with repro + screenshot.
- Pass/Fail/Notes:

---

## 5. Lane D — ONBOARDED ADVISOR (dashboard + create/share)

Context: own browser context. Log in ONCE as `test-7095@privy.io` / OTP `466874`.
Already onboarded → lands on the advisor dashboard, not onboarding.

### D1 — Onboarded advisor reaches dashboard, not onboarding (happy)
- Steps: navigate to the nonprofit-research index; confirm the dashboard renders (report list / create affordance), not the welcome onboarding wizard.
- Expected: dashboard view; no "Welcome" wizard.
- Pass/Fail/Notes:

### D2 — Create a report (happy, dogfood-adjacent)
- Steps: use the dashboard's create/generate flow to start a new report with sample criteria (e.g. "Pacific Northwest climate nonprofits, $25K"). Wait for it to reach a terminal status (retry on backend flaps).
- Expected: report generates and reaches `fast_complete`/`complete`; masthead, candidates, sections render.
- Pass/Fail/Notes:

### D3 — Share the report; obtain a token (happy)
- Steps: on the terminal report, use the **ShareTokenControls** (advisor variant masthead, top-right) to create/copy a share link.
- Expected: a share token is generated; the link copies; opening it (in a SEPARATE anonymous context, or hand to Lane A) renders the shared view.
- Pass/Fail/Notes:

### D4 — Masthead "Updated <date>" when completion is later than issue 🐞 (guards: masthead Updated date)
- Steps: 1) Open a report whose `completedAt` is later than `fastCompletedAt`/issue date (a deep-enriched report). 2) Inspect the masthead eyebrow line.
- Expected: shows both **"Issued <date>"** and **"Updated <date>"** with DIFFERENT dates; if issue and update are the same day, "Updated" is HIDDEN (no duplicate date). Validate both branches if two reports are available.
- Pass/Fail/Notes:

### D5 — Multi-candidate report anchoring (core)
- Steps: open a report with multiple candidate cards (`[data-candidate-id]`). For 2 different candidates, add a comment via each card's "+".
- Expected: each candidate card independently shows its own pin badge with the correct count; comments do not cross-anchor; the comparison/runners-up sections also expose "+"/pins.
- Pass/Fail/Notes:

### D6 — "+" / pin clustering does NOT overlap chapter-mark label 🐞 (guards: top-right cluster vs ChapterMark)
- Steps: on a section that has a chapter-mark label (e.g. "Lead" via ChapterMark), inspect the top-right cluster of pin + "+".
- Expected: pin and "+" are clustered together at `right-2 top-2` and do NOT overlap or sit on top of the chapter-mark label; both remain readable and clickable.
- Pass/Fail/Notes:

### D7 — Advisor comments on own shared report show "Advisor" badge (core)
- Steps: from the shared link of D3's report (advisor still authenticated), post a comment.
- Expected: "Commenting as Advisor"; row carries "Advisor" badge.
- Pass/Fail/Notes:

### D8 — Dark mode dashboard + masthead (dark mode)
- Steps: dark mode; inspect dashboard, masthead eyebrow ("Issued"/"Updated"), and share controls.
- Pass/Fail/Notes:

### D-DOG4 — Dogfooding: advisor dashboard + report generation
- Steps (open-ended): generate a report with edge criteria (empty-ish niche → "No candidates" headline), zero-candidate state, very long org/cause strings, rapid create clicks (double-submit), share then revoke then re-open the link, resize tables (ComparisonTable) on mobile, back/forward through dashboard↔report. Log anomalies with repro + screenshot.
- Pass/Fail/Notes:

---

## 6. Lane E — FRESH / UNONBOARDED ADVISOR (onboarding flow)

Context: own browser context. Log in ONCE as `test-3620@privy.io` / OTP `363295`.
No advisor row → the onboarding wizard renders.

### E1 — Onboarding wizard appears (welcome → sample → get-started) (happy)
- Steps: navigate to the nonprofit-research advisor entry; confirm the WizardStepper with steps **"Welcome"**, **"Sample report"**, **"Get started"**, starting on Welcome.
- Expected: Welcome step renders with the value-prop cards and a Continue button; stepper shows aria-current on the active step.
- Pass/Fail/Notes:

### E2 — Step transitions move focus to step heading (a11y)
- Steps: click Continue (welcome→sample), then Continue (sample→form), then Back.
- Expected: on each transition focus moves to the active step's heading (`tabIndex=-1` heading focused); the first mount does NOT steal focus.
- Pass/Fail/Notes:

### E3 — Sample report cards do NOT overflow 🐞 (guards: sample card overflow)
- Steps: on the "Sample report" step, inspect `SampleReportPreview` cards at desktop AND mobile (375px) widths.
- Expected: sample cards fit their container with NO horizontal overflow / clipping at either width.
- Pass/Fail/Notes:

### E4 — Step 3 has Email input directly below Display name 🐞 (guards: onboarding email field)
- Steps: on "Get started", inspect field order and the email input.
- Expected: fields in order Display name → **Email** → Organization (optional) → Timezone; the Email field (`#onboarding-email`) is `type="email"`, **required**, and is positioned directly below Display name.
- Pass/Fail/Notes:

### E5 🔴 — Email validation enforced (boundary/negative)
- Steps: 1) Submit step 3 with Display name filled but Email EMPTY. 2) Then enter an invalid email "not-an-email" and submit.
- Expected: empty → error **"Email is required"** (role="alert"); invalid → **"Enter a valid email"**; submission blocked until a valid email is entered.
- Pass/Fail/Notes:

### E6 — Onboarding completes (happy)
- Steps: fill Display name "Erin Advisor", Email "erin@example.com", leave Org blank, accept default timezone, submit **"Continue"**.
- Expected: button shows "Setting up…", onboarding succeeds, redirect to the donor-research index (now onboarded). Retry on backend flap.
- Pass/Fail/Notes (NOTE: this consumes Lane E's unonboarded state; run E1–E5 before E6).

### E7 🔴 — Timezone validation (negative/boundary)
- Steps: before E6, set timezone to an invalid value like "Mars/Phobos!!" and submit.
- Expected: error "Use an IANA timezone like America/Los_Angeles" (regex `^[A-Za-z_/+\-0-9]{1,64}$` rejects `!`).
- Pass/Fail/Notes:

### E8 — Dark mode + responsive onboarding (dark mode / responsive)
- Steps: dark mode through all 3 steps at mobile width.
- Expected: legible, no overflow, buttons reachable.
- Pass/Fail/Notes:

### E-DOG5 — Dogfooding: onboarding flow
- Steps (open-ended, BEFORE E6 completes onboarding): rapidly click Continue/Back; double-submit the form; paste a 120-char display name and 200-char org; resize mid-step; back/forward browser nav across steps; reload on step 3 (state resets to welcome — note behavior); very long timezone string. Log anomalies with repro + screenshot.
- Pass/Fail/Notes:

---

## 7. Cross-lane / multi-user (Lane A + Lane B coordinate)

These cases require **two lanes acting in sequence on the SAME report**
(`XogX5KpUwKhoQUZ1A3FpFRHVDv0loCTeAFsSoEinGzw`). They are the only intentional overlap.
Coordinate timing explicitly (one lane posts, the other waits for its poll/refetch).

### X1 — Anonymous posts → Advisor sees within 30s poll → aria-live announces (multi-user, polling)
- Coordination: Lane A acts first; Lane B observes. Keep Lane B's sheet OPEN and tab FOCUSED (so the 30s poll runs).
- Steps:
  1. **Lane B**: open the shared view, open the sheet, keep tab focused, note current comment count.
  2. **Lane A**: post a NEW comment "Hello from the donor" (with a unique marker string).
  3. **Lane B**: within ~30s (one poll cycle) confirm the new comment appears at the BOTTOM of the list; confirm the body auto-scrolls to it; confirm the `[data-testid="comment-announce"]` region text becomes **"Comment added by Dana Donor"** (or whatever name Lane A used).
- Expected: new comment surfaces within one poll interval; aria-live announces "Comment added by <name>"; ordering keeps it at the bottom.
- Pass/Fail/Notes:

### X2 — Advisor replies → Anonymous sees the reply + "Reply added by" announce (multi-user)
- Coordination: Lane B acts; Lane A observes (sheet open, focused).
- Steps:
  1. **Lane B**: reply to Lane A's X1 comment with "Thanks — confirmed."
  2. **Lane A**: within ~30s confirm the reply nests under the original comment, shows the **"Advisor"** badge, and the announcer reads **"Reply added by Advisor"** (or the advisor's display name).
- Expected: reply appears nested with Advisor badge; aria-live announces a reply (not a root "Comment added").
- Pass/Fail/Notes:

### X3 — Polling pause on blur is visible across lanes (multi-user, polling)
- Coordination: Lane A observes; Lane B posts while Lane A's tab is BLURRED.
- Steps:
  1. **Lane A**: open sheet, then blur the tab (switch away) for ~40s.
  2. **Lane B**: post a comment during that window.
  3. **Lane A**: while still blurred, confirm NO refetch fired; then refocus and confirm the comment appears (refetch-on-focus).
- Expected: no background poll while hidden; refetch on refocus brings in Lane B's comment.
- Pass/Fail/Notes:

### X4 — Idempotency key per attempt (idempotency, coordinate) 🔴
- Coordination: single lane (A) can execute, but log under cross-lane since it concerns server-side dedupe.
- Steps:
  1. **Lane A**: throttle to Slow 3G, submit a comment, and rapidly click submit again / or trigger a retry on the SAME optimistic row.
  2. Inspect network: each POST carries an `Idempotency-Key` header (UUID v4). A genuine retry of the same logical submission should not create a duplicate server-side; a fresh attempt uses a NEW key.
- Expected: no duplicate comment is created from a double-submit of the same attempt; the FE surfaces "That submission was already received — try again." on an idempotency collision (HTTP 409 → `IdempotencyCollisionError`). Each new attempt uses a distinct key.
- Pass/Fail/Notes:

### X5 — Rate limit handling (rate-limit) 🔴
- Coordination: Lane A; do this LAST (it may trip the per-IP limit for the lane's context).
- Steps: rapidly post many comments in quick succession until the backend returns a rate-limit (429).
- Expected: the composer surfaces **"Slow down — try again in Ns."** (`RateLimitedError.retryAfter`); the optimistic row is handled gracefully; after the retry-after window a post succeeds. (If backend flaps 500/502 instead of 429, retry per §1.4 and note that 429 could not be reached.)
- Pass/Fail/Notes:

---

## 8. Dogfooding charters (per lane — exploratory bug hunting)

Each lane MUST run its dogfood charter (the `*-DOG*` case above) in addition to scripted
cases. General charter for all lanes — try to BREAK it and log every anomaly with exact
repro steps + a screenshot + console/network evidence:

- **Weird inputs**: emoji, RTL/bidi text, zero-width chars, 4-byte unicode, very long
  single unbroken words, only-newlines, markdown/HTML-ish strings, SQL-ish strings.
- **Rapid actions**: double/triple-click submit; spam "+" and pins; open/close the sheet
  fast; open the identity dialog and dismiss repeatedly; rapid reply on the same thread.
- **Layout stress**: resize between 320px and 1920px mid-interaction; zoom to 200%;
  long display names + Advisor badge; deeply nested replies (depth ≥ 4 → "Show N more replies").
- **Navigation**: browser back/forward while the sheet is open; reload mid-compose;
  open the share link in a second tab of the SAME context (note cookie sharing within a context).
- **Theme**: toggle dark mode mid-interaction; confirm no flashes of unreadable contrast.
- **State**: post → reload → verify persistence; switch identity → verify re-prompt;
  let a poll land while scrolled up reading old comments (does it yank scroll?).
- **Anchoring**: comment on text, then imagine the report re-enriches (poll) — confirm the
  highlight re-resolves or moves to the orphan lane with the original quote preserved.
- **Backend resilience**: deliberately go offline/online to see optimistic→failed→retry;
  distinguish induced failures from real backend flaps.

For each finding: severity guess, repro steps, screenshot, and which fix/area it touches.

---

## 9. Coverage map (recent fixes → cases)

| Fix # | Description | Dedicated case(s) |
|-------|-------------|-------------------|
| 1 | Identity persists; "Commenting as X"; drsc_name JS-readable; survives reload | A5, A6, A24 |
| 2 | Ordering oldest→newest + auto-scroll to latest | A7, X1 |
| 3 | Pending "Sending…" / failed row stays; advisor name Skeleton | A4, A18, A19, B3 |
| 4 | Absolute local "(Local)" timestamp, own line, no dup date | A8 |
| 5 | Email lock for logged-in-with-email; editable for anon/wallet | C1, C4, C5 |
| 6 | Re-select commented text; highlight pointer-events:none; marker opens thread | A13 |
| 7 | Chat button hidden while drawer open; no overlap | A22 |
| 8 | Comments-load error + working "Try again" | A20 |
| 9 | Masthead "Updated <date>" when later completion | D4 |
| 10 | Onboarding sample cards no overflow | E3 |
| 11 | Onboarding step 3 email input below Display name, validated | E4, E5 |
| 12 | Long display names wrap with Advisor badge | B6 |
| 13 | "+"/pin cluster top-right, no overlap with chapter-mark | D6 |
| 14 | General/whole-report composer always present; anchored to masthead; anchorless root blocked (422) | A9 |

Core behaviors: anchoring/capture (A10, A11, A12, D5), straddle→no affordance (A14),
>500 char→no affordance (A15), threaded replies + depth collapse (A16, dogfood),
pins pluralized (A17), highlights multi-line (A12, A13), orphan lane (B5, dogfood),
30s polling + blur pause (A23, X3), idempotency (X4), cookie scoping/HttpOnly (A24),
loading/empty/error states (A1, A2, A20).
