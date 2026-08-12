vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

const mockApiPost = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import { HttpError, RequestAborted } from "@/utilities/api/errors";
import { getCommunityAdminsBatch } from "../communities.service";

const BATCH_ENDPOINT = "/communities/admins/batch";

const uid = (n: number): string => `0x${n.toString(16).padStart(64, "0")}`;

const okItem = (communityUID: string) => ({
  communityUID,
  admins: [{ user: { id: `admin-${communityUID}` } }],
  status: "ok" as const,
});

/** Every requested chunk resolves successfully with an admin per UID. */
const respondOkForAllChunks = () => {
  mockApiPost.mockImplementation((_endpoint, body) => {
    const uids = (body as { communityUIDs: string[] }).communityUIDs;
    return Promise.resolve({ data: uids.map(okItem) });
  });
};

const bodyUIDs = (callIndex: number): string[] =>
  (mockApiPost.mock.calls[callIndex][1] as { communityUIDs: string[] }).communityUIDs;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCommunityAdminsBatch", () => {
  it("should_return_empty_array_and_make_no_request_when_given_no_uids", async () => {
    const result = await getCommunityAdminsBatch([]);

    expect(result).toEqual([]);
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("should_split_requests_into_chunks_of_at_most_20_uids", async () => {
    respondOkForAllChunks();
    const uids = Array.from({ length: 45 }, (_, i) => uid(i));

    await getCommunityAdminsBatch(uids);

    expect(mockApiPost).toHaveBeenCalledTimes(3);
    expect(mockApiPost.mock.calls.map((_, i) => bodyUIDs(i).length)).toEqual([20, 20, 5]);
  });

  it("should_merge_admin_results_across_chunks", async () => {
    respondOkForAllChunks();
    const uids = Array.from({ length: 25 }, (_, i) => uid(i));

    const result = await getCommunityAdminsBatch(uids);

    expect(result).toHaveLength(25);
    expect(result.every((r) => r.status === "ok")).toBe(true);
    expect(result.find((r) => r.id === uid(24))?.admins[0].user.id).toBe(`admin-${uid(24)}`);
  });

  it("should_pass_an_abort_signal_to_each_chunk_request", async () => {
    respondOkForAllChunks();

    await getCommunityAdminsBatch([uid(1)]);

    expect((mockApiPost.mock.calls[0][2] as { signal?: AbortSignal })?.signal).toBeInstanceOf(
      AbortSignal
    );
  });

  it("should_degrade_only_the_failed_chunk_to_unavailable_and_keep_healthy_chunks", async () => {
    const badUID = uid(999);
    mockApiPost.mockImplementation((_endpoint, body) => {
      const uids = (body as { communityUIDs: string[] }).communityUIDs;
      if (uids.includes(badUID)) {
        return Promise.reject(new HttpError(500, { endpoint: BATCH_ENDPOINT, method: "POST" }));
      }
      return Promise.resolve({ data: uids.map(okItem) });
    });
    const healthy = Array.from({ length: 20 }, (_, i) => uid(i));
    const uids = [...healthy, badUID]; // chunk 1 = healthy(20), chunk 2 = [badUID]

    const result = await getCommunityAdminsBatch(uids);

    expect(result.find((r) => r.id === uid(0))?.status).toBe("ok");
    expect(result.find((r) => r.id === badUID)?.status).toBe("subgraph_unavailable");
    expect(result.find((r) => r.id === badUID)?.admins).toEqual([]);
  });

  it("should_dedupe_uids_in_requests_while_preserving_input_order_and_length", async () => {
    respondOkForAllChunks();

    const result = await getCommunityAdminsBatch([uid(1), uid(1), uid(2)]);

    expect(bodyUIDs(0)).toEqual([uid(1), uid(2)]);
    expect(result.map((r) => r.id)).toEqual([uid(1), uid(1), uid(2)]);
  });

  it("should_mark_uids_missing_from_the_response_as_not_found", async () => {
    mockApiPost.mockResolvedValue({ data: [okItem(uid(1))] });

    const result = await getCommunityAdminsBatch([uid(1), uid(2)]);

    expect(result.find((r) => r.id === uid(1))?.status).toBe("ok");
    expect(result.find((r) => r.id === uid(2))?.status).toBe("community_not_found");
  });

  it("should_retry_a_transient_chunk_failure_once_and_recover", async () => {
    let calls = 0;
    mockApiPost.mockImplementation((_endpoint, body) => {
      const uids = (body as { communityUIDs: string[] }).communityUIDs;
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new HttpError(502, { endpoint: BATCH_ENDPOINT, method: "POST" }));
      }
      return Promise.resolve({ data: uids.map(okItem) });
    });

    const result = await getCommunityAdminsBatch([uid(1)]);

    expect(mockApiPost).toHaveBeenCalledTimes(2);
    expect(result.find((r) => r.id === uid(1))?.status).toBe("ok");
  });

  it("should_not_retry_and_should_degrade_when_a_chunk_times_out", async () => {
    vi.useFakeTimers();
    // Resolves only when its abort signal fires — simulates a hung upstream.
    mockApiPost.mockImplementation((_endpoint, _body, opts) => {
      const signal = (opts as { signal: AbortSignal }).signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new RequestAborted({ endpoint: BATCH_ENDPOINT, method: "POST" }))
        );
      });
    });

    const promise = getCommunityAdminsBatch([uid(1)]);
    await vi.advanceTimersByTimeAsync(25_000);
    const result = await promise;

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(result.find((r) => r.id === uid(1))?.status).toBe("subgraph_unavailable");

    vi.useRealTimers();
  });
});
