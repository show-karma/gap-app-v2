import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiPost, mockApiDelete } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockApiDelete: vi.fn(),
}));

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({
    post: mockApiPost,
    delete: mockApiDelete,
  }),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    REGISTRY: {
      V2: {
        CREATE: "/v2/program-registry",
        UPDATE: (id: string) => `/v2/program-registry/${id}`,
        APPROVE: "/v2/program-registry/approve",
        GET_BY_ID: (id: string) => `/v2/program-registry/${id}`,
        GET_ALL: (params?: any) => {
          const qs = new URLSearchParams();
          if (params?.page) qs.set("page", params.page.toString());
          if (params?.limit) qs.set("limit", params.limit.toString());
          if (params?.isValid) qs.set("isValid", params.isValid);
          const q = qs.toString();
          return `/v2/program-registry${q ? `?${q}` : ""}`;
        },
      },
    },
    V2: {
      FUNDING_PROGRAMS: {
        REVIEWERS: (programId: string) => `/v2/funding-program-configs/${programId}/reviewers`,
      },
    },
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.example.com",
  },
}));

vi.mock("@/utilities/validators", () => ({
  validateEmail: vi.fn(() => true),
  validateTelegram: vi.fn(() => true),
  validateReviewerData: vi.fn(() => ({ valid: true, errors: [] })),
}));

vi.mock("axios", () => ({
  default: { isAxiosError: vi.fn(() => false) },
  isAxiosError: vi.fn(() => false),
}));

import { programReviewersService } from "@/services/program-reviewers.service";
import { ProgramRegistryService } from "@/src/features/program-registry/services/program-registry.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

describe("ProgramRegistryService trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- createProgram ---

  describe("createProgram", () => {
    it("calls fetchData with POST to V2 create endpoint", async () => {
      mockFetchData.mockResolvedValue([{ programId: "new-123", isValid: true }, null, null, 201]);

      await ProgramRegistryService.createProgram("0xowner", 1, {
        title: "Test Program",
      } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/program-registry",
        "POST",
        expect.objectContaining({
          chainId: 1,
          metadata: expect.objectContaining({ title: "Test Program" }),
        }),
        {},
        {},
        true
      );
    });

    it("returns programId and success status", async () => {
      mockFetchData.mockResolvedValue([{ programId: "new-123", isValid: true }, null, null, 201]);

      const result = await ProgramRegistryService.createProgram("0xowner", 1, {
        title: "Test",
      } as any);

      expect(result.programId).toBe("new-123");
      expect(result.success).toBe(true);
      expect(result.requiresManualApproval).toBe(false);
    });

    it("sets requiresManualApproval=true when isValid is not true", async () => {
      mockFetchData.mockResolvedValue([{ programId: "new-123" }, null, null, 201]);

      const result = await ProgramRegistryService.createProgram("0xowner", 1, {
        title: "Test",
      } as any);

      expect(result.requiresManualApproval).toBe(true);
    });

    it("throws on fetchData error", async () => {
      mockFetchData.mockResolvedValue([null, "Validation Error", null, 400]);

      await expect(ProgramRegistryService.createProgram("0xowner", 1, {} as any)).rejects.toThrow(
        "Validation Error"
      );
    });
  });

  // --- updateProgram ---

  describe("updateProgram", () => {
    it("calls fetchData with PUT method", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      await ProgramRegistryService.updateProgram("p1", {
        title: "Updated",
      } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/program-registry/p1",
        "PUT",
        expect.objectContaining({
          metadata: expect.objectContaining({ title: "Updated" }),
        }),
        {},
        {},
        true
      );
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Not Found", null, 404]);

      await expect(ProgramRegistryService.updateProgram("p1", {} as any)).rejects.toThrow(
        "Not Found"
      );
    });
  });

  // --- approveProgram ---

  describe("approveProgram", () => {
    it("calls POST with programId and isValid status", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      await ProgramRegistryService.approveProgram("p1", "accepted");

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/program-registry/approve",
        "POST",
        expect.objectContaining({
          programId: "p1",
          isValid: "accepted",
        }),
        {},
        {},
        true
      );
    });

    it("defaults to accepted when no status provided", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      await ProgramRegistryService.approveProgram("p1");

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.any(String),
        "POST",
        expect.objectContaining({ isValid: "accepted" }),
        {},
        {},
        true
      );
    });
  });

  // --- extractProgramId ---

  describe("extractProgramId", () => {
    it("extracts from V2 format {programId}", () => {
      expect(ProgramRegistryService.extractProgramId({ programId: "abc" })).toBe("abc");
    });

    it("extracts from V1 format {_id: {$oid}}", () => {
      expect(
        ProgramRegistryService.extractProgramId({
          _id: { $oid: "mongo-id" },
        })
      ).toBe("mongo-id");
    });

    it("extracts from {id} format", () => {
      expect(ProgramRegistryService.extractProgramId({ id: "simple-id" })).toBe("simple-id");
    });

    it("returns undefined for null/undefined", () => {
      expect(ProgramRegistryService.extractProgramId(null)).toBeUndefined();
      expect(ProgramRegistryService.extractProgramId(undefined)).toBeUndefined();
    });
  });
});

