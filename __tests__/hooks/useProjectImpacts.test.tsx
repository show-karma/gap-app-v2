import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useProjectImpacts } from "@/hooks/v2/useProjectImpacts";
import type { ProjectImpact } from "@/services/project-impacts.service";

const mockGetProjectImpacts = vi.fn();
vi.mock("@/services/project-impacts.service", () => ({
  getProjectImpacts: (...args: unknown[]) => mockGetProjectImpacts(...args),
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}));

function createMockImpact(overrides?: Partial<ProjectImpact>): ProjectImpact {
  return {
    uid: "impact-001",
    refUID: "ref-001",
    chainID: 10,
    data: {
      work: "Built indexer v2",
      impact: "Reduced query times by 80%",
      proof: "https://github.com/example/pr/42",
      startDate: 1700000000,
      endDate: 1710000000,
    },
    verified: [],
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-06-15T00:00:00Z",
    ...overrides,
  };
}

describe("useProjectImpacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("starts in loading state", () => {
      mockGetProjectImpacts.mockReturnValue(new Promise(() => {}));

      const { result } = renderHookWithProviders(() => useProjectImpacts("test-project"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.impacts).toEqual([]);
    });
  });

  describe("success state", () => {
    it("returns impacts array on success", async () => {
      const impacts = [
        createMockImpact({ uid: "impact-1" }),
        createMockImpact({
          uid: "impact-2",
          data: { work: "Deployed SDK", impact: "10x developer adoption" },
        }),
      ];

      mockGetProjectImpacts.mockResolvedValue(impacts);

      const { result } = renderHookWithProviders(() => useProjectImpacts("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.impacts).toHaveLength(2);
      expect(result.current.impacts[0].uid).toBe("impact-1");
      expect(result.current.impacts[1].data?.work).toBe("Deployed SDK");
      expect(result.current.error).toBeNull();
    });

    it("returns empty array when project has no impacts", async () => {
      mockGetProjectImpacts.mockResolvedValue([]);

      const { result } = renderHookWithProviders(() => useProjectImpacts("empty-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.impacts).toEqual([]);
    });
  });

  describe("error state", () => {
    it("sets error when service throws", async () => {
      mockGetProjectImpacts.mockRejectedValue(new Error("Server error"));

      const { result } = renderHookWithProviders(() => useProjectImpacts("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.impacts).toEqual([]);
    });
  });

  describe("disabled state", () => {
    it("does not fetch when projectIdOrSlug is empty", () => {
      const { result } = renderHookWithProviders(() => useProjectImpacts(""));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.impacts).toEqual([]);
      expect(mockGetProjectImpacts).not.toHaveBeenCalled();
    });
  });

  describe("refetch", () => {
    it("re-fetches data via refetch", async () => {
      mockGetProjectImpacts
        .mockResolvedValueOnce([createMockImpact({ uid: "v1" })])
        .mockResolvedValueOnce([createMockImpact({ uid: "v2" })]);

      const { result } = renderHookWithProviders(() => useProjectImpacts("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.impacts[0].uid).toBe("v1");

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.impacts[0].uid).toBe("v2");
      });
    });
  });

  describe("impact data structure", () => {
    it("preserves verified attestations", async () => {
      const impact = createMockImpact({
        verified: [{ uid: "verify-1", attester: "0xabc", createdAt: "2024-07-01T00:00:00Z" }],
      });

      mockGetProjectImpacts.mockResolvedValue([impact]);

      const { result } = renderHookWithProviders(() => useProjectImpacts("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.impacts[0].verified).toHaveLength(1);
      expect(result.current.impacts[0].verified?.[0].attester).toBe("0xabc");
    });
  });
});
