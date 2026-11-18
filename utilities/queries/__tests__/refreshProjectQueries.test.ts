/**
 * Regression coverage for "the owner's edit only appears after F5".
 *
 * The project profile layout observes its queries with `staleTime: "static"`
 * (PRERENDER_SAFE_STALE_TIME, DEV-612). In @tanstack/query-core 5.87.1
 * `refetchQueries` — and therefore `invalidateQueries` — skips every query
 * with a single static observer, so the invalidation every edit flow ran after
 * a successful write was a silent no-op. These tests pin the observer to
 * `"static"` exactly as the layout does and assert what the reader sees.
 */
import { onlineManager, QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/types/v2/project";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import { refreshProjectQueries } from "@/utilities/queries/refreshProjectQueries";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const UID = "0xAbC0000000000000000000000000000000000001";
const SLUG = "my-project";

const makeProject = (description: string, slug = SLUG): Project =>
  ({ uid: UID, details: { slug, title: "My project", description } }) as unknown as Project;

const updatesKey = (id: string, milestoneStatus: string | null = null) =>
  ["project-updates", id, milestoneStatus, null, null, null, null, null] as const;

const makeUpdates = (titles: string[]): UpdatesApiResponse =>
  ({
    projectUpdates: titles.map((title, i) => ({ uid: `update-${i}`, title })),
    projectMilestones: [],
    grantMilestones: [],
    grantUpdates: [],
  }) as unknown as UpdatesApiResponse;

let queryClient: QueryClient;
const unsubscribers: Array<() => void> = [];

/** Observe `queryKey` the way ProjectProfileLayout does: static, with a queryFn. */
function observeStatic<T>(queryKey: readonly unknown[], queryFn: () => Promise<T>) {
  const observer = new QueryObserver<T>(queryClient, {
    queryKey,
    queryFn,
    staleTime: PRERENDER_SAFE_STALE_TIME,
  });
  unsubscribers.push(observer.subscribe(() => {}));
  return observer;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

afterEach(() => {
  while (unsubscribers.length) unsubscribers.pop()?.();
  queryClient.clear();
});

describe("the bug this helper exists for", () => {
  it("invalidateQueries leaves a statically-observed query on its old data", async () => {
    // Documents the library behaviour the fix works around. If this starts
    // failing, query-core changed and the helper may be simplifiable.
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("old"));
    const queryFn = vi.fn().mockResolvedValue(makeProject("new"));
    const observer = observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), queryFn);

    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAILS(SLUG) });

    expect(queryFn).not.toHaveBeenCalled();
    expect(observer.getCurrentResult().data?.details.description).toBe("old");
  });
});

describe("refreshProjectQueries — fresh project in hand", () => {
  it("writes it to the slug key and the uid key even when both are observed as static", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("old"));
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(UID), makeProject("old"));
    const queryFn = vi.fn().mockResolvedValue(makeProject("from-network"));
    const bySlug = observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), queryFn);
    const byUid = observeStatic(QUERY_KEYS.PROJECT.DETAILS(UID), queryFn);

    await refreshProjectQueries(queryClient, {
      identifiers: [UID],
      project: makeProject("new"),
      families: ["project"],
    });

    expect(bySlug.getCurrentResult().data?.details.description).toBe("new");
    expect(byUid.getCurrentResult().data?.details.description).toBe("new");
    // The data was already in hand; no second round-trip for it.
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("matches keys case-insensitively (a checksummed uid vs a lowercased URL)", async () => {
    const lowerUidKey = QUERY_KEYS.PROJECT.DETAILS(UID.toLowerCase());
    queryClient.setQueryData(lowerUidKey, makeProject("old"));
    const observer = observeStatic(lowerUidKey, vi.fn());

    await refreshProjectQueries(queryClient, {
      identifiers: [UID],
      project: makeProject("new"),
      families: ["project"],
    });

    expect(observer.getCurrentResult().data?.details.description).toBe("new");
  });

  it("seeds the new slug after a rename so the redirect target never shows the old seed", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("old"));
    observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), vi.fn());

    await refreshProjectQueries(queryClient, {
      identifiers: [UID],
      project: makeProject("renamed", "my-renamed-project"),
      families: ["project"],
    });

    const renamed = queryClient.getQueryState(QUERY_KEYS.PROJECT.DETAILS("my-renamed-project"));
    expect((renamed?.data as Project | undefined)?.details.description).toBe("renamed");
    // hydrate() only overwrites when the seed is newer; seeds are stamped 1.
    expect(renamed?.dataUpdatedAt).toBeGreaterThan(1);
    // The old slug is still the page the user is on until the redirect lands.
    expect(
      (queryClient.getQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG)) as Project).details.description
    ).toBe("renamed");
  });
});

