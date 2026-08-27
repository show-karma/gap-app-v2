/**
 * @file Analytics tests for the two donation paths.
 *
 * The app has two, and the reports only separate them because `used_onramp`
 * says which was taken: a crypto batch through the cart, and a fiat onramp that
 * settles out of band and is only observed by a poll. The poll case is the
 * fragile one — a naive implementation reports a completion on every refetch.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DonationStatus } from "@/hooks/donation/types";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const donationsService = vi.hoisted(() => ({
  donationsService: {
    createOnrampSession: vi.fn(),
    getDonationStatus: vi.fn(),
    getDonationByUid: vi.fn(),
  },
}));
vi.mock("@/services/donations.service", () => donationsService);

vi.mock("wagmi", () => ({ useAccount: () => ({ address: "0xdonor" }) }));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useDonationPolling } from "@/hooks/donation/useDonationPolling";
import { useOnramp } from "@/hooks/donation/useOnramp";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const onrampParams = {
  projectUid: "proj-1",
  payoutAddress: "0xpayout",
  network: "optimism",
  targetAsset: "USDC",
};

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOnramp", () => {
  it("opens the funnel on the onramp path", async () => {
    donationsService.donationsService.createOnrampSession.mockResolvedValue({
      sessionToken: "st",
      donationUid: "don-1",
      pollingToken: "pt",
    });

    const { result } = renderHook(() => useOnramp(onrampParams), { wrapper });
    act(() => {
      result.current.initiateOnramp(50, "USD");
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(track).toHaveBeenCalledWith("donation_started", {
      project_count: 1,
      entry_point: "donation_onramp",
      used_onramp: true,
    });
  });

  it("reports a failed session with a stable code", async () => {
    donationsService.donationsService.createOnrampSession.mockRejectedValue(
      Object.assign(new Error("Bad request"), { response: { status: 400 } })
    );

    const { result } = renderHook(() => useOnramp(onrampParams), { wrapper });
    act(() => {
      result.current.initiateOnramp(50, "USD");
    });

    await waitFor(() => expect(eventNames()).toContain("donation_failed"));

    expect(track).toHaveBeenCalledWith("donation_failed", {
      project_count: 1,
      used_onramp: true,
      error_code: "http_400",
    });
  });

  it("never puts the donor's wallet on an event", async () => {
    donationsService.donationsService.createOnrampSession.mockResolvedValue({
      sessionToken: "st",
      donationUid: "don-1",
      pollingToken: "pt",
    });

    const { result } = renderHook(() => useOnramp(onrampParams), { wrapper });
    act(() => {
      result.current.initiateOnramp(50, "USD");
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("0x");
  });
});

describe("useDonationPolling", () => {
  const renderPolling = () =>
    renderHook(
      () => useDonationPolling({ donationUid: "don-1", chainId: 10, pollingToken: "pt" }),
      {
        wrapper,
      }
    );

  it("reports the settled donation once, not once per poll", async () => {
    donationsService.donationsService.getDonationStatus.mockResolvedValue({
      status: DonationStatus.COMPLETED,
    });

    const { rerender } = renderPolling();

    await waitFor(() => expect(track).toHaveBeenCalled());
    rerender();
    rerender();

    expect(vi.mocked(track).mock.calls.filter(([n]) => n === "donation_completed")).toHaveLength(1);
    expect(track).toHaveBeenCalledWith("donation_completed", {
      project_count: 1,
      currencies: [],
      chain_ids: [10],
      used_onramp: true,
    });
  });

  it("reports a settlement failure as a failed donation", async () => {
    donationsService.donationsService.getDonationStatus.mockResolvedValue({
      status: DonationStatus.FAILED,
    });

    renderPolling();

    await waitFor(() => expect(eventNames()).toContain("donation_failed"));

    expect(track).toHaveBeenCalledWith("donation_failed", {
      project_count: 1,
      used_onramp: true,
      error_code: "onramp_settlement_failed",
    });
  });

  it("stays silent while the donation is still in flight", async () => {
    donationsService.donationsService.getDonationStatus.mockResolvedValue({
      status: DonationStatus.PENDING,
    });

    renderPolling();

    await waitFor(() =>
      expect(donationsService.donationsService.getDonationStatus).toHaveBeenCalled()
    );

    expect(track).not.toHaveBeenCalled();
  });
});
