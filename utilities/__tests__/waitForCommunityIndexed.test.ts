import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import {
  COMMUNITY_INDEX_POLL_ATTEMPTS,
  COMMUNITY_INDEX_POLL_DELAY_MS,
  waitForCommunityIndexed,
} from "../waitForCommunityIndexed";

vi.mock("@/utilities/fetchData");

const mockFetchData = fetchData as unknown as ReturnType<typeof vi.fn>;

describe("waitForCommunityIndexed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true and stops polling once the community is indexed", async () => {
    mockFetchData
      .mockResolvedValueOnce([null, null, null, 200])
      .mockResolvedValueOnce([null, null, null, 200])
      .mockResolvedValueOnce([{ uid: "0xabc" }, null, null, 200]);

    const promise = waitForCommunityIndexed("my-community");
    await vi.advanceTimersByTimeAsync(COMMUNITY_INDEX_POLL_DELAY_MS * 2);

    await expect(promise).resolves.toBe(true);
    expect(mockFetchData).toHaveBeenCalledTimes(3);
    expect(mockFetchData).toHaveBeenCalledWith(INDEXER.COMMUNITY.V2.GET("my-community"), "GET");
    // Stopped early rather than exhausting the full window.
    expect(mockFetchData.mock.calls.length).toBeLessThan(COMMUNITY_INDEX_POLL_ATTEMPTS);
  });

  it("returns false after exhausting all attempts when the community never appears", async () => {
    // fetchData treats a 404 as an error, so `community` stays null and polling continues.
    mockFetchData.mockResolvedValue([null, "Not Found", null, 404]);

    const promise = waitForCommunityIndexed("ghost-community");
    await vi.advanceTimersByTimeAsync(
      COMMUNITY_INDEX_POLL_DELAY_MS * COMMUNITY_INDEX_POLL_ATTEMPTS
    );

    await expect(promise).resolves.toBe(false);
    expect(mockFetchData).toHaveBeenCalledTimes(COMMUNITY_INDEX_POLL_ATTEMPTS);
  });
});
