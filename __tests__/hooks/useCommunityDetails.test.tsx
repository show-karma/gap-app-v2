import { waitFor } from "@testing-library/react";
import { createMockCommunity } from "@/__tests__/factories";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useCommunityDetails } from "@/hooks/v2/useCommunityDetails";

// getCommunityDetails uses React.cache() which doesn't work well in jsdom,
// so we mock the query function at the service level.
const mockGetCommunityDetails = vi.fn();
vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: (...args: unknown[]) => mockGetCommunityDetails(...args),
}));

const mockCommunity = createMockCommunity({
  details: {
    name: "Test Community",
    slug: "test-community",
    description: "A test community for unit tests",
    imageURL: "https://example.com/logo.png",
  },
});

describe("useCommunityDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("returns isLoading true while fetching", () => {
      mockGetCommunityDetails.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHookWithProviders(() => useCommunityDetails("test-community"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.community).toBeNull();
    });
  });

  describe("success state", () => {
    it("returns community data on successful fetch", async () => {
      mockGetCommunityDetails.mockResolvedValue(mockCommunity);

      const { result } = renderHookWithProviders(() => useCommunityDetails("test-community"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.community).toBeTruthy();
      expect(result.current.community?.details?.name).toBe("Test Community");
      expect(result.current.isError).toBe(false);
    });

    it("returns null community when API returns null", async () => {
      mockGetCommunityDetails.mockResolvedValue(null);

      const { result } = renderHookWithProviders(() => useCommunityDetails("unknown"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.community).toBeNull();
    });
  });

  describe("error state", () => {
    it("sets isError when service throws", async () => {
      mockGetCommunityDetails.mockRejectedValue(new Error("Network error"));

      const { result } = renderHookWithProviders(() => useCommunityDetails("test-community"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.community).toBeNull();
    });
  });

  describe("disabled state", () => {
    it("does not fetch when communityUIDorSlug is undefined", () => {
      const { result } = renderHookWithProviders(() => useCommunityDetails(undefined));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.community).toBeNull();
      expect(mockGetCommunityDetails).not.toHaveBeenCalled();
    });

    it("does not fetch when enabled option is false", () => {
      const { result } = renderHookWithProviders(() =>
        useCommunityDetails("test-community", { enabled: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.community).toBeNull();
      expect(mockGetCommunityDetails).not.toHaveBeenCalled();
    });
  });

  describe("isFetching", () => {
    it("exposes isFetching alongside isLoading", async () => {
      mockGetCommunityDetails.mockResolvedValue(mockCommunity);

      const { result } = renderHookWithProviders(() => useCommunityDetails("test-community"));

      // Initially loading and fetching
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("refetch", () => {
    it("provides a refetch function", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(mockCommunity).mockResolvedValueOnce({
        ...mockCommunity,
        details: { ...mockCommunity.details, name: "Updated Community" },
      });

      const { result } = renderHookWithProviders(() => useCommunityDetails("test-community"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.community?.details?.name).toBe("Test Community");

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.community?.details?.name).toBe("Updated Community");
      });
    });
  });

  describe("query key correctness", () => {
    it("calls service with the correct slug", async () => {
      mockGetCommunityDetails.mockResolvedValue(mockCommunity);

      renderHookWithProviders(() => useCommunityDetails("my-special-slug"));

      await waitFor(() => {
        expect(mockGetCommunityDetails).toHaveBeenCalledWith("my-special-slug");
      });
    });
  });
});
