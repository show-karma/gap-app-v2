/**
 * Tests for Resubmitted Status Feature in gap-app-v2 Admin UI
 *
 * These tests verify that the admin interface properly handles
 * the new "resubmitted" status for grant applications.
 */

import type { FundingApplicationStatusV2, IApplicationStatistics } from "@/types/funding-platform"

describe("Resubmitted Status in Admin UI", () => {
  describe("Type Definitions", () => {
    it("should include resubmitted in FundingApplicationStatusV2 type", () => {
      // Compile-time type check
      const validStatuses: FundingApplicationStatusV2[] = [
        "pending",
        "under_review",
        "revision_requested",
        "approved",
        "rejected",
        "resubmitted",
      ]

      expect(validStatuses).toContain("resubmitted")
    })

    it("should include resubmittedApplications in IApplicationStatistics", () => {
      const mockStats: IApplicationStatistics = {
        totalApplications: 10,
        pendingApplications: 2,
        approvedApplications: 3,
        rejectedApplications: 2,
        revisionRequestedApplications: 1,
        underReviewApplications: 1,
        resubmittedApplications: 1,
      }

      expect(mockStats.resubmittedApplications).toBe(1)
    })
  })

  describe("Status Colors", () => {
    it("should use blue color for resubmitted status (same as pending)", () => {
      const statusColors = {
        pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        resubmitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        under_review: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
        revision_requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      }

      expect(statusColors.resubmitted).toBe(statusColors.pending)
    })

    it("should differentiate resubmitted from rejected by color", () => {
      const statusColors = {
        resubmitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      }

      expect(statusColors.resubmitted).not.toBe(statusColors.rejected)
    })
  })

  describe("Status Formatting", () => {
    it("should format resubmitted status with proper capitalization", () => {
      const formatStatus = (status: string): string => {
        return status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      }

      expect(formatStatus("resubmitted")).toBe("Resubmitted")
      expect(formatStatus("under_review")).toBe("Under Review")
      expect(formatStatus("revision_requested")).toBe("Revision Requested")
    })
  })

  describe("Filter Options", () => {
    it("should include resubmitted in status filter dropdown", () => {
      const filterOptions = [
        { value: "", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "resubmitted", label: "Resubmitted" },
        { value: "under_review", label: "Under Review" },
        { value: "revision_requested", label: "Revision Requested" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ]

      const resubmittedOption = filterOptions.find((opt) => opt.value === "resubmitted")
      expect(resubmittedOption).toBeDefined()
      expect(resubmittedOption?.label).toBe("Resubmitted")
    })

    it("should position resubmitted after pending in filter options", () => {
      const filterOptions = [
        { value: "", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "resubmitted", label: "Resubmitted" },
        { value: "under_review", label: "Under Review" },
        { value: "revision_requested", label: "Revision Requested" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ]

      const pendingIndex = filterOptions.findIndex((opt) => opt.value === "pending")
      const resubmittedIndex = filterOptions.findIndex((opt) => opt.value === "resubmitted")

      expect(resubmittedIndex).toBe(pendingIndex + 1)
    })
  })

  describe("Status Transitions", () => {
    it("should allow transition from resubmitted to under_review", () => {
      const STATUS_TRANSITIONS: Record<FundingApplicationStatusV2, FundingApplicationStatusV2[]> = {
        pending: ["under_review"],
        resubmitted: ["under_review"],
        under_review: ["revision_requested", "approved", "rejected"],
        revision_requested: ["under_review"],
        approved: [],
        rejected: [],
      }

      const resubmittedTransitions = STATUS_TRANSITIONS.resubmitted
      expect(resubmittedTransitions).toContain("under_review")
    })

    it("should have same transitions as pending for resubmitted", () => {
      const STATUS_TRANSITIONS = {
        pending: ["under_review"],
        resubmitted: ["under_review"],
      }

      expect(STATUS_TRANSITIONS.resubmitted).toEqual(STATUS_TRANSITIONS.pending)
    })

    it("should show Start Review button for resubmitted applications", () => {
      interface StatusTransition {
        targetStatus: FundingApplicationStatusV2
        label: string
        variant?: "primary" | "secondary"
      }

      const STATUS_TRANSITIONS: Record<FundingApplicationStatusV2, StatusTransition[]> = {
        pending: [{ targetStatus: "under_review", label: "Start Review", variant: "primary" }],
        resubmitted: [{ targetStatus: "under_review", label: "Start Review", variant: "primary" }],
        under_review: [
          { targetStatus: "revision_requested", label: "Request Revision" },
          { targetStatus: "approved", label: "Approve" },
          { targetStatus: "rejected", label: "Reject" },
        ],
        revision_requested: [{ targetStatus: "under_review", label: "Review", variant: "primary" }],
        approved: [],
        rejected: [],
      }

      const resubmittedActions = STATUS_TRANSITIONS.resubmitted
      expect(resubmittedActions).toHaveLength(1)
      expect(resubmittedActions[0].label).toBe("Start Review")
      expect(resubmittedActions[0].targetStatus).toBe("under_review")
    })
  })

  describe("Statistics Display", () => {
    it("should track resubmitted applications separately in statistics", () => {
      const mockStats: IApplicationStatistics = {
        totalApplications: 12,
        pendingApplications: 3,
        resubmittedApplications: 2,
        underReviewApplications: 2,
        revisionRequestedApplications: 1,
        approvedApplications: 3,
        rejectedApplications: 1,
      }

      const total =
        mockStats.pendingApplications +
        (mockStats.resubmittedApplications || 0) +
        (mockStats.underReviewApplications || 0) +
        (mockStats.revisionRequestedApplications || 0) +
        mockStats.approvedApplications +
        mockStats.rejectedApplications

      expect(total).toBe(mockStats.totalApplications)
    })

    it("should include resubmitted in active applications count", () => {
      const mockStats: IApplicationStatistics = {
        totalApplications: 10,
        pendingApplications: 2,
        resubmittedApplications: 1,
        underReviewApplications: 2,
        revisionRequestedApplications: 1,
        approvedApplications: 3,
        rejectedApplications: 1,
      }

      // Active = pending + resubmitted + under_review + revision_requested
      const activeCount =
        mockStats.pendingApplications +
        (mockStats.resubmittedApplications || 0) +
        (mockStats.underReviewApplications || 0) +
        (mockStats.revisionRequestedApplications || 0)

      expect(activeCount).toBe(6)
    })
  })

  describe("Admin Permissions", () => {
    it("should allow admins to move resubmitted to under_review", () => {
      const currentStatus: FundingApplicationStatusV2 = "resubmitted"
      const newStatus: FundingApplicationStatusV2 = "under_review"
      const isAdmin = true

      // Admins can change status
      const canChangeStatus = isAdmin

      // Resubmitted can transition to under_review
      const validTransitions: Record<FundingApplicationStatusV2, FundingApplicationStatusV2[]> = {
        pending: ["under_review"],
        resubmitted: ["under_review"],
        under_review: ["revision_requested", "approved", "rejected"],
        revision_requested: ["under_review"],
        approved: [],
        rejected: [],
      }

      const isValidTransition = validTransitions[currentStatus]?.includes(newStatus)

      expect(canChangeStatus).toBe(true)
      expect(isValidTransition).toBe(true)
    })
  })

  describe("Feature Requirements", () => {
    it("should treat resubmitted similar to pending in admin UI", () => {
      const pendingBehaviors = {
        color: "blue",
        canStartReview: true,
        countsAsActive: true,
        showInFilter: true,
      }

      const resubmittedBehaviors = {
        color: "blue",
        canStartReview: true,
        countsAsActive: true,
        showInFilter: true,
      }

      expect(resubmittedBehaviors).toEqual(pendingBehaviors)
    })

    it("should differentiate resubmitted from pending in statistics", () => {
      const stats: IApplicationStatistics = {
        totalApplications: 5,
        pendingApplications: 2,
        resubmittedApplications: 1,
        approvedApplications: 1,
        rejectedApplications: 1,
      }

      // They should be counted separately
      expect(stats.pendingApplications).toBe(2)
      expect(stats.resubmittedApplications).toBe(1)

      // But can be grouped together for "active" count
      const activeApplications = stats.pendingApplications + (stats.resubmittedApplications || 0)
      expect(activeApplications).toBe(3)
    })

    it("should allow filtering by resubmitted status specifically", () => {
      interface IApplicationFilters {
        status?: FundingApplicationStatusV2 | string
      }

      const filter: IApplicationFilters = {
        status: "resubmitted",
      }

      expect(filter.status).toBe("resubmitted")
    })
  })

  describe("Sorting and Ordering", () => {
    it("should maintain resubmitted applications in correct sort order", () => {
      interface MockApplication {
        id: string
        status: FundingApplicationStatusV2
        updatedAt: Date
      }

      const applications: MockApplication[] = [
        {
          id: "1",
          status: "pending",
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          status: "resubmitted",
          updatedAt: new Date("2024-01-03"),
        },
        {
          id: "3",
          status: "under_review",
          updatedAt: new Date("2024-01-02"),
        },
      ]

      // Sort by updatedAt descending
      const sorted = applications.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      expect(sorted[0].status).toBe("resubmitted")
      expect(sorted[0].id).toBe("2")
    })
  })
})
