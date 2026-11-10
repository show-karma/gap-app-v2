import { hydrate, QueryClient } from "@tanstack/react-query";
import { buildDehydratedState, stabilizeSeedTimestamps } from "@/utilities/cache/hydration-seed";

/**
 * The hydration seed is serialized into cached pages. React Query stamps every
 * query with the millisecond it resolved, which made each regeneration of an
 * unchanged page different — and therefore a new ISR write.
 */

const seedProject = (queryClient: QueryClient) =>
  queryClient
    .prefetchQuery({ queryKey: ["project", "karma"], queryFn: async () => ({ name: "Karma" }) })
    .then(() => undefined);

describe("buildDehydratedState", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is byte-identical when rebuilt from the same data within the hour", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-11-10T14:05:00.000Z"));
    const first = await buildDehydratedState(seedProject);
    vi.setSystemTime(Date.parse("2026-11-10T14:47:31.250Z"));
    const second = await buildDehydratedState(seedProject);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.queries[0].state.dataUpdatedAt).toBe(Date.parse("2026-11-10T14:00:00.000Z"));
  });
});

describe("stabilizeSeedTimestamps", () => {
  const STAMP = Date.parse("2026-11-10T14:00:00.000Z");

  it("replaces fetch and dehydration times, keeping zero as zero", () => {
    const stable = stabilizeSeedTimestamps(
      {
        mutations: [],
        queries: [
          {
            queryHash: '["a"]',
            queryKey: ["a"],
            dehydratedAt: STAMP + 1234,
            state: {
              data: 1,
              dataUpdateCount: 1,
              dataUpdatedAt: STAMP + 1200,
              error: null,
              errorUpdateCount: 0,
              errorUpdatedAt: 0,
              fetchFailureCount: 0,
              fetchFailureReason: null,
              fetchMeta: null,
              isInvalidated: false,
              status: "success",
              fetchStatus: "idle",
            },
          },
        ],
      },
      STAMP
    );

    expect(stable.queries[0].dehydratedAt).toBe(STAMP);
    expect(stable.queries[0].state.dataUpdatedAt).toBe(STAMP);
    expect(stable.queries[0].state.errorUpdatedAt).toBe(0);
    expect(stable.queries[0].state.data).toBe(1);
  });

  it("never lets the older-looking seed overwrite data the client fetched itself", async () => {
    const client = new QueryClient();
    client.setQueryData(["project", "karma"], { name: "fresh from the client" });
    const seed = stabilizeSeedTimestamps(
      await buildDehydratedState(async (qc) => {
        await qc.prefetchQuery({
          queryKey: ["project", "karma"],
          queryFn: async () => ({ name: "from the cached page" }),
        });
      }),
      0
    );

    hydrate(client, seed);

    expect(client.getQueryData(["project", "karma"])).toEqual({ name: "fresh from the client" });
  });
});
