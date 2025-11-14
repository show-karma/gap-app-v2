/**
 * @file Tests for indexer-notification utility
 * @description Tests indexer notification and cache invalidation utilities
 */

import * as fetchDataModule from "@/utilities/fetchData"
import {
  notifyIndexer,
  notifyIndexerForGrant,
  notifyIndexerForMilestone,
} from "@/utilities/indexer-notification"
import * as queryKeysModule from "@/utilities/queryKeys"

// Mock dependencies
jest.mock("@/utilities/fetchData")
jest.mock("@/components/Utilities/PrivyProviderWrapper", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}))

const mockFetchData = fetchDataModule.default as jest.MockedFunction<typeof fetchDataModule.default>

// Import queryClient after mocking
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper"

const mockInvalidateQueries = queryClient.invalidateQueries as jest.MockedFunction<
  typeof queryClient.invalidateQueries
>

describe("notifyIndexer", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Basic Notification", () => {
    it("should notify indexer with transaction hash", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
      })

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("0x123abc"), "POST", {})
    })

    it("should not notify when txHash is undefined", async () => {
      await notifyIndexer({
        txHash: undefined,
        chainId: 42161,
      })

      expect(mockFetchData).not.toHaveBeenCalled()
    })
  })

  describe("With Query Invalidation", () => {
    it("should invalidate queries when callback provided", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      const invalidateCallback = jest.fn()

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
        invalidateQueries: invalidateCallback,
      })

      expect(mockFetchData).toHaveBeenCalled()
      expect(invalidateCallback).toHaveBeenCalled()
    })

    it("should work without invalidation callback", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      await notifyIndexer({
        txHash: "0x123abc",
        chainId: 42161,
      })

      expect(mockFetchData).toHaveBeenCalled()
    })
  })

  describe("Different Chain IDs", () => {
    const chainIds = [1, 10, 42161, 8453]

    chainIds.forEach((chainId) => {
      it(`should work with chain ID ${chainId}`, async () => {
        mockFetchData.mockResolvedValue([{}, null])

        await notifyIndexer({
          txHash: "0x123abc",
          chainId,
        })

        expect(mockFetchData).toHaveBeenCalledWith(
          expect.stringContaining(chainId.toString()),
          "POST",
          {}
        )
      })
    })
  })
})

describe("notifyIndexerForGrant", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Grant Notification with Cache Invalidation", () => {
    it("should notify indexer and invalidate project queries", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      await notifyIndexerForGrant("0x123abc", 42161, "project-123")

      expect(mockFetchData).toHaveBeenCalled()
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["project", "project-123"],
      })
    })

    it("should invalidate milestone queries when programId provided", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      // Mock QUERY_KEYS
      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"]
      jest
        .spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES")
        .mockReturnValue(mockQueryKey as any)

      await notifyIndexerForGrant("0x123abc", 42161, "project-123", "program-1")

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["project", "project-123"],
      })

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      })
    })

    it("should work without txHash", async () => {
      await notifyIndexerForGrant(undefined, 42161, "project-123")

      expect(mockFetchData).not.toHaveBeenCalled()
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["project", "project-123"],
      })
    })

    it("should work without programId", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      await notifyIndexerForGrant("0x123abc", 42161, "project-123")

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1)
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["project", "project-123"],
      })
    })
  })
})

describe("notifyIndexerForMilestone", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Milestone Notification with Cache Invalidation", () => {
    it("should notify indexer and invalidate milestone queries", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"]
      jest
        .spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES")
        .mockReturnValue(mockQueryKey as any)

      await notifyIndexerForMilestone("0x123abc", 42161, "project-123", "program-1")

      expect(mockFetchData).toHaveBeenCalled()
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      })
    })

    it("should invalidate community queries when communityUID provided", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"]
      jest
        .spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES")
        .mockReturnValue(mockQueryKey as any)

      await notifyIndexerForMilestone(
        "0x123abc",
        42161,
        "project-123",
        "program-1",
        "community-456"
      )

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      })

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["reportMilestones", "community-456"],
      })
    })

    it("should work without txHash", async () => {
      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"]
      jest
        .spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES")
        .mockReturnValue(mockQueryKey as any)

      await notifyIndexerForMilestone(undefined, 42161, "project-123", "program-1")

      expect(mockFetchData).not.toHaveBeenCalled()
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      })
    })

    it("should work without communityUID", async () => {
      mockFetchData.mockResolvedValue([{}, null])

      const mockQueryKey = ["projectGrantMilestones", "project-123", "program-1"]
      jest
        .spyOn(queryKeysModule.QUERY_KEYS.MILESTONES, "PROJECT_GRANT_MILESTONES")
        .mockReturnValue(mockQueryKey as any)

      await notifyIndexerForMilestone("0x123abc", 42161, "project-123", "program-1")

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1)
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: mockQueryKey,
      })
    })
  })
})
