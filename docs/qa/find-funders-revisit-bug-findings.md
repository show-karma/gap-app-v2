# Find Funders — "opening an existing session re-runs the agent" (dogfood findings)

**Date:** 2026-06-18 · **Reporter:** colleague feedback · **Status:** CONFIRMED, reproduced locally

## The report

> "when you open a session, it hits the [agent] endpoint directly, before checking
> if a history exists … I open an existing session URL and instead of fetching the
> history and showing it, it re-runs."

## Verdict: real FE bug, reproduced two ways

Opening an existing session **can re-run the agent query** (`POST /v2/philanthropy/agent-query/stream`)
instead of rendering the stored conversation. The happy path (saved turns present **and**
schema-valid) works — `getById` is called and the conversation hydrates with **no** agent call.
The bug surfaces whenever `getById` returns something the FE can't use.

## Where (exact code)

`src/features/non-profits/components/chat-view-client.tsx`, the thread-seeding effect:

```ts
void searchHistoryService.getById(searchId).match(
  (entry) => {
    if (entry.turns.length > 0) {           // ✅ hydrate (correct)
      …hydrateTurns…; return;
    }
    const remoteQuery = entry.query?.trim();
    if (!remoteQuery) return;
    setSession(searchId, remoteQuery);
    void search(remoteQuery, 1, { chat: true });   // ❌ line 202 — re-runs agent
  },
  () => {                                   // getById ERRORED
    if (localQuery) {
      void search(localQuery, 1, { chat: true });  // ❌ line 212 — re-runs agent
    } else if (!session) {
      setNotFound(true);
    }
  }
);
```

**Two paths re-run instead of showing history:**

1. **Empty turns** (line 202): `getById` succeeds but `entry.turns.length === 0` →
   re-runs `search(remoteQuery)`. Happens when an entry was created but its turns
   never persisted (e.g. the data-service was failing when the chat was made).

2. **`getById` errored** (line 212): the error branch re-runs whenever a local
   query exists. Critically this fires on **`ValidationError`**, not just 404 —
   because `apiFetch` does a strict `schema.parse()` (`lib/api-fetch.ts:71`) against
   `SearchHistoryDetailSchema`. If **one** persisted turn doesn't satisfy the strict
   `SavedSearchTurnSchema` (every `entities`/`citations` field required, no extras),
   the **entire** `getById` is rejected → all saved turns discarded → agent re-runs.
   This is the most likely **production** trigger: prod has real turns, but a single
   shape mismatch nukes the hydrate.

## Reproductions (local, dev → staging indexer)

Captured network with agent-browser; counted `agent-query/stream` POSTs on revisit.

| Scenario | `getById` | agent re-run? |
|----------|-----------|---------------|
| Saved turns present, schema-valid | 200, turns>0 | ✅ no (hydrates) — correct |
| Reload own chat, local session present | 200, turns>0 | ✅ no (hydrates) — correct |
| **Entry exists, `turns: []`** | 200, turns=0 | ❌ **yes — 2 POSTs**, page re-ran the query |
| **Entry exists, turns present but schema-invalid** | 200 (Zod fails) | ❌ **yes — 2 POSTs**, saved narrative discarded |

In the last two rows the saved conversation was thrown away and the agent re-queried —
matching the colleague's report exactly.

## Fix applied (FE)

Two changes, scoped deliberately (see "Why not more" below):

1. **Resilient turn parsing** — `search-history.service.ts`. `SearchHistoryDetailSchema.turns`
   now validates each turn independently and drops only the bad ones (a non-array
   collapses to `[]`), instead of one malformed turn rejecting the whole response.
   This is the primary fix for the prod trigger: a single schema mismatch no longer
   discards the saved conversation and forces a re-run. Covered by 3 unit tests in
   `__tests__/search-history-service.test.ts` (drops invalid / keeps valid, all-invalid → `[]`,
   non-array → `[]`).
2. **No re-run on a successful-but-empty load** — `chat-view-client.tsx` seeding effect.
   When `getById` *succeeds* but yields no renderable turns, we no longer re-run the
   agent; we render the workbench and prefill the composer with the saved query so
   the user can choose to re-run. (This branch is reached only by authenticated users,
   for whom getById can succeed.)

### Why not more (scoping)

The first instinct — "only re-run on a genuine 404, otherwise show a retryable load
error" — was **reverted** because it would break **anonymous reload**: logged-out
users can't read history (`getById` needs a wallet → 401/error), so the existing
*re-run-on-error* fallback is the only way to reconstruct their own chat. The error
branch is therefore left intact. The schema-mismatch trigger (the actual prod bug) is
fully handled by change #1 without touching that delicate path.

### Verification

- Unit tests: 3 new + full non-profits suite (219) green; `tsc` and Biome clean.
- Browser: the search route compiles and renders; a genuinely-missing id still shows
  "Conversation not found" correctly. Mocking `getById` *response bodies* end-to-end
  wasn't achievable with the local agent-browser `network route` (requests reach the
  real indexer), so the resilient-parsing behavior is proven by the unit tests rather
  than a browser mock.

### Separate (staging only)

The staging data-service 401 means turns don't persist there, leaving `turns: []`
entries — an environment issue, independent of this fix.

## Note on staging

Staging's grants data-service returns a 401 to the agent, so it can't return real
funder results — turns persisted during this run carried the agent's error narrative.
The bug-repro is independent of that (the empty-turns / schema cases were injected).
