/**
 * @file Tests for ProgramRegistryService
 * @description Tests for the program registry service layer
 * covering business logic, error handling, and response parsing
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { ProgramRegistryService } from "@/services/programRegistry.service";
import type { CommunityDetails } from "@/types/community";
import type { CreateProgramFormData } from "@/types/program-registry";
import { INDEXER } from "@/utilities/indexer";

// Use pre-registered mock from bun-setup.ts
const getMocks = () => (globalThis as any).__mocks__;

describe("ProgramRegistryService", () => {
  let mockFetchData: any;

  const mockCommunity: CommunityDetails = {
    uid: "0x1234567890123456789012345678901234567890",
    chainID: 1,
    details: {
      name: "Test Community",
      description: "Test community description",
      slug: "test-community",
      logoUrl: "",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  const mockFormData: CreateProgramFormData = {
    name: "Test Program",
    description: "Test Description",
    shortDescription: "Short description",
    dates: {
      startsAt: new Date("2024-01-01"),
      endsAt: new Date("2024-12-31"),
    },
    budget: 100000,
  };

  beforeEach(() => {
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
    if (mockFetchData?.mockReset) mockFetchData.mockReset();
  });

  describe("buildProgramMetadata", () => {
    it("should build metadata correctly from form data and community", () => {
      const metadata = ProgramRegistryService.buildProgramMetadata(mockFormData, mockCommunity);

      expect(metadata).toEqual({
        title: "Test Program",
        description: "Test Description",
        shortDescription: "Short description",
        programBudget: 100000,
        startsAt: new Date("2024-01-01"),
        endsAt: new Date("2024-12-31"),
        website: "",
        projectTwitter: "",
        socialLinks: {
          twitter: "",
          website: "",
          discord: "",
          orgWebsite: "",
          blog: "",
          forum: "",
          grantsSite: "",
          telegram: "",
        },
        bugBounty: "",
        categories: [],
        ecosystems: [],
        organizations: [],
        networks: [],
        grantTypes: [],
        platformsUsed: [],
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        status: "Active",
        type: "program",
        tags: ["karma-gap", "grant-program-registry"],
        communityRef: [mockCommunity.uid],
      });
    });

    it("should handle optional fields correctly", () => {
      const formDataWithoutOptional: CreateProgramFormData = {
        name: "Test Program",
        description: "Test Description",
        shortDescription: "Short description",
        dates: {},
      };

      const metadata = ProgramRegistryService.buildProgramMetadata(
        formDataWithoutOptional,
        mockCommunity
      );

      expect(metadata.programBudget).toBeUndefined();
      expect(metadata.startsAt).toBeUndefined();
      expect(metadata.endsAt).toBeUndefined();
    });

    it("should use community UID in communityRef", () => {
      const metadata = ProgramRegistryService.buildProgramMetadata(mockFormData, mockCommunity);

      expect(metadata.communityRef).toEqual([mockCommunity.uid]);
      expect(metadata.communityRef).not.toContain(mockCommunity.slug);
    });
  });

  describe("extractProgramId", () => {
    it("should extract ID from { _id: { $oid: '...' } } format", () => {
      const response = {
        _id: {
          $oid: "program-123",
        },
      };

      const programId = ProgramRegistryService.extractProgramId(response);
      expect(programId).toBe("program-123");
    });

    it("should extract ID from { program: { _id: { $oid: '...' } } } format", () => {
      const response = {
        program: {
          _id: {
            $oid: "program-456",
          },
        },
      };

      const programId = ProgramRegistryService.extractProgramId(response);
      expect(programId).toBe("program-456");
    });

    it("should extract ID from { id: '...' } format", () => {
      const response = {
        id: "program-789",
      };

      const programId = ProgramRegistryService.extractProgramId(response);
      expect(programId).toBe("program-789");
    });

    it("should extract ID from string format", () => {
      const response = "program-string-id";

      const programId = ProgramRegistryService.extractProgramId(response);
      expect(programId).toBe("program-string-id");
    });

    it("should return undefined for invalid response formats", () => {
      expect(ProgramRegistryService.extractProgramId(null)).toBeUndefined();
      expect(ProgramRegistryService.extractProgramId(undefined)).toBeUndefined();
      expect(ProgramRegistryService.extractProgramId({})).toBeUndefined();
      expect(ProgramRegistryService.extractProgramId({ invalid: "format" })).toBeUndefined();
    });
  });

  describe("createProgram", () => {
    const mockOwner = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const mockChainId = 1;
    const mockMetadata = ProgramRegistryService.buildProgramMetadata(mockFormData, mockCommunity);

    it("should create program successfully", async () => {
      const mockResponse = {
        programId: "program-123",
        isValid: true,
      };

      mockFetchData.mockResolvedValue([mockResponse, null]);

      const result = await ProgramRegistryService.createProgram(
        mockOwner,
        mockChainId,
        mockMetadata
      );

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.REGISTRY.V2.CREATE,
        "POST",
        {
          chainId: mockChainId,
          metadata: mockMetadata,
        },
        {},
        {},
        true
      );

      expect(result).toEqual({
        programId: "program-123",
        success: true,
        requiresManualApproval: false,
      });
    });

    it("should handle different response formats", async () => {
      // V2 response format with programId and isValid
      const testCases = [
        { response: { programId: "id1", isValid: true }, expected: "id1", requiresApproval: false },
        { response: { programId: "id2", isValid: null }, expected: "id2", requiresApproval: true },
        { response: { programId: "id3", isValid: false }, expected: "id3", requiresApproval: true },
        // Legacy V1 formats (extractProgramId should still handle them)
        { response: { _id: { $oid: "id4" } }, expected: "id4", requiresApproval: true },
        {
          response: { program: { _id: { $oid: "id5" } } },
          expected: "id5",
          requiresApproval: true,
        },
        { response: { id: "id6" }, expected: "id6", requiresApproval: true },
        { response: "id7", expected: "id7", requiresApproval: true },
      ];

      for (const testCase of testCases) {
        mockFetchData.mockResolvedValue([testCase.response, null]);

        const result = await ProgramRegistryService.createProgram(
          mockOwner,
          mockChainId,
          mockMetadata
        );

        expect(result.programId).toBe(testCase.expected);
        expect(result.success).toBe(true);
        expect(result.requiresManualApproval).toBe(testCase.requiresApproval);
      }
    });

    it("should handle missing program ID in response", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      const result = await ProgramRegistryService.createProgram(
        mockOwner,
        mockChainId,
        mockMetadata
      );

      expect(result).toEqual({
        programId: "",
        success: true,
        requiresManualApproval: true,
      });
    });

    it("should throw error when fetchData returns error", async () => {
      const mockError = "Creation failed";
      mockFetchData.mockResolvedValue([null, mockError]);

      await expect(
        ProgramRegistryService.createProgram(mockOwner, mockChainId, mockMetadata)
      ).rejects.toThrow("Creation failed");
    });

    it("should throw error when fetchData throws", async () => {
      const mockError = new Error("Network error");
      mockFetchData.mockRejectedValue(mockError);

      await expect(
        ProgramRegistryService.createProgram(mockOwner, mockChainId, mockMetadata)
      ).rejects.toThrow("Network error");
    });
  });

  describe("approveProgram", () => {
    const mockProgramId = "program-123";

    it("should approve program successfully", async () => {
      mockFetchData.mockResolvedValue([{ success: true }, null]);

      await ProgramRegistryService.approveProgram(mockProgramId);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.REGISTRY.V2.APPROVE,
        "POST",
        {
          programId: mockProgramId,
          isValid: "accepted",
        },
        {},
        {},
        true
      );
    });

    it("should throw error when fetchData returns error", async () => {
      const mockError = "Approval failed";
      mockFetchData.mockResolvedValue([null, mockError]);

      await expect(ProgramRegistryService.approveProgram(mockProgramId)).rejects.toThrow(
        "Approval failed"
      );
    });

    it("should throw error when fetchData throws", async () => {
      const mockError = new Error("Network error");
      mockFetchData.mockRejectedValue(mockError);

      await expect(ProgramRegistryService.approveProgram(mockProgramId)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("Integration", () => {
    it("should handle complete program creation and approval flow", async () => {
      const mockOwner = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      const mockChainId = 1;
      const mockMetadata = ProgramRegistryService.buildProgramMetadata(mockFormData, mockCommunity);

      // Mock V2 creation response
      mockFetchData
        .mockResolvedValueOnce([{ programId: "program-123", isValid: null }, null])
        .mockResolvedValueOnce([{ success: true }, null]);

      const createResult = await ProgramRegistryService.createProgram(
        mockOwner,
        mockChainId,
        mockMetadata
      );

      expect(createResult.programId).toBe("program-123");
      expect(createResult.success).toBe(true);

      await ProgramRegistryService.approveProgram(createResult.programId);

      expect(mockFetchData).toHaveBeenCalledTimes(2);
      expect(mockFetchData).toHaveBeenNthCalledWith(
        1,
        INDEXER.REGISTRY.V2.CREATE,
        "POST",
        expect.objectContaining({
          chainId: mockChainId,
          metadata: expect.any(Object),
        }),
        {},
        {},
        true
      );
      expect(mockFetchData).toHaveBeenNthCalledWith(
        2,
        INDEXER.REGISTRY.V2.APPROVE,
        "POST",
        {
          programId: "program-123",
          isValid: "accepted",
        },
        {},
        {},
        true
      );
    });
  });
});
