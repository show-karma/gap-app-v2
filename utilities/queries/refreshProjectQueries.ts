import type { Query, QueryClient } from "@tanstack/react-query";
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
  /** Limit the refresh to these families. Defaults to all of them. */
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
 * - fresh data in hand (`project`, `updates`) is written with `setQueryData`;
 * - other observed queries are fetched directly (`query.fetch()` is not gated
 *   on `staleTime`), and awaited — a failed refetch is swallowed, since the
 *   write itself already succeeded and the old data stays on screen;
 * - unobserved queries are removed, because a static observer mounting later
 *   would show them as-is and never refetch.
 *
 * Pages key the project by whatever the URL holds (slug or uid) while flows
 * usually know the uid, so the identifiers are widened with the uid and slug of
 * any cached project details that match one of them.
 */
export async function refreshProjectQueries(
  queryClient: QueryClient,
  input: RefreshProjectQueriesInput
): Promise<void> {
  const families = new Set<string>(input.families ?? PROJECT_PROFILE_QUERY_FAMILIES);
  const ids = collectIdentifiers(queryClient, input);
  if (ids.size === 0) return;

  const queryCache = queryClient.getQueryCache();
  const matches = (query: Query) => {
    const [family, id] = query.queryKey;
    return typeof family === "string" && families.has(family) && typeof id === "string"
      ? ids.has(normalize(id))
      : false;
  };

  const written = new Set<string>();

  if (input.project && families.has("project")) {
    const { project } = input;
    const keys = [
      QUERY_KEYS.PROJECT.DETAILS(project.uid),
      ...(project.details?.slug ? [QUERY_KEYS.PROJECT.DETAILS(project.details.slug)] : []),
      ...queryCache
        .findAll({ queryKey: ["project"] })
        .filter((query) => query.queryKey.length === 2 && matches(query))
        .map((query) => query.queryKey),
    ];
    for (const key of keys) {
      queryClient.setQueryData(key, project);
      written.add(queryCache.find({ queryKey: key, exact: true })?.queryHash ?? "");
    }
  }

  if (input.updates && families.has("project-updates")) {
    for (const query of queryCache.findAll({ queryKey: ["project-updates"] })) {
      if (!matches(query) || !isUnfilteredUpdatesKey(query.queryKey)) continue;
      queryClient.setQueryData(query.queryKey, input.updates);
      written.add(query.queryHash);
    }
  }

  const refetches: Promise<unknown>[] = [];
  for (const query of queryCache.getAll()) {
    if (written.has(query.queryHash) || !matches(query)) continue;
    if (query.getObserversCount() === 0) {
      queryCache.remove(query);
    } else if (query.isDisabled()) {
      query.invalidate();
    } else {
      refetches.push(query.fetch(undefined, { cancelRefetch: true }).catch(() => undefined));
    }
  }
  await Promise.all(refetches);
}

function collectIdentifiers(queryClient: QueryClient, input: RefreshProjectQueriesInput) {
  const ids = new Set<string>();
  const add = (id: unknown) => {
    if (typeof id === "string" && id.trim()) ids.add(normalize(id));
  };

  input.identifiers.forEach(add);
  add(input.project?.uid);
  add(input.project?.details?.slug);
  if (ids.size === 0) return ids;

  for (const query of queryClient.getQueryCache().findAll({ queryKey: ["project"] })) {
    const data = query.state.data as Partial<Project> | undefined;
    const aliases = [data?.uid, data?.details?.slug];
    if (aliases.some((alias) => typeof alias === "string" && ids.has(normalize(alias)))) {
      aliases.forEach(add);
    }
  }
  return ids;
}
