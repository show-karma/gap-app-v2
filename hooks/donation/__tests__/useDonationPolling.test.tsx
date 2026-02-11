import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { donationsService } from "@/services/donations.service";
import { type DonationApiResponse, DonationStatus, type DonationStatusApiResponse } from "../types";
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

      const callCount = mockDonationsService.getDonationByUid.mock.calls.length;

      // Advance past the 5s polling interval to verify no refetch occurs
      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

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

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      expect(mockDonationsService.getDonationByUid.mock.calls.length).toBe(callCount);
    });
  });

  describe("pollingToken path (anonymous polling)", () => {
    const makeStatusResponse = (
      overrides: Partial<DonationStatusApiResponse> = {}
    ): DonationStatusApiResponse => ({
      status: DonationStatus.PENDING,
      amount: "50.00",
      tokenSymbol: "USDC",
      fiatAmount: 50,
      fiatCurrency: "USD",
      ...overrides,
    });

    it("calls getDonationStatus instead of getDonationByUid when pollingToken is provided", async () => {
      const statusResponse = makeStatusResponse();
      mockDonationsService.getDonationStatus.mockResolvedValueOnce(statusResponse);

      renderHook(
        () =>
          useDonationPolling({
            donationUid: "donation-123",
            chainId: 8453,
            pollingToken: "token-abc",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockDonationsService.getDonationStatus).toHaveBeenCalledWith(
          "donation-123",
          8453,
          "token-abc"
        );
      });

      expect(mockDonationsService.getDonationByUid).not.toHaveBeenCalled();
    });

    it("returns status data from getDonationStatus", async () => {
      const statusResponse = makeStatusResponse({
        status: DonationStatus.COMPLETED,
        transactionHash: "0xabc",
      });
      mockDonationsService.getDonationStatus.mockResolvedValueOnce(statusResponse);

      const { result } = renderHook(
        () =>
          useDonationPolling({
            donationUid: "donation-123",
            chainId: 8453,
            pollingToken: "token-abc",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).toEqual(statusResponse);
      });

      expect(result.current.status).toBe(DonationStatus.COMPLETED);
      expect(result.current.isPolling).toBe(false);
    });

    it("does not call getDonationStatus when donationUid is null even with pollingToken", () => {
      renderHook(
        () =>
          useDonationPolling({
            donationUid: null,
            chainId: 8453,
            pollingToken: "token-abc",
          }),
        { wrapper: createWrapper() }
      );

      expect(mockDonationsService.getDonationStatus).not.toHaveBeenCalled();
      expect(mockDonationsService.getDonationByUid).not.toHaveBeenCalled();
    });

    it("exposes error when getDonationStatus fails", async () => {
      mockDonationsService.getDonationStatus.mockRejectedValueOnce(new Error("Forbidden"));

      const { result } = renderHook(
        () =>
          useDonationPolling({
            donationUid: "donation-123",
            chainId: 8453,
            pollingToken: "bad-token",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Forbidden");
      expect(result.current.donation).toBeNull();
    });

    it("stops polling when status is completed", async () => {
      const statusResponse = makeStatusResponse({ status: DonationStatus.COMPLETED });
      mockDonationsService.getDonationStatus.mockResolvedValue(statusResponse);

      const { result } = renderHook(
        () =>
          useDonationPolling({
            donationUid: "donation-123",
            chainId: 8453,
            pollingToken: "token-abc",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.donation).not.toBeNull();
      });

      const callCount = mockDonationsService.getDonationStatus.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(6000);
      });
      expect(mockDonationsService.getDonationStatus.mock.calls.length).toBe(callCount);
    });
  });
});
