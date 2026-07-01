# Bug report — DEV-427: Connect/intro is not reflected in candidate diligence view (`coarseStatus` never becomes `intro_sent`, `intro` returns null)

**Component:** gap-indexer — donor-research diligence (DEV-427 backend)
**Reported by:** frontend QA (DEV-428), 2026-06-25
**Severity:** High — a successful Connect produces no advisor-visible signal; the contract in the FE integration guide (§3.4, §5) is violated.

> ✅ **RESOLVED 2026-06-25 22:30** — backend fixed. Candidate-view GET now returns `coarseStatus: "intro_sent"` with `intro` populated (`introRequestId` + `sentAt`); FE renders badge/label "Intro sent" and disables both actions. Verified end-to-end. Report retained for history.
**Status of related issue:** the earlier `POST …/intro-requests → 500` is FIXED (now returns 202). This report is about the *state not being reflected* after that 202.

---

## Environment
- Backend (ngrok dev): `https://11c0-187-20-200-157.ngrok-free.app`
- Advisor: `test-9744@privy.io` — Privy DID `did:privy:cmqr5yt4u00740cl8cqd8vhc1`
- Report: `42ca2cac-f8b2-4629-bbee-d72216aaeabf`
- Candidate: `cmqsh8vge0007ta1chaxb5uh1` (American Federation of State County & Municipal Employees)
- Diligence requestId (already on the candidate): `2cf443d5-c76f-4fca-a0fb-be2c6416ad20`

> Note: the backend was restarted/reseeded several times during testing; please reproduce on a **stable** instance. The captures below are from a single, same-instant POST→refetch pair.

---

## Endpoints involved
```
POST /v2/donor-research/reports/:reportId/candidates/:candidateId/intro-requests   (no body) → 202
GET  /v2/donor-research/reports/:reportId/candidates/:candidateId/diligence                  → 200
```

---

## Steps to reproduce
1. As advisor `test-9744`, on report `42ca2cac…`, candidate `cmqsh8vge…` (this candidate already has a diligence request and `coarseStatus: "in_progress"`).
2. `POST …/candidates/cmqsh8vge…/intro-requests` (empty body, advisor bearer token).
3. Immediately `GET …/candidates/cmqsh8vge…/diligence`.

---

## Actual results

### A. The POST 202 response (captured 21:47 UTC)
```json
{ "introRequestId": "65f4b0b6-8903-4590-abb7-6efb55929668", "coarseStatus": "blocked" }
```
→ `coarseStatus` is **`blocked`**, not `intro_sent`.

### B. The candidate-view GET, same instant, right after the 202
```json
{
  "reportId": "42ca2cac-f8b2-4629-bbee-d72216aaeabf",
  "candidateId": "cmqsh8vge0007ta1chaxb5uh1",
  "coarseStatus": "in_progress",
  "request": { "requestId": "2cf443d5-c76f-4fca-a0fb-be2c6416ad20", "questions": [3 items], "requestedAt": "2026-06-25T21:05:54.889Z", "answeredAt": null },
  "latestAnswers": null,
  "intro": null,
  "actions": { "canAskQuestions": false, "canConnect": true }
}
```
→ `intro` is **`null`** (the just-created intro `65f4b0b6…` is absent), and `coarseStatus` is **`in_progress`**.

### Three inconsistencies in one flow
1. **POST 202 returns `coarseStatus: "blocked"`** — should be `intro_sent` (see guide §3.4).
2. **GET returns `coarseStatus: "in_progress"`** — disagrees with the POST's own `"blocked"`, and is also not `intro_sent`.
3. **GET returns `intro: null`** — the successfully created `introRequestId` (`65f4b0b6…`, returned by the POST) is not joined into the candidate-view read at all.

### Earlier capture (pre-reseed, 21:21 UTC) — a different but related failure mode
At that point the GET **did** populate `intro` but still had the wrong status:
```json
{ "coarseStatus": "blocked",
  "intro": { "introRequestId": "8d4ae74a-0b4b-4bee-bd93-6efa68b5237f", "requestedAt": "2026-06-25T21:21:19.515Z", "sentAt": null },
  "actions": { "canAskQuestions": true, "canConnect": true } }
```
→ `intro` populated, but `coarseStatus` stayed `blocked` (not `intro_sent`).

---

## Expected results (per the DEV-428 integration guide)

**Guide §3.4 — POST intro-requests (202):**
```json
{ "introRequestId": "intro_321", "coarseStatus": "intro_sent" }
```

**Guide §5 — coarseStatus mapping:** `intro_sent` = "A named intro was sent (Connect) — wins over diligence state." and **"`intro_sent` always outranks the diligence state."**

**Guide §2.3 — CandidateDiligenceViewResponse:** `intro` is documented as "null **if Connect never used**" — i.e. once Connect *is* used it must be populated with `{ introRequestId, requestedAt, sentAt }`.

So after the POST 202, the candidate-view GET must return:
```jsonc
{
  "coarseStatus": "intro_sent",                 // outranks blocked / in_progress / answered
  "intro": {
    "introRequestId": "65f4b0b6-8903-4590-abb7-6efb55929668",
    "requestedAt": "<ts>",
    "sentAt": null | "<ts once outbox dispatches>"
  },
  ...
}
```
And the POST 202 body's `coarseStatus` should likewise be `intro_sent`.

---

## Impact
The advisor gets **no signal** that their named intro was sent: the badge stays "Questions sent" (in_progress) / "Couldn't reach" (blocked), and no "Intro sent/queued" appears, because the FE correctly derives the badge from `coarseStatus` and the intro panel from the `intro` object — both of which the backend leaves stale/null. (FE is behaving per spec; the fix is server-side.)

---

## Suspected root cause / where to look
1. **Candidate-view read (the mapper building `CandidateDiligenceViewResponse`):**
   - It is **not** loading/joining the intro-request row for the candidate → `intro: null`.
   - It is **not** projecting `coarseStatus` to `intro_sent` when an intro row exists → `coarseStatus` stays at the diligence-derived value.
2. **`coarseStatus` derivation is inconsistent between the POST handler and the GET handler** (POST said `blocked`, GET said `in_progress` for the same candidate at the same instant) — they appear to compute it from different sources. Consolidate into one shared resolver and apply the documented precedence: `intro_sent` > `answered` > `blocked`/`in_progress` > `not_requested`.
3. Confirm the intro write is actually **persisted and queryable** by the candidate-view query (the POST returns an id, so the row likely exists — most likely the read just isn't joining it).

## Suggested acceptance check after fix
On a stable instance: POST intro-requests → 202 with `coarseStatus: "intro_sent"`; then GET …/diligence returns `coarseStatus: "intro_sent"` and `intro.introRequestId` equal to the id from the POST. Re-run with an already-`answered` and an already-`blocked` candidate to confirm `intro_sent` outranks both.
