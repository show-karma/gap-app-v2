# `utilities/api` — typed API client (issue #1775)

Self-contained, DAO-of-one typed HTTP client that replaced `utilities/fetchData.ts`.
It owns its own error taxonomy, retry policy, and Sentry reporting policy — see
`errors.ts`, `client.ts`, `retry.ts`, `or-else.ts`, `report.ts`.

All four #1775 phases are complete: `components/Utilities/errorManager.tsx` and
React Query `defaultOptions` consume the typed taxonomy (Phase 2), every indexer
call site uses `api.*` (Phase 3), and `utilities/fetchData.ts` is deleted
(Phase 4).

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

## `fetchData` is deleted

`utilities/fetchData.ts` and its `[data, error, pageInfo, status]` tuple
contract no longer exist — every call site was migrated to `api.*` and the
adapter was removed in Phase 4. Do not reintroduce it; new code calls `api.*`
with a schema.

## Migration patterns

When moving a tuple-style call site (e.g. code merged from a branch that
predates the migration) to `api.*`, pick one of these three shapes depending
on how the call site already handles failure:

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
