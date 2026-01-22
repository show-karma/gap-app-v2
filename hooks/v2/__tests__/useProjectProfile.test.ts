import { renderHook, waitFor } from "@testing-library/react";
import { useProjectProfile } from "../useProjectProfile";

// =============================================================================
// Mock Dependencies
// =============================================================================

const mockProject = {
  uid: "0x1234" as `0x${string}`,
  chainID: 1,
  owner: "0xabcd" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "Description",
    slug: "test-project",
  },
  members: [],
  endorsements: [{ id: "1" }, { id: "2" }],
};

const mockGrants = [
  {
    uid: "0x5678" as `0x${string}`,
    chainID: 1,
    refUID: "0x9999" as `0x${string}`,
    recipient: "0xabcd" as `0x${string}`,
  },
];

const mockMilestones = [
  {
    uid: "milestone-1",
    type: "milestone" as const,
    title: "Milestone 1",
    description: "Description",
    completed: true,
    createdAt: "2024-01-10T10:00:00Z",
    chainID: 1,
    refUID: "ref-1",
    source: { type: "milestone" },
  },
];

const mockImpacts = [
  {
    uid: "impact-1",
    refUID: "ref-1",
    chainID: 1,
    data: { work: "Work done", impact: "Impact achieved" },
    createdAt: "2024-01-15T10:00:00Z",
  },
];

// Mock hooks
jest.mock("@/hooks/useProject", () => ({
  useProject: jest.fn(() => ({
    project: mockProject,
    isLoading: false,
  })),
}));

jest.mock("../useProjectGrants", () => ({
  useProjectGrants: jest.fn(() => ({
    grants: mockGrants,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("../useProjectUpdates", () => ({
  useProjectUpdates: jest.fn(() => ({
    milestones: mockMilestones,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("../useProjectImpacts", () => ({
  useProjectImpacts: jest.fn(() => ({
    impacts: mockImpacts,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

// =============================================================================
// Tests
// =============================================================================

describe("useProjectProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Data Aggregation", () => {
    it("should return project data", () => {
      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.project).toEqual(mockProject);
    });

    it("should determine verification based on grants", () => {
      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.isVerified).toBe(true);
    });

    it("should combine milestones and impacts into allUpdates", () => {
      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.allUpdates).toHaveLength(2);
      expect(result.current.allUpdates[0].type).toBe("milestone");
      expect(result.current.allUpdates[1].type).toBe("impact");
    });

    it("should count completed milestones", () => {
      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.completedCount).toBe(1);
    });

    it("should calculate stats correctly", () => {
      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.stats.grantsCount).toBe(1);
      expect(result.current.stats.endorsementsCount).toBe(2);
      expect(result.current.stats.lastUpdate).toEqual(new Date("2024-01-10T10:00:00Z"));
    });
  });

  describe("Loading State", () => {
    it("should aggregate loading states", () => {
      const useProject = require("@/hooks/useProject").useProject;
      useProject.mockReturnValue({ project: null, isLoading: true });

      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.isLoading).toBe(true);
    });

    it("should be not loading when all hooks are loaded", () => {
      const useProject = require("@/hooks/useProject").useProject;
      useProject.mockReturnValue({ project: mockProject, isLoading: false });

      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Refetch", () => {
    it("should call all refetch functions", async () => {
      const mockRefetchGrants = jest.fn().mockResolvedValue({});
      const mockRefetchUpdates = jest.fn().mockResolvedValue({});
      const mockRefetchImpacts = jest.fn().mockResolvedValue({});

      const useProjectGrants = require("../useProjectGrants").useProjectGrants;
      useProjectGrants.mockReturnValue({
        grants: mockGrants,
        isLoading: false,
        refetch: mockRefetchGrants,
      });

      const useProjectUpdates = require("../useProjectUpdates").useProjectUpdates;
      useProjectUpdates.mockReturnValue({
        milestones: mockMilestones,
        isLoading: false,
        refetch: mockRefetchUpdates,
      });

      const useProjectImpacts = require("../useProjectImpacts").useProjectImpacts;
      useProjectImpacts.mockReturnValue({
        impacts: mockImpacts,
        isLoading: false,
        refetch: mockRefetchImpacts,
      });

      const { result } = renderHook(() => useProjectProfile("test-project"));

      await result.current.refetch();

      expect(mockRefetchGrants).toHaveBeenCalled();
      expect(mockRefetchUpdates).toHaveBeenCalled();
      expect(mockRefetchImpacts).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null project", () => {
      const useProject = require("@/hooks/useProject").useProject;
      useProject.mockReturnValue({ project: null, isLoading: false });

      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.project).toBeNull();
      expect(result.current.stats.endorsementsCount).toBe(0);
    });

    it("should handle empty grants", () => {
      const useProjectGrants = require("../useProjectGrants").useProjectGrants;
      useProjectGrants.mockReturnValue({
        grants: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.isVerified).toBe(false);
      expect(result.current.stats.grantsCount).toBe(0);
    });

    it("should handle empty milestones and impacts", () => {
      const useProjectUpdates = require("../useProjectUpdates").useProjectUpdates;
      useProjectUpdates.mockReturnValue({
        milestones: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      const useProjectImpacts = require("../useProjectImpacts").useProjectImpacts;
      useProjectImpacts.mockReturnValue({
        impacts: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useProjectProfile("test-project"));

      expect(result.current.allUpdates).toEqual([]);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.stats.lastUpdate).toBeUndefined();
    });
  });
});