describe("programReviewersService trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getReviewers ---

  describe("getReviewers", () => {
    it("maps API response to ProgramReviewer format", async () => {
      mockFetchData.mockResolvedValue([
        {
          reviewers: [
            {
              publicAddress: "0x123",
              programId: "p1",
              chainID: 1,
              userProfile: {
                name: "Alice",
                email: "alice@example.com",
                telegram: "@alice",
              },
              assignedAt: "2024-01-01",
              assignedBy: "0xadmin",
            },
          ],
        },
        null,
        null,
        200,
      ]);

      const result = await programReviewersService.getReviewers("p1");

      expect(result).toEqual([
        {
          publicAddress: "0x123",
          name: "Alice",
          email: "alice@example.com",
          telegram: "@alice",
          slack: "",
          assignedAt: "2024-01-01",
          assignedBy: "0xadmin",
        },
      ]);
    });

    it("returns empty array when 'No reviewers found' error", async () => {
      mockFetchData.mockResolvedValue([null, "No reviewers found", null, 404]);

      const result = await programReviewersService.getReviewers("p1");

      expect(result).toEqual([]);
    });

    it("returns empty array when 'Program Reviewer Not Found' error", async () => {
      mockFetchData.mockResolvedValue([null, "Program Reviewer Not Found", null, 404]);

      const result = await programReviewersService.getReviewers("p1");

      expect(result).toEqual([]);
    });

    it("throws on other errors", async () => {
      mockFetchData.mockResolvedValue([null, "Internal server error", null, 500]);

      await expect(programReviewersService.getReviewers("p1")).rejects.toThrow(
        "Internal server error"
      );
    });
  });

  // --- addReviewer ---

  describe("addReviewer", () => {
    it("calls apiClient.post with reviewer data", async () => {
      mockApiPost.mockResolvedValue({
        data: {
          reviewer: {
            publicAddress: "0x456",
            userProfile: {
              name: "Bob",
              email: "bob@example.com",
            },
            assignedAt: "2024-01-01",
          },
        },
      });

      const result = await programReviewersService.addReviewer("p1", {
        name: "Bob",
        email: "bob@example.com",
      });

      expect(mockApiPost).toHaveBeenCalledWith("/v2/funding-program-configs/p1/reviewers", {
        name: "Bob",
        email: "bob@example.com",
      });
      expect(result.publicAddress).toBe("0x456");
      expect(result.name).toBe("Bob");
    });

    it("returns fallback when API returns no reviewer data", async () => {
      mockApiPost.mockResolvedValue({ data: {} });

      const result = await programReviewersService.addReviewer("p1", {
        name: "Charlie",
        email: "charlie@example.com",
        telegram: "@charlie",
      });

      expect(result.name).toBe("Charlie");
      expect(result.email).toBe("charlie@example.com");
      expect(result.telegram).toBe("@charlie");
      expect(result.assignedAt).toBeDefined();
    });
  });

  // --- removeReviewer ---

  describe("removeReviewer", () => {
    it("calls apiClient.delete with program ID and email", async () => {
      mockApiDelete.mockResolvedValue({});

      await programReviewersService.removeReviewer("p1", "reviewer@test.com");

      expect(mockApiDelete).toHaveBeenCalledWith(
        "/v2/funding-program-configs/p1/reviewers/by-email",
        { data: { email: "reviewer@test.com" } }
      );
    });
  });

  // --- addMultipleReviewers ---

  describe("addMultipleReviewers", () => {
    it("adds multiple reviewers and collects errors", async () => {
      // First reviewer succeeds
      mockApiPost.mockResolvedValueOnce({
        data: {
          reviewer: {
            publicAddress: "0x1",
            userProfile: { name: "A", email: "a@test.com" },
            assignedAt: "2024-01-01",
          },
        },
      });
      // Second reviewer fails
      mockApiPost.mockRejectedValueOnce(new Error("Duplicate reviewer"));

      const result = await programReviewersService.addMultipleReviewers("p1", [
        { name: "A", email: "a@test.com" },
        { name: "B", email: "b@test.com" },
      ]);

      expect(result.added).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Duplicate reviewer");
    });

    it("returns all added when no errors", async () => {
      mockApiPost.mockResolvedValue({
        data: {
          reviewer: {
            publicAddress: "0x1",
            userProfile: { name: "A", email: "a@test.com" },
            assignedAt: "2024-01-01",
          },
        },
      });

      const result = await programReviewersService.addMultipleReviewers("p1", [
        { name: "A", email: "a@test.com" },
      ]);

      expect(result.added).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  // --- FIXED: error.includes() crash ---

  describe("error handling with Error objects (fixed)", () => {
    it("handles Error objects gracefully via String() coercion", async () => {
      // fetchData returns Error objects for network errors (no response).
      // Previously this crashed because .includes() was called on Error objects.
      // Now uses String(error) to safely coerce before checking.
      const networkError = new Error("Network Error");
      mockFetchData.mockResolvedValue([null, networkError, null, 500]);

      // Should throw a regular Error with the stringified message, not TypeError
      await expect(programReviewersService.getReviewers("p1")).rejects.toThrow("Network Error");
    });
  });
});
