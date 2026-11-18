import type { Query, QueryCache, QueryClient, QueryKey } from "@tanstack/react-query";
import type { Project } from "@/types/v2/project";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * The query families the project profile reads, keyed `[family, uidOrSlug, ...]`.
 */
const PROJECT_PROFILE_QUERY_FAMILIES = [
  "project",
  "project-updates",
  "project-grants",
  "project-impacts",
  "project-milestones",
] as const;

type ProjectProfileQueryFamily = (typeof PROJECT_PROFILE_QUERY_FAMILIES)[number];

interface RefreshProjectQueriesInput {
  /** Any uid or slug the project is known by. Matched case-insensitively. */
  identifiers: ReadonlyArray<string | null | undefined>;
  /**
   * Limit the refresh to these families. Defaults to all of them; pass only
   * what the write changed, since each family refetched is a request.
   */
  families?: ReadonlyArray<ProjectProfileQueryFamily>;
  /** The project as just re-read after the write. Written as-is, no refetch. */
  project?: Project | null;
  /** The unfiltered activity feed as just re-read. Written to unfiltered feeds. */
  updates?: UpdatesApiResponse | null;
}

const normalize = (id: string) => id.trim().toLowerCase();

/** `projectUpdatesQueryKey(id)` with no status or filters: every slot after the id is null. */
const isUnfilteredUpdatesKey = (key: readonly unknown[]) =>
  key.length > 2 && key.slice(2).every((part) => part === null);

const cachedProjectOf = (query: Query): Partial<Project> | undefined => {
  const data = query.state.data as Partial<Project> | undefined;
  return typeof data?.uid === "string" ? data : undefined;
};

/**
 * Put a write's result into every cached project-profile query, after the
 * write succeeded.
 *
 * Use this instead of `invalidateQueries` for project data. The profile layout
 * observes its queries with `staleTime: "static"` (PRERENDER_SAFE_STALE_TIME,
 * DEV-612), and in @tanstack/query-core 5.87.1 `refetchQueries` skips any query
 * with a static observer (`queryClient.js:172`, `query.js:98`). Invalidation is
 * therefore a no-op on exactly the queries the profile shows, and a router
 * refresh does not help either: every hydration seed is stamped
 * `SEED_TIMESTAMP` (1), so `hydrate()` never lets it replace data the client
 * already holds.
 *
 * So, for every query in `families` whose key is `[family, id, ...]` with `id`
 * one of the project's identifiers:
 *
 * - any request already in flight is cancelled first, so a response that left
 *   before the write cannot land after the fresh data and revert it;
 * - fresh data in hand (`project`, `updates`) is written with `setQueryData`;
 * - other observed queries are fetched directly (`query.fetch()` is not gated
 *   on `staleTime`). Those fetches are awaited until they settle or pause; a
 *   failure is swallowed, since the write itself already succeeded;
 * - unobserved queries are removed, because a static observer mounting later
 *   would show them as-is and never refetch.
 *
 * Pages key the project by whatever the URL holds (slug or uid) while flows
 * usually know the uid, so the identifiers are widened with the slugs of the
 * cached project details that share the project's uid — never with another
 * project's identifiers.
 */
