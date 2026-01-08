/**
 * @file Tests for useCartChainPayoutAddresses hook
 * @description Tests for the cart chain payout addresses hook that fetches
 * chain-specific payout addresses for cart items
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useCartChainPayoutAddresses } from "@/hooks/donation/useCartChainPayoutAddresses";

// Mock the project service
jest.mock("@/services/project.service", () => ({
  getProject: jest.fn(),
}));

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
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses([]));

      expect(result.current.chainPayoutAddresses).toEqual({});
      expect(result.current.missingPayouts).toEqual([]);
      expect(result.current.isFetching).toBe(false);
    });

    it("should not fetch when items array is empty", async () => {
      const { getProject } = require("@/services/project.service");

      renderHook(() => useCartChainPayoutAddresses([]));

      await waitFor(() => {
        expect(getProject).not.toHaveBeenCalled();
      });
    });
  });

  describe("fetching addresses", () => {
    it("should fetch chain payout addresses for all items", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(getProject).toHaveBeenCalledTimes(2);
      expect(getProject).toHaveBeenCalledWith("project-1-slug");
      expect(getProject).toHaveBeenCalledWith("project-2-slug");
    });

    it("should use uid when slug is not available", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const itemsWithoutSlug = [{ uid: "project-1", title: "Project 1" }];

      renderHook(() => useCartChainPayoutAddresses(itemsWithoutSlug));

      await waitFor(() => {
        expect(getProject).toHaveBeenCalledWith("project-1");
      });
    });

    it("should set chainPayoutAddresses for projects with configured addresses", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

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
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: null });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.missingPayouts).toEqual(["project-1", "project-2"]);
      expect(result.current.chainPayoutAddresses).toEqual({});
    });

    it("should add to missingPayouts when project has empty chainPayoutAddress", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: {} });

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.missingPayouts).toEqual(["project-1", "project-2"]);
    });

    it("should add to missingPayouts when project is not found", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses(mockItems));

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.missingPayouts).toEqual(["project-1", "project-2"]);
    });
  });

  describe("mixed results", () => {
    it("should handle mixed results with some projects having addresses and some not", async () => {
      const { getProject } = require("@/services/project.service");
      getProject
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
      const { getProject } = require("@/services/project.service");
      getProject.mockRejectedValue(new Error("Network error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

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
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result, rerender } = renderHook(({ items }) => useCartChainPayoutAddresses(items), {
        initialProps: { items: mockItems },
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(getProject).toHaveBeenCalledTimes(2);

      // Add a new item
      const newItems = [
        ...mockItems,
        { uid: "project-3", slug: "project-3-slug", title: "Project 3" },
      ];

      rerender({ items: newItems });

      await waitFor(() => {
        expect(getProject).toHaveBeenCalledTimes(5); // 2 original + 3 new
      });
    });

    it("should not refetch when items reference changes but content is the same", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue({ chainPayoutAddress: mockChainPayoutAddresses });

      const { result, rerender } = renderHook(({ items }) => useCartChainPayoutAddresses(items), {
        initialProps: { items: mockItems },
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(getProject).toHaveBeenCalledTimes(2);

      // Same UIDs, different array reference
      const sameItems = [...mockItems];
      rerender({ items: sameItems });

      // Should not trigger additional fetches since UIDs are the same
      expect(getProject).toHaveBeenCalledTimes(2);
    });
  });

  describe("setMissingPayouts", () => {
    it("should provide setMissingPayouts function", () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses([]));

      expect(typeof result.current.setMissingPayouts).toBe("function");
    });

    it("should update missingPayouts when setMissingPayouts is called", async () => {
      const { getProject } = require("@/services/project.service");
      getProject.mockResolvedValue(null);

      const { result } = renderHook(() => useCartChainPayoutAddresses([]));

      act(() => {
        result.current.setMissingPayouts(["new-project"]);
      });

      expect(result.current.missingPayouts).toEqual(["new-project"]);
    });
  });
});
