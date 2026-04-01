/**
 * @file Tests for useGrantInvoiceRequired hook
 * @description Tests grantee invoice requirement check with proper query lifecycle
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/features/payout-disbursement/services/payout-disbursement.service", () => ({
  checkGrantInvoiceRequired: vi.fn(),
}));

import { checkGrantInvoiceRequired } from "@/features/payout-disbursement/services/payout-disbursement.service";
import { useGrantInvoiceRequired } from "@/features/payout-disbursement/hooks/use-payout-disbursement";

const mockCheckGrantInvoiceRequired = checkGrantInvoiceRequired as ReturnType<typeof vi.fn>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe("useGrantInvoiceRequired", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("when grantUID is provided", () => {
    it("should fetch and return invoice requirement data", async () => {
      const response = { invoiceRequired: true, invoiceStatus: "pending", invoiceFileKey: null };
      mockCheckGrantInvoiceRequired.mockResolvedValueOnce(response);

      const { result } = renderHook(() => useGrantInvoiceRequired("grant-1"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(response);
      expect(mockCheckGrantInvoiceRequired).toHaveBeenCalledWith("grant-1");
    });

    it("should return invoiceRequired false when grant has no requirement", async () => {
      mockCheckGrantInvoiceRequired.mockResolvedValueOnce({ invoiceRequired: false });

      const { result } = renderHook(() => useGrantInvoiceRequired("grant-2"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.invoiceRequired).toBe(false);
    });

    it("should handle API errors", async () => {
      mockCheckGrantInvoiceRequired.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useGrantInvoiceRequired("grant-1"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Network error");
    });
  });

  describe("when grantUID is undefined", () => {
    it("should not call the API", async () => {
      const { result } = renderHook(() => useGrantInvoiceRequired(undefined), {
        wrapper: createWrapper(queryClient),
      });

      // Query should stay idle/not fetching since enabled is false
      expect(result.current.isFetching).toBe(false);
      expect(mockCheckGrantInvoiceRequired).not.toHaveBeenCalled();
    });
  });

  describe("when explicitly disabled", () => {
    it("should not call the API even with a valid grantUID", async () => {
      const { result } = renderHook(
        () => useGrantInvoiceRequired("grant-1", { enabled: false }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      expect(result.current.isFetching).toBe(false);
      expect(mockCheckGrantInvoiceRequired).not.toHaveBeenCalled();
    });
  });
});