export async function refreshProjectQueries(
  queryClient: QueryClient,
  input: RefreshProjectQueriesInput
): Promise<void> {
  const queryCache = queryClient.getQueryCache();
  const families = new Set<string>(input.families ?? PROJECT_PROFILE_QUERY_FAMILIES);
  const { ids, uid } = collectIdentifiers(queryCache, input);
  if (ids.size === 0) return;

  const matches = (query: Query) => {
    const [family, id] = query.queryKey;
    return typeof family === "string" && families.has(family) && typeof id === "string"
      ? ids.has(normalize(id))
      : false;
  };

  const writes = new Map<string, { queryKey: QueryKey; data: unknown }>();
  const addWrite = (queryKey: QueryKey, data: unknown) => {
    writes.set(JSON.stringify(queryKey), { queryKey, data });
  };

  if (input.project && families.has("project")) {
    const { project } = input;
    addWrite(QUERY_KEYS.PROJECT.DETAILS(project.uid), project);
    if (project.details?.slug) addWrite(QUERY_KEYS.PROJECT.DETAILS(project.details.slug), project);
    for (const query of queryCache.findAll({ queryKey: ["project"] })) {
      if (query.queryKey.length !== 2 || !matches(query)) continue;
      // A slug can move between projects; never overwrite another project's entry.
      const cachedUid = cachedProjectOf(query)?.uid;
      if (cachedUid && normalize(cachedUid) !== uid) continue;
      addWrite(query.queryKey, project);
    }
  }

  if (input.updates && families.has("project-updates")) {
    for (const query of queryCache.findAll({ queryKey: ["project-updates"] })) {
      if (matches(query) && isUnfilteredUpdatesKey(query.queryKey)) {
        addWrite(query.queryKey, input.updates);
      }
    }
  }

  const isWritten = (query: Query) => writes.has(JSON.stringify(query.queryKey));
  const toRefetch: Query[] = [];
  for (const query of queryCache.getAll()) {
    if (isWritten(query) || !matches(query)) continue;
    if (query.getObserversCount() === 0) {
      queryCache.remove(query);
    } else if (query.isDisabled()) {
      query.invalidate();
    } else {
      toRefetch.push(query);
    }
  }

  // Cancel (and revert) anything in flight on the keys we are about to write or
  // refetch. Without this an older response overwrites the written data, and a
  // first load still in flight would be joined by `fetch()` rather than replaced.
  await Promise.all([
    ...[...writes.values()].map(({ queryKey }) =>
      queryClient.cancelQueries({ queryKey, exact: true })
    ),
    ...toRefetch.map((query) => query.cancel({ revert: true })),
  ]);

  for (const { queryKey, data } of writes.values()) {
    queryClient.setQueryData(queryKey, data);
  }

  // A fetch that pauses — offline or unfocused, at the start or before a retry —
  // resolves only once that clears; never hold the caller's follow-up work
  // (navigation, invoice submission) hostage to it.
  await Promise.all(toRefetch.map((query) => settledOrPaused(queryCache, query, query.fetch())));
}

/** Resolves when `promise` settles or `query` pauses, whichever comes first. */
function settledOrPaused(queryCache: QueryCache, query: Query, promise: Promise<unknown>) {
  return new Promise<void>((resolve) => {
    function done() {
      unsubscribe();
      resolve();
    }
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.query === query && query.state.fetchStatus === "paused") done();
    });
    if (query.state.fetchStatus === "paused") done();
    promise.then(done, done);
  });
}

function collectIdentifiers(queryCache: QueryCache, input: RefreshProjectQueriesInput) {
  const given = new Set<string>();
  const add = (set: Set<string>, id: unknown) => {
    if (typeof id === "string" && id.trim()) set.add(normalize(id));
  };
  for (const id of input.identifiers) add(given, id);
  add(given, input.project?.uid);
  add(given, input.project?.details?.slug);

  const cached = queryCache
    .findAll({ queryKey: ["project"] })
    .map(cachedProjectOf)
    .filter((project): project is Partial<Project> & { uid: string } => project !== undefined);

  // Anchor on ONE uid: the fresh project's, else a given identifier that is a
  // cached project's uid, else the uid of the single cached project a given
  // slug names. Ambiguity anchors nothing rather than guessing.
  const unique = (values: string[]) => {
    const set = new Set(values);
    return set.size === 1 ? [...set][0] : undefined;
  };
  const uid =
    (input.project?.uid ? normalize(input.project.uid) : undefined) ??
    unique(cached.map((p) => normalize(p.uid)).filter((id) => given.has(id))) ??
    unique(
      cached
        .filter((p) => p.details?.slug && given.has(normalize(p.details.slug)))
        .map((p) => normalize(p.uid))
    );

  const ids = new Set(given);
  if (uid) {
    ids.add(uid);
    for (const project of cached) {
      if (normalize(project.uid) === uid) add(ids, project.details?.slug);
    }
  }
  return { ids, uid };
}