describe("refreshProjectQueries — no fresh data in hand", () => {
  it("forces a fetch of every static observed query for the project, by slug and by uid", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("old"));
    queryClient.setQueryData(updatesKey(SLUG), makeUpdates(["a"]));
    queryClient.setQueryData(QUERY_KEYS.PROJECT.GRANTS(UID), [{ uid: "g1" }]);

    observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), async () => makeProject("new"));
    const updates = observeStatic(updatesKey(SLUG), async () => makeUpdates(["a", "b"]));
    const grants = observeStatic(QUERY_KEYS.PROJECT.GRANTS(UID), async () => [
      { uid: "g1" },
      { uid: "g2" },
    ]);

    // A flow that only knows the uid still reaches the slug-keyed feed: the
    // slug is resolved from the cached project details.
    await refreshProjectQueries(queryClient, { identifiers: [UID] });

    expect(updates.getCurrentResult().data?.projectUpdates).toHaveLength(2);
    expect(grants.getCurrentResult().data).toHaveLength(2);
  });

  it("only touches the families it is asked for", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("old"));
    queryClient.setQueryData(QUERY_KEYS.PROJECT.GRANTS(UID), []);
    const grantsFn = vi.fn().mockResolvedValue([]);
    observeStatic(QUERY_KEYS.PROJECT.GRANTS(UID), grantsFn);
    const detailsFn = vi.fn().mockResolvedValue(makeProject("new"));
    observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), detailsFn);

    await refreshProjectQueries(queryClient, { identifiers: [SLUG], families: ["project"] });

    expect(detailsFn).toHaveBeenCalledTimes(1);
    expect(grantsFn).not.toHaveBeenCalled();
  });

  it("leaves other projects alone", async () => {
    const otherFn = vi.fn().mockResolvedValue(makeProject("x"));
    observeStatic(QUERY_KEYS.PROJECT.DETAILS("another-project"), otherFn);
    await vi.waitFor(() => expect(otherFn).toHaveBeenCalledTimes(1));

    await refreshProjectQueries(queryClient, { identifiers: [SLUG] });

    expect(otherFn).toHaveBeenCalledTimes(1);
  });

  it("drops unobserved entries so a later static mount cannot resurrect them", async () => {
    queryClient.setQueryData(updatesKey(SLUG, "completed"), makeUpdates(["stale"]));

    await refreshProjectQueries(queryClient, { identifiers: [SLUG] });

    expect(queryClient.getQueryState(updatesKey(SLUG, "completed"))).toBeUndefined();
  });

  it("swallows a failed refetch: the write already succeeded", async () => {
    queryClient.setQueryData(updatesKey(SLUG), makeUpdates(["a"]));
    const observer = observeStatic(updatesKey(SLUG), async () => {
      throw new Error("indexer down");
    });

    await expect(refreshProjectQueries(queryClient, { identifiers: [SLUG] })).resolves.toBe(
      undefined
    );
    expect(observer.getCurrentResult().data?.projectUpdates).toHaveLength(1);
  });

  it("is a no-op without any identifier", async () => {
    const fn = vi.fn().mockResolvedValue(makeProject("x"));
    observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), fn);
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1));

    await refreshProjectQueries(queryClient, { identifiers: [undefined, "", null] });

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("refreshProjectQueries — fresh activity feed in hand", () => {
  it("writes it to the unfiltered feed under the slug (the list the page shows)", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("x"));
    queryClient.setQueryData(updatesKey(SLUG), makeUpdates(["a"]));
    queryClient.setQueryData(updatesKey(UID), makeUpdates(["a"]));
    const networkFn = vi.fn().mockResolvedValue(makeUpdates(["from-network"]));
    const bySlug = observeStatic(updatesKey(SLUG), networkFn);
    const byUid = observeStatic(updatesKey(UID), networkFn);

    await refreshProjectQueries(queryClient, {
      identifiers: [UID],
      updates: makeUpdates(["a", "new activity"]),
      families: ["project-updates"],
    });

    expect(bySlug.getCurrentResult().data?.projectUpdates.map((u) => u.title)).toEqual([
      "a",
      "new activity",
    ]);
    expect(byUid.getCurrentResult().data?.projectUpdates).toHaveLength(2);
    expect(networkFn).not.toHaveBeenCalled();
  });

  it("refetches a filtered feed instead of writing the unfiltered payload into it", async () => {
    queryClient.setQueryData(updatesKey(SLUG, "completed"), makeUpdates(["done"]));
    const filteredFn = vi.fn().mockResolvedValue(makeUpdates(["done", "done too"]));
    const filtered = observeStatic(updatesKey(SLUG, "completed"), filteredFn);

    await refreshProjectQueries(queryClient, {
      identifiers: [SLUG],
      updates: makeUpdates(["everything"]),
      families: ["project-updates"],
    });

    expect(filteredFn).toHaveBeenCalledTimes(1);
    expect(filtered.getCurrentResult().data?.projectUpdates.map((u) => u.title)).toEqual([
      "done",
      "done too",
    ]);
  });
});

