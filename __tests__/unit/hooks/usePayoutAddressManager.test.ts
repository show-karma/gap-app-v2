import { renderHook, waitFor } from "@testing-library/react";
import { usePayoutAddressManager } from "@/hooks/donation/usePayoutAddressManager";
import toast from "react-hot-toast";
import { isAddress } from "viem";

// Mock dependencies
jest.mock("react-hot-toast");

jest.mock("viem", () => ({
  isAddress: jest.fn(),
}));

jest.mock("@/utilities/gapIndexerApi", () => ({
  gapIndexerApi: {
    projectBySlug: jest.fn(),
  },
}));

describe("usePayoutAddressManager", () => {
  const mockValidAddress = "0x1234567890123456789012345678901234567890";
  const mockInvalidAddress = "invalid-address";

  const mockItems = [
    {
      uid: "project-1",
      slug: "project-1-slug",
      title: "Project 1",
      imageURL: "https://example.com/image1.png",
    },
    {
      uid: "project-2",
      slug: "project-2-slug",
      title: "Project 2",
    },
  ];

  const mockProjectResponse = {
    data: {
      uid: "project-1",
      title: "Project 1",
      payoutAddress: mockValidAddress,
      recipient: mockValidAddress,
      grants: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockIsAddress = isAddress as unknown as jest.Mock;
    mockIsAddress.mockImplementation((addr: string) => addr === mockValidAddress);

    (toast.error as jest.Mock).mockImplementation(() => {});
  });

  afterEach(async () => {
    // Wait for any pending promises to resolve before next test
    // This prevents memory leaks from unresolved promises
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() =>
        usePayoutAddressManager([], undefined)
      );

      expect(result.current.payoutAddresses).toEqual({});
      expect(result.current.missingPayouts).toEqual([]);
      expect(result.current.isFetchingPayouts).toBe(false);
    });

    it("should not fetch when no items provided", () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");

      renderHook(() => usePayoutAddressManager([], undefined));

      expect(gapIndexerApi.projectBySlug).not.toHaveBeenCalled();
    });
  });

  describe("fetching payout addresses", () => {
    it("should fetch payout addresses for all items", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      const { result } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      expect(result.current.isFetchingPayouts).toBe(true);

      await waitFor(() => {
        expect(result.current.isFetchingPayouts).toBe(false);
      });

      expect(gapIndexerApi.projectBySlug).toHaveBeenCalledTimes(2);
      expect(gapIndexerApi.projectBySlug).toHaveBeenCalledWith("project-1-slug");
      expect(gapIndexerApi.projectBySlug).toHaveBeenCalledWith("project-2-slug");
    });

    it("should use uid as fallback when slug is missing", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      const itemWithoutSlug = { uid: "project-3", title: "Project 3" };

      renderHook(() => usePayoutAddressManager([itemWithoutSlug], undefined));

      await waitFor(() => {
        expect(gapIndexerApi.projectBySlug).toHaveBeenCalledWith("project-3");
      });
    });

    it("should store resolved payout addresses", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      const { result } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBe(mockValidAddress);
      });
    });

    it("should handle fetch error gracefully", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      await waitFor(() => {
        expect(result.current.isFetchingPayouts).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Unable to load payout addresses")
      );
    });
  });

  describe("resolvePayoutAddress", () => {
    it("should resolve string payout address", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: mockValidAddress,
        },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBe(mockValidAddress);
      });
    });

    it("should resolve object payout address (community-specific)", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: {
            "community-1": mockValidAddress,
            "community-2": "0x9876543210987654321098765432109876543210",
          },
        },
      });

      const mockIsAddress = isAddress as unknown as jest.Mock;
      mockIsAddress.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], "community-1")
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBe(mockValidAddress);
      });
    });

    it("should use first available address from object when community ID not provided", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      const firstAddress = "0x9876543210987654321098765432109876543210";
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: {
            "community-1": firstAddress,
            "community-2": mockValidAddress,
          },
        },
      });

      const mockIsAddress = isAddress as unknown as jest.Mock;
      mockIsAddress.mockReturnValue(true);

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        // Should get first valid address from object
        expect(result.current.payoutAddresses["project-1"]).toBeTruthy();
      });
    });

    it("should fallback to grant payout address", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: undefined,
          grants: [
            {
              details: {
                data: {
                  payoutAddress: mockValidAddress,
                },
              },
            },
          ],
        },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBe(mockValidAddress);
      });
    });

    it("should fallback to recipient address", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: undefined,
          recipient: mockValidAddress,
          grants: [],
        },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBe(mockValidAddress);
      });
    });

    it("should reject invalid addresses", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: mockInvalidAddress,
        },
      });

      const mockIsAddress = isAddress as unknown as jest.Mock;
      mockIsAddress.mockReturnValue(false);

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBeUndefined();
        expect(result.current.missingPayouts).toContain("project-1");
      });
    });

    it("should handle missing payout address", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: undefined,
          recipient: undefined,
          grants: [],
        },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutAddresses["project-1"]).toBeUndefined();
        expect(result.current.missingPayouts).toContain("project-1");
      });
    });
  });

  describe("missing payouts tracking", () => {
    it("should track projects with missing payout addresses", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");

      gapIndexerApi.projectBySlug
        .mockResolvedValueOnce({
          data: { ...mockProjectResponse.data, payoutAddress: mockValidAddress },
        })
        .mockResolvedValueOnce({
          data: { ...mockProjectResponse.data, payoutAddress: undefined, recipient: undefined, grants: [] },
        });

      const { result } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      await waitFor(() => {
        expect(result.current.missingPayouts).toEqual(["project-2"]);
      });
    });

    it("should clear missing payouts when items change", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: { ...mockProjectResponse.data, payoutAddress: undefined, recipient: undefined, grants: [] },
      });

      const { result, rerender } = renderHook(
        ({ items }) => usePayoutAddressManager(items, undefined),
        { initialProps: { items: mockItems } }
      );

      await waitFor(() => {
        expect(result.current.missingPayouts.length).toBeGreaterThan(0);
      });

      // Update to valid addresses
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      // Create a new array reference to trigger the effect
      rerender({ items: [...mockItems] });

      await waitFor(() => {
        expect(result.current.missingPayouts).toHaveLength(0);
      });
    });
  });

  describe("payoutStatusByProject", () => {
    it("should provide status for each project", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      const { result } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutStatusByProject["project-1"]).toBeDefined();
        expect(result.current.payoutStatusByProject["project-1"].address).toBe(mockValidAddress);
        expect(result.current.payoutStatusByProject["project-1"].isLoading).toBe(false);
        expect(result.current.payoutStatusByProject["project-1"].isMissing).toBe(false);
      });
    });

    it("should mark status as loading during fetch", () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockProjectResponse), 1000))
      );

      const { result } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      expect(result.current.payoutStatusByProject["project-1"].isLoading).toBe(true);
    });

    it("should mark status as missing when payout address not found", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: { ...mockProjectResponse.data, payoutAddress: undefined, recipient: undefined, grants: [] },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.payoutStatusByProject["project-1"].isMissing).toBe(true);
      });
    });
  });

  describe("formatAddress", () => {
    it("should format valid address", () => {
      const { result } = renderHook(() =>
        usePayoutAddressManager([], undefined)
      );

      const formatted = result.current.formatAddress(mockValidAddress);

      expect(formatted).toBe("0x1234…7890");
    });

    it("should return 'Not configured' for undefined address", () => {
      const { result } = renderHook(() =>
        usePayoutAddressManager([], undefined)
      );

      const formatted = result.current.formatAddress(undefined);

      expect(formatted).toBe("Not configured");
    });

    it("should return 'Not configured' for empty string", () => {
      const { result } = renderHook(() =>
        usePayoutAddressManager([], undefined)
      );

      const formatted = result.current.formatAddress("");

      expect(formatted).toBe("Not configured");
    });
  });

  describe("cleanup", () => {
    it("should ignore results after unmount", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      gapIndexerApi.projectBySlug.mockReturnValue(promise);

      const { result, unmount } = renderHook(() =>
        usePayoutAddressManager(mockItems, undefined)
      );

      // Unmount before promise resolves
      unmount();

      // Resolve the promise after unmount
      resolvePromise!(mockProjectResponse);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have updated state (component unmounted)
      expect(result.current.payoutAddresses).toEqual({});
    });
  });

  describe("setMissingPayouts", () => {
    it("should expose setMissingPayouts function", () => {
      const { result } = renderHook(() =>
        usePayoutAddressManager([], undefined)
      );

      expect(typeof result.current.setMissingPayouts).toBe("function");
    });
  });

  describe("edge cases", () => {
    it("should handle items with special characters in slug", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      const specialItem = {
        uid: "project-special",
        slug: "project-with-special-chars-!@#$",
        title: "Special Project",
      };

      renderHook(() => usePayoutAddressManager([specialItem], undefined));

      await waitFor(() => {
        expect(gapIndexerApi.projectBySlug).toHaveBeenCalledWith(
          "project-with-special-chars-!@#$"
        );
      });
    });

    it("should handle empty payout address object", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: {},
        },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.missingPayouts).toContain("project-1");
      });
    });

    it("should handle payout address object with invalid values", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue({
        data: {
          ...mockProjectResponse.data,
          payoutAddress: {
            "community-1": null,
            "community-2": undefined,
            "community-3": "",
          },
        },
      });

      const { result } = renderHook(() =>
        usePayoutAddressManager([mockItems[0]], undefined)
      );

      await waitFor(() => {
        expect(result.current.missingPayouts).toContain("project-1");
      });
    });

    it("should handle concurrent item updates", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.projectBySlug.mockResolvedValue(mockProjectResponse);

      const { rerender } = renderHook(
        ({ items }) => usePayoutAddressManager(items, undefined),
        { initialProps: { items: [mockItems[0]] } }
      );

      // Quickly update items before first fetch completes
      rerender({ items: mockItems });
      rerender({ items: [mockItems[1]] });

      await waitFor(() => {
        expect(gapIndexerApi.projectBySlug).toHaveBeenCalled();
      });

      // Should not throw errors
    });
  });
});
