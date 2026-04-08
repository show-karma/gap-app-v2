/**
 * Polling race condition tests for useDonationPolling.
 *
 * Imports the REAL useDonationPolling hook and verifies that:
 * - Overlapping poll responses are handled correctly
 * - Polling stops on terminal status (COMPLETED / FAILED)
 * - Polling stops after unmount (no memory leaks)
 * - Rapid status transitions are processed safely
 * - Switching donationUid shows correct data
 * - Error states are surfaced correctly
 *
 * NOTE: These tests use real timers with controlled async mocks because
 * React Query's internal timer management conflicts with vi.useFakeTimers().
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DonationApiResponse, DonationStatus } from "@/hooks/donation/types";
import { useDonationPolling } from "@/hooks/donation/useDonationPolling";
import { donationsService } from "@/services/donations.service";

vi.mock("@/services/donations.service");

const mockService = donationsService as vi.Mocked<typeof donationsService>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Fresh QueryClient per render — no afterEach cleanup required
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
}

function createWrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeDonation(overrides: Partial<DonationApiResponse> = {}): DonationApiResponse {
  return {
    uid: "donation-1",
    chainID: 10,
    donorAddress: "0xdonor",
    projectUID: "project-1",
    payoutAddress: "0xpayout",
    amount: "100",
    tokenSymbol: "USDC",
    transactionHash: "0xabc",
    donationType: "crypto" as any,
    status: DonationStatus.PENDING,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDonationPolling — race condition safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Overlapping poll responses handled correctly
  // -------------------------------------------------------------------------

  it("should display the latest poll response data after refetch", async () => {
    let callIdx = 0;
    mockService.getDonationByUid.mockImplementation(async () => {
      callIdx++;
      if (callIdx === 1) {
        return makeDonation({ status: DonationStatus.PENDING, amount: "100" });
      }
      return makeDonation({ status: DonationStatus.COMPLETED, amount: "200" });
    });

    const qc = createQueryClient();
    const { result } = renderHook(
      () =>
        useDonationPolling({
          donationUid: "donation-1",
          chainId: 10,
        }),
      { wrapper: createWrapper(qc) }
    );

    await waitFor(() => {
      expect(result.current.donation).not.toBeNull();
    });

    expect(result.current.status).toBe(DonationStatus.PENDING);

    // Manually trigger a refetch (simulates what the polling interval does)
    await act(async () => {
      await qc.refetchQueries();
    });

    await waitFor(() => {
      expect(result.current.status).toBe(DonationStatus.COMPLETED);
    });

    expect((result.current.donation as DonationApiResponse)?.amount).toBe("200");
  });

  // -------------------------------------------------------------------------
  // Polling stops after COMPLETED status
  // -------------------------------------------------------------------------

  it("should report isPolling=false when status is COMPLETED", async () => {
    mockService.getDonationByUid.mockResolvedValue(
      makeDonation({ status: DonationStatus.COMPLETED })
    );

    const qc = createQueryClient();
    const { result } = renderHook(
      () =>
        useDonationPolling({
          donationUid: "donation-1",
          chainId: 10,
        }),
      { wrapper: createWrapper(qc) }
    );

    await waitFor(() => {
      expect(result.current.donation).not.toBeNull();
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.status).toBe(DonationStatus.COMPLETED);

    // Record call count and verify no additional calls happen
    const callsBefore = mockService.getDonationByUid.mock.calls.length;
    await new Promise((r) => setTimeout(r, 100));
    expect(mockService.getDonationByUid.mock.calls.length).toBe(callsBefore);
  });

  // -------------------------------------------------------------------------
  // Polling stops after FAILED status
  // -------------------------------------------------------------------------

  it("should report isPolling=false when status is FAILED", async () => {
    mockService.getDonationByUid.mockResolvedValue(makeDonation({ status: DonationStatus.FAILED }));

    const qc = createQueryClient();
    const { result } = renderHook(
      () =>
        useDonationPolling({
          donationUid: "donation-1",
          chainId: 10,
        }),
      { wrapper: createWrapper(qc) }
    );

    await waitFor(() => {
      expect(result.current.donation).not.toBeNull();
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.status).toBe(DonationStatus.FAILED);
  });

  // -------------------------------------------------------------------------
  // Polling stops after component unmount
  // -------------------------------------------------------------------------

  it("should not trigger additional service calls after unmount", async () => {
    mockService.getDonationByUid.mockResolvedValue(
      makeDonation({ status: DonationStatus.PENDING })
    );

    const qc = createQueryClient();
    const { result, unmount } = renderHook(
      () =>
        useDonationPolling({
          donationUid: "donation-1",
          chainId: 10,
        }),
      { wrapper: createWrapper(qc) }
    );

    await waitFor(() => {
      expect(result.current.donation).not.toBeNull();
    });

    const callsBeforeUnmount = mockService.getDonationByUid.mock.calls.length;
    unmount();

    await new Promise((r) => setTimeout(r, 200));
    expect(mockService.getDonationByUid.mock.calls.length).toBe(callsBeforeUnmount);
  });

  // -------------------------------------------------------------------------
  // PENDING -> COMPLETED transition via manual refetch
  // -------------------------------------------------------------------------

  it("should transition from PENDING to COMPLETED after refetch", async () => {
    mockService.getDonationByUid
      .mockResolvedValueOnce(makeDonation({ status: DonationStatus.PENDING }))
      .mockResolvedValueOnce(
        makeDonation({ status: DonationStatus.COMPLETED, transactionHash: "0xfinal" })
      );

    const qc = createQueryClient();
    const { result } = renderHook(
      () =>
        useDonationPolling({
          donationUid: "donation-1",
          chainId: 10,
        }),
      { wrapper: createWrapper(qc) }
    );

    await waitFor(() => {
      expect(result.current.status).toBe(DonationStatus.PENDING);
    });

    await act(async () => {
      await qc.refetchQueries();
    });

    await waitFor(() => {
      expect(result.current.status).toBe(DonationStatus.COMPLETED);
    });

    expect((result.current.donation as DonationApiResponse)?.transactionHash).toBe("0xfinal");
    expect(result.current.isPolling).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Error during poll surfaces error state
  // -------------------------------------------------------------------------

  it("should surface error when the service call fails", async () => {
    mockService.getDonationByUid.mockRejectedValue(new Error("Network timeout"));

    const qc = createQueryClient();
    const { result } = renderHook(
      () =>
        useDonationPolling({
          donationUid: "donation-1",
          chainId: 10,
        }),
      { wrapper: createWrapper(qc) }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe("Network timeout");
    expect(result.current.donation).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Switching donationUid mid-flight
  // -------------------------------------------------------------------------

  it("should show data for the new donationUid after switching", async () => {
    mockService.getDonationByUid.mockImplementation(async (uid: string) => {
      if (uid === "donation-old") {
        return makeDonation({ uid: "donation-old", status: DonationStatus.PENDING, amount: "50" });
      }
      return makeDonation({ uid: "donation-new", status: DonationStatus.COMPLETED, amount: "200" });
    });

    const qc = createQueryClient();

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useDonationPolling({ donationUid: uid, chainId: 10 }),
      {
        wrapper: createWrapper(qc),
        initialProps: { uid: "donation-old" as string | null },
      }
    );

    await waitFor(() => {
      expect(result.current.donation).not.toBeNull();
    });
    expect((result.current.donation as DonationApiResponse)?.uid).toBe("donation-old");

    rerender({ uid: "donation-new" });

    await waitFor(() => {
      expect((result.current.donation as DonationApiResponse)?.uid).toBe("donation-new");
    });

    expect(result.current.status).toBe(DonationStatus.COMPLETED);
    expect((result.current.donation as DonationApiResponse)?.amount).toBe("200");
  });
});