/** A promise the test resolves by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("refreshProjectQueries — requests already in flight", () => {
  it("an older response that resolves after the write does not revert it", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(SLUG), makeProject("old"));
    const older = deferred<Project>();
    const observer = observeStatic(QUERY_KEYS.PROJECT.DETAILS(SLUG), () => older.promise);
    // A request that left before the write landed (e.g. a refetch on mount).
    void observer.refetch();

    await refreshProjectQueries(queryClient, {
      identifiers: [SLUG],
      project: makeProject("new"),
      families: ["project"],
    });
    older.resolve(makeProject("old"));
    await new Promise((r) => setTimeout(r, 0));

    expect(observer.getCurrentResult().data?.details.description).toBe("new");
  });

  it("replaces a first load in flight instead of joining it", async () => {
    const calls: Array<ReturnType<typeof deferred<UpdatesApiResponse>>> = [];
    const observer = observeStatic(updatesKey(SLUG), () => {
      const call = deferred<UpdatesApiResponse>();
      calls.push(call);
      return call.promise;
    });
    expect(calls).toHaveLength(1); // the mount's first load, still pending

    const refreshed = refreshProjectQueries(queryClient, { identifiers: [SLUG] });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].resolve(makeUpdates(["after the write"]));
    await refreshed;
    calls[0].resolve(makeUpdates(["before the write"]));
    await new Promise((r) => setTimeout(r, 0));

    expect(observer.getCurrentResult().data?.projectUpdates.map((u) => u.title)).toEqual([
      "after the write",
    ]);
  });

  it("does not wait for a refetch paused offline", async () => {
    queryClient.setQueryData(updatesKey(SLUG), makeUpdates(["a"]));
    observeStatic(updatesKey(SLUG), async () => makeUpdates(["a", "b"]));
    onlineManager.setOnline(false);
    try {
      const outcome = await Promise.race([
        refreshProjectQueries(queryClient, { identifiers: [SLUG] }).then(() => "returned"),
        new Promise((r) => setTimeout(() => r("blocked"), 200)),
      ]);
      expect(outcome).toBe("returned");
    } finally {
      onlineManager.setOnline(true);
    }
  });
});

describe("refreshProjectQueries — a refetch that pauses before a retry", () => {
  it("returns once the refetch pauses, without waiting for reconnect", async () => {
    queryClient.setQueryData(updatesKey(SLUG), makeUpdates(["a"]));
    // Online when the fetch starts; the first attempt fails and the connection
    // drops before the retry, so the retry pauses rather than runs.
    const observer = new QueryObserver<UpdatesApiResponse>(queryClient, {
      queryKey: updatesKey(SLUG),
      queryFn: async () => {
        onlineManager.setOnline(false);
        throw new Error("network blip");
      },
      staleTime: PRERENDER_SAFE_STALE_TIME,
      retry: 1,
      retryDelay: 10,
    });
    unsubscribers.push(observer.subscribe(() => {}));
    try {
      const outcome = await Promise.race([
        refreshProjectQueries(queryClient, { identifiers: [SLUG] }).then(() => "returned"),
        new Promise((r) => setTimeout(() => r("blocked"), 300)),
      ]);
      expect(outcome).toBe("returned");
      expect(queryClient.getQueryState(updatesKey(SLUG))?.fetchStatus).toBe("paused");
    } finally {
      onlineManager.setOnline(true);
    }
  });
});

describe("refreshProjectQueries — identifiers never cross projects", () => {
  const OTHER_UID = "0x00000000000000000000000000000000000000b2";
  const other = (slug: string) =>
    ({ uid: OTHER_UID, details: { slug, description: "B's" } }) as unknown as Project;

  it("does not adopt another project's uid through a slug it now claims", async () => {
    // A is still cached under its old slug; B's cached record now claims it.
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS("old-slug"), makeProject("A", "old-slug"));
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(OTHER_UID), other("old-slug"));
    const otherFn = vi.fn().mockResolvedValue(other("old-slug"));
    const byOtherUid = observeStatic(QUERY_KEYS.PROJECT.DETAILS(OTHER_UID), otherFn);
    const byOldSlug = observeStatic(QUERY_KEYS.PROJECT.DETAILS("old-slug"), vi.fn());

    await refreshProjectQueries(queryClient, {
      identifiers: [UID],
      project: makeProject("A edited", "new-slug"),
      families: ["project"],
    });

    // A's own old-slug entry is refreshed; B's entry is neither written nor refetched.
    expect(byOldSlug.getCurrentResult().data?.details.description).toBe("A edited");
    expect(byOtherUid.getCurrentResult().data?.details.description).toBe("B's");
    expect(otherFn).not.toHaveBeenCalled();
  });

  it("never writes one project's data over another project's cached entry", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS("taken-slug"), other("taken-slug"));
    const byTakenSlug = observeStatic(QUERY_KEYS.PROJECT.DETAILS("taken-slug"), async () =>
      other("taken-slug")
    );

    await refreshProjectQueries(queryClient, {
      identifiers: [UID, "taken-slug"],
      project: makeProject("A edited"),
      families: ["project"],
    });

    expect(byTakenSlug.getCurrentResult().data?.uid).toBe(OTHER_UID);
  });

  it("expands nothing when a slug is ambiguous across cached projects", async () => {
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(UID), makeProject("A", "shared"));
    queryClient.setQueryData(QUERY_KEYS.PROJECT.DETAILS(OTHER_UID), other("shared"));
    const aFn = vi.fn().mockResolvedValue(makeProject("A", "shared"));
    const bFn = vi.fn().mockResolvedValue(other("shared"));
    observeStatic(QUERY_KEYS.PROJECT.DETAILS(UID), aFn);
    observeStatic(QUERY_KEYS.PROJECT.DETAILS(OTHER_UID), bFn);

    await refreshProjectQueries(queryClient, { identifiers: ["shared"], families: ["project"] });

    expect(aFn).not.toHaveBeenCalled();
    expect(bFn).not.toHaveBeenCalled();
  });
});
