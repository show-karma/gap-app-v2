import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { donationsService } from "@/services/donations.service";
import { type DonationApiResponse, DonationStatus } from "../types";
import { useDonationPolling } from "../useDonationPolling";

jest.mock("@/services/donations.service");

const mockDonationsService = donationsService as jest.Mocked<typeof donationsService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const makeDonationResponse = (
  overrides: Partial<DonationApiResponse> = {}
): DonationApiResponse => ({
  uid: "donation-123",
  chainID: 8453,
  donorAddress: "0xdonor",
  projectUID: "project-456",
  payoutAddress: "0xpayout",
  amount: "99.50",
  tokenSymbol: "USDC",
  transactionHash: "0xabc123",
  donationType: "fiat" as any,
  fiatAmount: 100,
  fiatCurrency: "USD",
  status: DonationStatus.PENDING,
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("useDonationPolling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when donationUid is null (query disabled)", () => {
    it("returns donation: null, isPolling: false, status: null", () => {
      const { result } = renderHook(
        () => useDonationPolling({ donationUid: null, chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      expect(result.current.donation).toBeNull();
      expect(result.current.isPolling).toBe(false);
      expect(result.current.status).toBeNull();
    });

    it("does not call getDonationByUid", () => {
      renderHook(() => useDonationPolling({ donationUid: null, chainId: 8453 }), {
        wrapper: createWrapper(),
      });

      expect(mockDonationsService.getDonationByUid).not.toHaveBeenCalled();
    });

    it("returns error: null", () => {
      const { result } = renderHook(
        () => useDonationPolling({ donationUid: null, chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toBeNull();
    });
  });

  describe("when donationUid is provided", () => {
    it("calls getDonationByUid with correct params", async () => {
      const donation = makeDonationResponse();
      mockDonationsService.getDonationByUid.mockResolvedValueOnce(donation);

      renderHook(() => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockDonationsService.getDonationByUid).toHaveBeenCalledWith("donation-123", 8453);
      });
    });

    it("returns donation data and status when query succeeds", async () => {
      const donation = makeDonationResponse({ status: DonationStatus.PENDING });
      mockDonationsService.getDonationByUid.mockResolvedValueOnce(donation);

      const { result } = renderHook(
        () => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).toEqual(donation);
      });

      expect(result.current.status).toBe(DonationStatus.PENDING);
    });
  });

  describe("isPolling behavior", () => {
    it("is false when status is COMPLETED", async () => {
      const donation = makeDonationResponse({ status: DonationStatus.COMPLETED });
      mockDonationsService.getDonationByUid.mockResolvedValueOnce(donation);

      const { result } = renderHook(
        () => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).not.toBeNull();
      });

      expect(result.current.isPolling).toBe(false);
    });

    it("is false when status is FAILED", async () => {
      const donation = makeDonationResponse({ status: DonationStatus.FAILED });
      mockDonationsService.getDonationByUid.mockResolvedValueOnce(donation);

      const { result } = renderHook(
        () => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).not.toBeNull();
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("error state", () => {
    it("exposes error when the query fails", async () => {
      mockDonationsService.getDonationByUid.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(
        () => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.donation).toBeNull();
    });
  });

  describe("refetchInterval behavior", () => {
    it("does NOT refetch when status is COMPLETED (refetchInterval returns false)", async () => {
      const donation = makeDonationResponse({ status: DonationStatus.COMPLETED });
      mockDonationsService.getDonationByUid.mockResolvedValue(donation);

      const { result } = renderHook(
        () => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).not.toBeNull();
      });

      // After the initial fetch, clear mocks and wait to verify no more calls
      const callCount = mockDonationsService.getDonationByUid.mock.calls.length;

      // Wait enough time for a refetch to have happened if it were enabled
      await new Promise((r) => setTimeout(r, 100));

      // Should not have made additional calls
      expect(mockDonationsService.getDonationByUid.mock.calls.length).toBe(callCount);
    });

    it("does NOT refetch when status is FAILED (refetchInterval returns false)", async () => {
      const donation = makeDonationResponse({ status: DonationStatus.FAILED });
      mockDonationsService.getDonationByUid.mockResolvedValue(donation);

      const { result } = renderHook(
        () => useDonationPolling({ donationUid: "donation-123", chainId: 8453 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).not.toBeNull();
      });

      const callCount = mockDonationsService.getDonationByUid.mock.calls.length;

      await new Promise((r) => setTimeout(r, 100));

      expect(mockDonationsService.getDonationByUid.mock.calls.length).toBe(callCount);
    });
  });
});
