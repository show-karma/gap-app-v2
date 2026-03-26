/**
 * @file Tests for useCartChainPayoutAddresses hook
 * @description Tests for the cart chain payout addresses hook that fetches
 * chain-specific payout addresses for cart items
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useCartChainPayoutAddresses } from "@/hooks/donation/useCartChainPayoutAddresses";

// Mock the project service
vi.mock("@/services/project.service", () => ({
  getProject: vi.fn(),
}));

import { getProject } from "@/services/project.service";

const mockGetProject = getProject as unknown as vi.Mock;

describe("useCartChainPayoutAddresses", () => {
  const mockItems = [
    { uid: "project-1", slug: "project-1-slug", title: "Project 1" },
    { uid: "project-2", slug: "project-2-slug", title: "Project 2" },
  ];

  const mockChainPayoutAddresses = {
    "10": "0x1111111111111111111111111111111111111111",
    "8453": "0x2222222222222222222222222222222222222222",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      mockGetProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses([]));

      expect(result.current.chainPayoutAddresses).toEqual({});
      expect(result.current.missingPayouts).toEqual([]);
      expect(result.current.isFetching).toBe(false);
    });

    it("should not fetch when items array is empty", async () => {
      renderHook(() => useCartChainPayoutAddresses([]));

      await waitFor(() => {
        expect(mockGetProject).not.toHaveBeenCalled();
      });
    });
  });

  describe("fetching addresses", () => {
    it("should fetch chain payout addresses for all items", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetProject).toHaveBeenCalledTimes(2);
      expect(mockGetProject).toHaveBeenCalledWith("project-1-slug");
      expect(mockGetProject).toHaveBeenCalledWith("project-2-slug");
    });

    it("should use uid when slug is not available", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const itemsWithoutSlug = [{ uid: "project-1", title: "Project 1" }];

      renderHook(() => useCartChainPayoutAddresses(itemsWithoutSlug));

      await waitFor(() => {
        expect(mockGetProject).toHaveBeenCalledWith("project-1");
      });
    });

    it("should set chainPayoutAddresses for projects with configured addresses", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.chainPayoutAddresses).toEqual({
        "project-1": mockChainPayoutAddresses,
        "project-2": mockChainPayoutAddresses,
      });
      expect(result.current.missingPayouts).toEqual([]);
    });

    it("should add to missingPayouts when project has no chainPayoutAddress", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: null });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.missingPayouts).toEqual(["project-1", "project-2"]);
      expect(result.current.chainPayoutAddresses).toEqual({});
    });

    it("should add to missingPayouts when project has empty chainPayoutAddress", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: {} });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.missingPayouts).toEqual(["project-1", "project-2"]);
    });

    it("should add to missingPayouts when project is not found", async () => {
      mockGetProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.missingPayouts).toEqual(["project-1", "project-2"]);
    });
  });

  describe("mixed results", () => {
    it("should handle mixed results with some projects having addresses and some not", async () => {
      mockGetProject
        .mockResolvedValueOnce({ chainPayoutAddress: mockChainPayoutAddresses })
        .mockResolvedValueOnce({ chainPayoutAddress: null });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.chainPayoutAddresses).toEqual({
        "project-1": mockChainPayoutAddresses,
      });
      expect(result.current.missingPayouts).toEqual(["project-2"]);
    });
  });

  describe("error handling", () => {
    it("should handle fetch errors gracefully", async () => {
      mockGetProject.mockRejectedValue(new Error("Network error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch chain payout addresses:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("refetching", () => {
    it("should refetch when items change", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result, rerender } = renderHook(({ items }) => useCartChainPayoutAddresses(items), {
        initialProps: { items: mockItems },
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetProject).toHaveBeenCalledTimes(2);

      // Add a new item
      const newItems = [
        ...mockItems,
        { uid: "project-3", slug: "project-3-slug", title: "Project 3" },
      ];

      rerender({ items: newItems });

      await waitFor(() => {
        expect(mockGetProject).toHaveBeenCalledTimes(5); // 2 original + 3 new
      });
    });

    it("should not refetch when items reference changes but content is the same", async () => {
      mockGetProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result, rerender } = renderHook(({ items }) => useCartChainPayoutAddresses(items), {
        initialProps: { items: mockItems },
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetProject).toHaveBeenCalledTimes(2);

      // Same UIDs, different array reference
      const sameItems = [...mockItems];
      rerender({ items: sameItems });

      // Should not trigger additional fetches since UIDs are the same
      expect(mockGetProject).toHaveBeenCalledTimes(2);
    });
  });

  describe("setMissingPayouts", () => {
    it("should provide setMissingPayouts function", () => {
      mockGetProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses([]));

      expect(typeof result.current.setMissingPayouts).toBe("function");
    });

    it("should update missingPayouts when setMissingPayouts is called", async () => {
      mockGetProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses([]));

      act(() => {
        result.current.setMissingPayouts(["new-project"]);
      });

      expect(result.current.missingPayouts).toEqual(["new-project"]);
    });
  });
});
