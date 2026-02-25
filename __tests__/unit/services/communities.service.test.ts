import * as Sentry from "@sentry/nextjs";
import { errorManager } from "@/components/Utilities/errorManager";
import { getCommunityAdminsBatch } from "@/services/communities.service";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@sentry/nextjs", () => ({
  captureMessage: jest.fn(),
}));

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;
const mockCaptureMessage = Sentry.captureMessage as jest.MockedFunction<
  typeof Sentry.captureMessage
>;

describe("communities.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("getCommunityAdminsBatch", () => {
    it("returns an empty array when no communities are requested", async () => {
      const result = await getCommunityAdminsBatch([]);

      expect(result).toEqual([]);
      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it("maps response data and marks missing communities as not found", async () => {
      const communityUIDs = ["community-1", "community-2"];

      mockFetchData.mockResolvedValueOnce([
        {
          data: [
            {
              communityUID: "community-1",
              admins: [{ user: { id: "0xadmin" } }],
              status: "ok",
            },
          ],
          meta: {
            requestedCount: 2,
            uniqueRequestedCount: 2,
            foundCommunityCount: 1,
            notFoundCount: 1,
            unavailableCount: 0,
          },
        },
        null,
        null,
        200,
      ] as any);

      const result = await getCommunityAdminsBatch(communityUIDs);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.COMMUNITY.ADMINS_BATCH(),
        "POST",
        { communityUIDs },
        {},
        {}
      );
      expect(result).toEqual([
        {
          id: "community-1",
          admins: [{ user: { id: "0xadmin" } }],
          status: "ok",
        },
        {
          id: "community-2",
          admins: [],
          status: "community_not_found",
        },
      ]);
      expect(mockErrorManager).not.toHaveBeenCalled();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it("retries on rate limits and recovers on a later successful attempt", async () => {
      jest.useFakeTimers();
      jest.spyOn(Math, "random").mockReturnValue(0);

      const communityUIDs = ["community-1"];

      mockFetchData
        .mockResolvedValueOnce([null, "Rate limit exceeded. Try again later.", null, 429] as any)
        .mockResolvedValueOnce([
          {
            data: [
              {
                communityUID: "community-1",
                admins: [{ user: { id: "0xadmin" } }],
                status: "ok",
              },
            ],
            meta: {
              requestedCount: 1,
              uniqueRequestedCount: 1,
              foundCommunityCount: 1,
              notFoundCount: 0,
              unavailableCount: 0,
            },
          },
          null,
          null,
          200,
        ] as any);

      const promise = getCommunityAdminsBatch(communityUIDs);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(mockFetchData).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        {
          id: "community-1",
          admins: [{ user: { id: "0xadmin" } }],
          status: "ok",
        },
      ]);
      expect(mockErrorManager).not.toHaveBeenCalled();
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        "Rate limited while fetching batch community admins",
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({
            context: "admin.community.batch-admins",
            outcome: "recovered",
          }),
          extra: expect.objectContaining({
            rateLimitAttempts: 1,
            communityCount: 1,
            finalStatus: 200,
          }),
        })
      );
    });

    it("returns rate_limited fallback after exhausting retries", async () => {
      jest.useFakeTimers();
      jest.spyOn(Math, "random").mockReturnValue(0);

      const communityUIDs = ["community-1", "community-2"];

      mockFetchData.mockResolvedValue([
        null,
        "Rate limit exceeded. Try again later.",
        null,
        429,
      ] as any);

      const promise = getCommunityAdminsBatch(communityUIDs);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(mockFetchData).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        {
          id: "community-1",
          admins: [],
          status: "rate_limited",
        },
        {
          id: "community-2",
          admins: [],
          status: "rate_limited",
        },
      ]);
      expect(mockErrorManager).not.toHaveBeenCalled();
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        "Rate limited while fetching batch community admins",
        expect.objectContaining({
          tags: expect.objectContaining({
            outcome: "rate_limited_fallback",
          }),
          extra: expect.objectContaining({
            rateLimitAttempts: 3,
            communityCount: 2,
            finalStatus: 429,
          }),
        })
      );
    });

    it("reports non-rate-limit failures and returns subgraph_unavailable statuses", async () => {
      const communityUIDs = ["community-1"];

      mockFetchData.mockResolvedValueOnce([null, "Internal server error", null, 500] as any);

      const result = await getCommunityAdminsBatch(communityUIDs);

      expect(result).toEqual([
        {
          id: "community-1",
          admins: [],
          status: "subgraph_unavailable",
        },
      ]);
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching batch community admins",
        "Internal server error",
        expect.objectContaining({
          context: "admin.community.batch-admins",
          status: 500,
        })
      );
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it("captures telemetry and reports error when a non-rate-limit error follows rate limiting", async () => {
      jest.useFakeTimers();
      jest.spyOn(Math, "random").mockReturnValue(0);

      const communityUIDs = ["community-1"];

      mockFetchData
        .mockResolvedValueOnce([null, "Rate limit exceeded. Try again later.", null, 429] as any)
        .mockResolvedValueOnce([null, "Internal server error", null, 500] as any);

      const promise = getCommunityAdminsBatch(communityUIDs);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(mockFetchData).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        {
          id: "community-1",
          admins: [],
          status: "subgraph_unavailable",
        },
      ]);
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        "Rate limited while fetching batch community admins",
        expect.objectContaining({
          tags: expect.objectContaining({
            outcome: "non_rate_limit_failure",
          }),
          extra: expect.objectContaining({
            rateLimitAttempts: 1,
            communityCount: 1,
            finalStatus: 500,
            error: "Internal server error",
          }),
        })
      );
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching batch community admins",
        "Internal server error",
        expect.objectContaining({
          context: "admin.community.batch-admins",
          status: 500,
        })
      );
    });
  });
});
