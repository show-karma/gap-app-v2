import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";
import {
  COMMUNITY_INDEX_POLL_ATTEMPTS,
  COMMUNITY_INDEX_POLL_DELAY_MS,
  waitForCommunityIndexed,
} from "../waitForCommunityIndexed";

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn() },
}));

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe("waitForCommunityIndexed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true and stops polling once the community is indexed", async () => {
    mockApiGet
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ uid: "0xabc" });

    const promise = waitForCommunityIndexed("my-community");
    await vi.advanceTimersByTimeAsync(COMMUNITY_INDEX_POLL_DELAY_MS * 2);

    await expect(promise).resolves.toBe(true);
    expect(mockApiGet).toHaveBeenCalledTimes(3);
    expect(mockApiGet).toHaveBeenCalledWith(INDEXER.COMMUNITY.V2.GET("my-community"));
    // Stopped early rather than exhausting the full window.
    expect(mockApiGet.mock.calls.length).toBeLessThan(COMMUNITY_INDEX_POLL_ATTEMPTS);
  });

  it("returns false after exhausting all attempts when the community never appears", async () => {
    // The read endpoint 404s while unindexed; the poller swallows it and keeps waiting.
    mockApiGet.mockRejectedValue(
      new HttpError(404, { endpoint: "/v2/communities", method: "GET" })
    );

    const promise = waitForCommunityIndexed("ghost-community");
    await vi.advanceTimersByTimeAsync(
      COMMUNITY_INDEX_POLL_DELAY_MS * COMMUNITY_INDEX_POLL_ATTEMPTS
    );

    await expect(promise).resolves.toBe(false);
    expect(mockApiGet).toHaveBeenCalledTimes(COMMUNITY_INDEX_POLL_ATTEMPTS);
  });
});
