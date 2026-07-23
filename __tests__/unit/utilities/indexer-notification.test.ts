/**
 * @file Tests for indexer-notification utility
 * @description Tests indexer notification and cache invalidation utilities
 */

import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import {
  notifyIndexer,
  notifyIndexerForGrant,
  notifyIndexerForMilestone,
} from "@/utilities/indexer-notification";
import * as queryKeysModule from "@/utilities/queryKeys";

// Mock dependencies
vi.mock("@/utilities/api/client", () => ({
  api: {
    post: vi.fn(),
  },
}));
vi.mock("@/components/Utilities/errorManager");
vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

const mockApiPost = api.post as vi.MockedFunction<typeof api.post>;

// Import queryClient after mocking
import { queryClient } from "@/utilities/query-client";

const mockInvalidateQueries = queryClient.invalidateQueries as vi.MockedFunction<
  typeof queryClient.invalidateQueries
>;

describe("notifyIndexer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Notification", () => {
    it("should notify indexer with transaction hash", async () => {
      mockApiPost.mockResolvedValue({});

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
      });

      expect(mockApiPost).toHaveBeenCalledWith(expect.stringContaining("0x123abc"), {});
    });

    it("should not notify when txHash is undefined", async () => {
      await notifyIndexer({
        txHash: undefined,
        chainId: 42161,
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it("should swallow a failed notification and still invalidate queries", async () => {
      const apiError = new Error("indexer unavailable");
      mockApiPost.mockRejectedValue(apiError);
      const invalidateCallback = vi.fn();

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
        invalidateQueries: invalidateCallback,
      });

      expect(errorManager).toHaveBeenCalledWith(
        "Failed to notify indexer of new attestation",
        apiError,
        { txHash: "0x123abc", chainId: 42161 }
      );
      expect(invalidateCallback).toHaveBeenCalled();
    });
  });

  describe("With Query Invalidation", () => {
    it("should invalidate queries when callback provided", async () => {
      mockApiPost.mockResolvedValue({});

      const invalidateCallback = vi.fn();

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
        invalidateQueries: invalidateCallback,
      });

      expect(mockApiPost).toHaveBeenCalled();
      expect(invalidateCallback).toHaveBeenCalled();
    });

    it("should work without invalidation callback", async () => {
      mockApiPost.mockResolvedValue({});

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
      });

      expect(mockApiPost).toHaveBeenCalled();
    });
  });

  describe("Different Chain IDs", () => {
    const chainIds = [1, 10, 42161, 8453];

    chainIds.forEach((chainId) => {
      it(`should work with chain ID ${chainId}`, async () => {
        mockApiPost.mockResolvedValue({});

        await notifyIndexer({
          txHash: "0x123abc",
          chainId,
        });

        expect(mockApiPost).toHaveBeenCalledWith(expect.stringContaining(chainId.toString()), {});
      });
    });
  });
});

describe("notifyIndexerForGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Grant Notification with Cache Invalidation", () => {
    it("should notify indexer and invalidate project queries", async () => {
      mockApiPost.mockResolvedValue({});

      await notifyIndexerForGrant("0x123abc", 42161, "project-123");

      expect(mockApiPost).toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeysModule.QUERY_KEYS.PROJECT.DETAILS("project-123"),
      });
    });

    it("should invalidate milestone queries when programId provided", async () => {
      mockApiPost.mockResolvedValue({});

      // Mock QUERY_KEYS
      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"];
      vi.spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES").mockReturnValue(
        mockQueryKey as any
      );

      await notifyIndexerForGrant("0x123abc", 42161, "project-123", "program-1");

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeysModule.QUERY_KEYS.PROJECT.DETAILS("project-123"),
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      });
    });

    it("should work without txHash", async () => {
      await notifyIndexerForGrant(undefined, 42161, "project-123");

      expect(mockApiPost).not.toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeysModule.QUERY_KEYS.PROJECT.DETAILS("project-123"),
      });
    });

    it("should work without programId", async () => {
      mockApiPost.mockResolvedValue({});

      await notifyIndexerForGrant("0x123abc", 42161, "project-123");

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeysModule.QUERY_KEYS.PROJECT.DETAILS("project-123"),
      });
    });
  });
});

describe("notifyIndexerForMilestone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Milestone Notification with Cache Invalidation", () => {
    it("should notify indexer and invalidate milestone queries", async () => {
      mockApiPost.mockResolvedValue({});

      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"];
      vi.spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES").mockReturnValue(
        mockQueryKey as any
      );

      await notifyIndexerForMilestone("0x123abc", 42161, "project-123", "program-1");

      expect(mockApiPost).toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      });
    });

    it("should invalidate community queries when communityUID provided", async () => {
      mockApiPost.mockResolvedValue({});

      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"];
      vi.spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES").mockReturnValue(
        mockQueryKey as any
      );

      await notifyIndexerForMilestone(
        "0x123abc",
        42161,
        "project-123",
        "program-1",
        "community-456"
      );

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["reportMilestones", "community-456"],
      });
    });

    it("should work without txHash", async () => {
      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"];
      vi.spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES").mockReturnValue(
        mockQueryKey as any
      );

      await notifyIndexerForMilestone(undefined, 42161, "project-123", "program-1");

      expect(mockApiPost).not.toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      });
    });

    it("should work without communityUID", async () => {
      mockApiPost.mockResolvedValue({});

      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"];
      vi.spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES").mockReturnValue(
        mockQueryKey as any
      );

      await notifyIndexerForMilestone("0x123abc", 42161, "project-123", "program-1");

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      });
    });
  });
});
