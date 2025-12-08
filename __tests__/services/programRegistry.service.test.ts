/**
 * @file Tests for ProgramRegistryService
 * @description Tests for the program registry service layer
 * covering business logic, error handling, and response parsing
 */

import { ProgramRegistryService } from "@/services/programRegistry.service";
import type { CommunityDetailsV2 } from "@/types/community";
import type { CreateProgramFormData } from "@/types/program-registry";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// Mock fetchData utility
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("ProgramRegistryService", () => {
  const mockCommunity: CommunityDetailsV2 = {
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
    jest.clearAllMocks();
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
        _id: {
          $oid: "program-123",
        },
      };

      (fetchData as jest.Mock).mockResolvedValue([mockResponse, null]);

      const result = await ProgramRegistryService.createProgram(
        mockOwner,
        mockChainId,
        mockMetadata
      );

      expect(fetchData).toHaveBeenCalledWith(
        INDEXER.REGISTRY.CREATE,
        "POST",
        {
          owner: mockOwner,
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
      const testCases = [
        { response: { _id: { $oid: "id1" } }, expected: "id1" },
        { response: { program: { _id: { $oid: "id2" } } }, expected: "id2" },
        { response: { id: "id3" }, expected: "id3" },
        { response: "id4", expected: "id4" },
      ];

      for (const testCase of testCases) {
        (fetchData as jest.Mock).mockResolvedValue([testCase.response, null]);

        const result = await ProgramRegistryService.createProgram(
          mockOwner,
          mockChainId,
          mockMetadata
        );

        expect(result.programId).toBe(testCase.expected);
        expect(result.success).toBe(true);
        expect(result.requiresManualApproval).toBe(false);
      }
    });

    it("should handle missing program ID in response", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{}, null]);

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
      (fetchData as jest.Mock).mockResolvedValue([null, mockError]);

      await expect(
        ProgramRegistryService.createProgram(mockOwner, mockChainId, mockMetadata)
      ).rejects.toThrow("Creation failed");
    });

    it("should throw error when fetchData throws", async () => {
      const mockError = new Error("Network error");
      (fetchData as jest.Mock).mockRejectedValue(mockError);

      await expect(
        ProgramRegistryService.createProgram(mockOwner, mockChainId, mockMetadata)
      ).rejects.toThrow("Network error");
    });
  });

  describe("approveProgram", () => {
    const mockProgramId = "program-123";

    it("should approve program successfully", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{ success: true }, null]);

      await ProgramRegistryService.approveProgram(mockProgramId);

      expect(fetchData).toHaveBeenCalledWith(
        INDEXER.REGISTRY.APPROVE,
        "POST",
        {
          id: mockProgramId,
          isValid: "accepted",
        },
        {},
        {},
        true
      );
    });

    it("should throw error when fetchData returns error", async () => {
      const mockError = "Approval failed";
      (fetchData as jest.Mock).mockResolvedValue([null, mockError]);

      await expect(ProgramRegistryService.approveProgram(mockProgramId)).rejects.toThrow(
        "Approval failed"
      );
    });

    it("should throw error when fetchData throws", async () => {
      const mockError = new Error("Network error");
      (fetchData as jest.Mock).mockRejectedValue(mockError);

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

      // Mock creation response
      (fetchData as jest.Mock)
        .mockResolvedValueOnce([{ _id: { $oid: "program-123" } }, null])
        .mockResolvedValueOnce([{ success: true }, null]);

      const createResult = await ProgramRegistryService.createProgram(
        mockOwner,
        mockChainId,
        mockMetadata
      );

      expect(createResult.programId).toBe("program-123");
      expect(createResult.success).toBe(true);

      await ProgramRegistryService.approveProgram(createResult.programId);

      expect(fetchData).toHaveBeenCalledTimes(2);
      expect(fetchData).toHaveBeenNthCalledWith(
        1,
        INDEXER.REGISTRY.CREATE,
        "POST",
        expect.objectContaining({
          owner: mockOwner,
          chainId: mockChainId,
        }),
        {},
        {},
        true
      );
      expect(fetchData).toHaveBeenNthCalledWith(
        2,
        INDEXER.REGISTRY.APPROVE,
        "POST",
        {
          id: "program-123",
          isValid: "accepted",
        },
        {},
        {},
        true
      );
    });
  });
});
