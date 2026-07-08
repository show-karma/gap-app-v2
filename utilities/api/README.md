# `utilities/api` — typed API client (Phase 1, issue #1775)

Self-contained, DAO-of-one typed HTTP client that replaces `utilities/fetchData.ts`
for new code. It owns its own error taxonomy, retry policy, and Sentry
reporting policy — see `errors.ts`, `client.ts`, `retry.ts`, `or-else.ts`,
`report.ts`.

This is **Phase 1 only**. `components/Utilities/errorManager.tsx` is untouched
(Phase 2), and the throwing `fetchDataThrow` adapter mentioned in the issue is
**deferred** — it has no consumer yet, and an unused export fails knip. Add it
in the PR that introduces its first caller.

There is no barrel `index.ts` — import from the specific source module
(`./client`, `./errors`, `./or-else`), per the repo's no-barrel convention.

## Usage

```ts
import { api } from "@/utilities/api/client";
import { z } from "zod";

const ProjectSchema = z.object({ uid: z.string(), title: z.string() });

// GET with runtime validation — throws ContractViolationError if the
// response doesn't match the schema.
const project = await api.get(`/v2/projects/${uid}`, { schema: ProjectSchema });

// Mutations
await api.post("/v2/projects", body, { schema: ProjectSchema });

// Paginated list endpoints
const { data, pageInfo } = await api.getPaginated("/v2/projects", {
  schema: z.array(ProjectSchema),
  params: { page: 1 },
});
```

**Rule: new code MUST pass a `schema`.** An endpoint without a schema returns
`data as unknown as T` — a silent, untyped cast. A schema turns a contract
drift on the backend into a caught `ContractViolationError` instead of a
runtime crash three components downstream.

Every rejection from `api.*` is an `ApiError` (`HttpError`, `NetworkError`,
`TimeoutError`, `RequestAborted`, or `ContractViolationError`) — never a raw
`AxiosError`. Use `isApiError`/`instanceof` to branch (from
`@/utilities/api/errors`), or `orElse` (from `@/utilities/api/or-else`) to
degrade to a fallback value for "expected" failures (network blips, 429s,
timeouts, aborts):

```ts
import { orElse } from "@/utilities/api/or-else";
import { HttpError, isApiError } from "@/utilities/api/errors";

const projects = await orElse(api.get("/v2/projects", { schema: ProjectListSchema }), []);
```

## `fetchData` is now a deprecated adapter

`utilities/fetchData.ts` still exists and still returns the legacy
`[data, error, pageInfo, status]` tuple — the ~220 existing call sites are
unaffected. Internally it now delegates to `api.request(...)` and maps the
typed `ApiError` back onto the tuple:

- `HttpError` → `status = error.status`, tuple error = `error.body.message ??
  error.message`.
- Any other `ApiError` (network / timeout / aborted / contract-violation) →
  `status = 500`, tuple error = the original underlying cause (or the
  `ApiError` itself if there is no cause) — matching the old behavior of
  putting the raw error object in the tuple slot.

Do not add new callers of `fetchData`. Prefer `api.*` with a schema.

## Phase-3 codemod patterns

When migrating an existing `fetchData` call site to `api.*`, pick one of
these three shapes depending on how the call site already handles failure:

1. **Degrade** — call site already treats a failed/empty fetch as "no data"
   (renders an empty state). Replace with `orElse(api.get(...), fallback)`.
2. **Throw** — call site already wraps `fetchData` in a try/catch or expects
   the caller (React Query, a server action) to catch a thrown error.
   Replace with a direct `await api.get(...)`/`api.post(...)` call and let
   the `ApiError` propagate.
3. **Status-branch** — call site inspects the tuple's `status`/`error` to
   decide UI behavior per HTTP code (e.g. treat 403 as "not authorized",
   404 as "not found", everything else as a real error). Replace with a
   `try { ... } catch (err) { if (err instanceof HttpError && err.status === 404) ... }`
   block using `instanceof HttpError`.

Each codemod is expected to also add a `schema` for the endpoint being
migrated, per the rule above.
