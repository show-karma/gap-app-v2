/**
 * @file Tests for attestation-polling utility
 * @description Tests polling utilities for grant and milestone completion
 */

import { pollForGrantCompletion, pollForMilestoneStatus } from "@/utilities/attestation-polling";
import * as retriesModule from "@/utilities/retries";

// Mock dependencies
jest.mock("@/utilities/retries");

const mockRetryUntilConditionMet = retriesModule.retryUntilConditionMet as jest.MockedFunction<
  typeof retriesModule.retryUntilConditionMet
>;

describe("pollForGrantCompletion", () => {
  const mockGapClient = {
    fetch: {
      projectById: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Polling", () => {
    it("should poll until grant is completed", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        // Mock that the condition is met immediately
        await conditionFn();
      });

      const mockProject = {
        grants: [{ uid: "grant-1", completed: { completedAt: Date.now() } }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      expect(mockRetryUntilConditionMet).toHaveBeenCalled();
      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];

      // Test the condition function
      const result = await conditionFn();
      expect(result).toBe(true);
    });

    it("should use custom polling parameters", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [{ uid: "grant-1", completed: true }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
        maxRetries: 50,
        retryDelayMs: 2000,
      });

      expect(mockRetryUntilConditionMet).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        50,
        2000
      );
    });

    it("should use default polling parameters", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [{ uid: "grant-1", completed: true }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      expect(mockRetryUntilConditionMet).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        40,
        1500
      );
    });
  });

  describe("Condition Function Logic", () => {
    it("should return false when project not found", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      mockGapClient.fetch.projectById.mockResolvedValue(null);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });

    it("should return false when grant not found", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [{ uid: "other-grant", completed: true }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });

    it("should return false when grant not completed", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [{ uid: "grant-1", completed: null }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });

    it("should handle case-insensitive grant UID matching", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [{ uid: "Grant-1", completed: true }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForGrantCompletion({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(true);
    });
  });
});

describe("pollForMilestoneStatus", () => {
  const mockGapClient = {
    fetch: {
      projectById: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Verification Only", () => {
    it("should poll for verification when checkCompletion is false", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [
              {
                uid: "milestone-1",
                verified: [{ attester: "0x123" }],
              },
            ],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: false,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(true);
    });

    it("should handle case-insensitive address matching", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [
              {
                uid: "milestone-1",
                verified: [{ attester: "0xABC" }],
              },
            ],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: false,
        userAddress: "0xabc",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(true);
    });
  });

  describe("Completion and Verification", () => {
    it("should poll for both completion and verification", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [
              {
                uid: "milestone-1",
                completed: true,
                verified: [{ attester: "0x123" }],
              },
            ],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: true,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(true);
    });

    it("should return false when completed but not verified", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [
              {
                uid: "milestone-1",
                completed: true,
                verified: [],
              },
            ],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: true,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });

    it("should return false when verified but not completed", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [
              {
                uid: "milestone-1",
                completed: false,
                verified: [{ attester: "0x123" }],
              },
            ],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: true,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });
  });

  describe("Error Cases", () => {
    it("should return false when project not found", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      mockGapClient.fetch.projectById.mockResolvedValue(null);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: false,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });

    it("should return false when grant not found", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [{ details: { programId: "other-program" } }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: false,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });

    it("should return false when milestone not found", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [{ uid: "other-milestone" }],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: false,
        userAddress: "0x123",
      });

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();
      expect(result).toBe(false);
    });
  });

  describe("Custom Parameters", () => {
    it("should use custom polling parameters", async () => {
      mockRetryUntilConditionMet.mockImplementation(async (conditionFn) => {
        await conditionFn();
      });

      const mockProject = {
        grants: [
          {
            details: { programId: "program-1" },
            milestones: [
              {
                uid: "milestone-1",
                verified: [{ attester: "0x123" }],
              },
            ],
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await pollForMilestoneStatus({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
        checkCompletion: false,
        userAddress: "0x123",
        maxRetries: 60,
        retryDelayMs: 3000,
      });

      expect(mockRetryUntilConditionMet).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        60,
        3000
      );
    });
  });
});
