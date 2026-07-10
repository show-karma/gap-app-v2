/**
 * @file Tests for useAttestation — the shared attestation mutation spine
 * (issue #1821). Asserts it gates on the SIGNING identity (signerStatus), never
 * wagmi address; throws a typed SignerUnavailableError + Sentry breadcrumb when
 * the wallet isn't ready; and routes SignerUnavailableError to guidance while
 * sending every other error to errorManager.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAttestation } from "@/hooks/useAttestation";
import { SignerUnavailableError } from "@/utilities/wallet/signerReadiness";

const { mockSetup, mockErrorManager, mockAddBreadcrumb } = vi.hoisted(() => ({
  mockSetup: {
    signerStatus: "ready" as "ready" | "initializing" | "no-wallet",
    smartWalletAddress: "0xEMBEDDED" as string | null,
  },
  mockErrorManager: vi.fn(),
  mockAddBreadcrumb: vi.fn(),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    signerStatus: mockSetup.signerStatus,
    smartWalletAddress: mockSetup.smartWalletAddress,
    setupChainAndWallet: vi.fn(),
    isSmartWalletReady: false,
    hasEmbeddedWallet: true,
    hasExternalWallet: false,
  }),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: (...args: unknown[]) => mockErrorManager(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useAttestation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetup.signerStatus = "ready";
    mockSetup.smartWalletAddress = "0xEMBEDDED";
  });

  it("runs attest when signer is ready and calls onSuccess", async () => {
    const attest = vi.fn().mockResolvedValue("ok");
    const onSuccess = vi.fn();
    const showError = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError, onSuccess }),
      { wrapper }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    // React Query passes (data, variables, context) — assert the first two.
    expect(onSuccess.mock.calls[0][0]).toBe("ok");
    expect(onSuccess.mock.calls[0][1]).toBeUndefined();
    expect(attest).toHaveBeenCalledTimes(1);
    expect(showError).not.toHaveBeenCalled();
    expect(mockErrorManager).not.toHaveBeenCalled();
  });

  it("REGRESSION #1821: proceeds on signerStatus=ready even though wagmi address would be undefined (gates on signing identity)", async () => {
    // The hook never reads wagmi useAccount().address — only signerStatus. A
    // "ready" signer with an embedded smartWalletAddress must attest.
    mockSetup.signerStatus = "ready";
    mockSetup.smartWalletAddress = "0xEMBEDDED";
    const attest = vi.fn().mockResolvedValue("done");
    const showError = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError }),
      { wrapper }
    );

    expect(result.current.attestationAddress).toBe("0xEMBEDDED");
    result.current.mutate(undefined);

    await waitFor(() => expect(attest).toHaveBeenCalledTimes(1));
    expect(showError).not.toHaveBeenCalled();
  });

  it("throws SignerUnavailableError + breadcrumb and shows guidance when no-wallet (never a silent no-op)", async () => {
    mockSetup.signerStatus = "no-wallet";
    const attest = vi.fn();
    const showError = vi.fn();
    const onSignerUnavailable = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError, onSignerUnavailable }),
      { wrapper }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(showError).toHaveBeenCalled());
    expect(attest).not.toHaveBeenCalled();
    expect(mockErrorManager).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    expect(onSignerUnavailable).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeInstanceOf(SignerUnavailableError);
  });

  it("treats initializing signer as not-ready (guidance, no Sentry error)", async () => {
    mockSetup.signerStatus = "initializing";
    const attest = vi.fn();
    const showError = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError }),
      { wrapper }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(showError).toHaveBeenCalled());
    expect(attest).not.toHaveBeenCalled();
    expect(mockErrorManager).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it("routes a real (non-signer) attest error through errorManager", async () => {
    const attest = vi.fn().mockRejectedValue(new Error("chain exploded"));
    const showError = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError }),
      { wrapper }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(mockErrorManager).toHaveBeenCalledTimes(1));
    expect(showError).toHaveBeenCalledWith("Failed to create milestone");
  });

  it("does NOT show a 'Failed to …' toast when the user rejects the signature", async () => {
    // errorManager stays silent on user rejection; the central handler must too,
    // so a user who deliberately cancelled doesn't see a failure they caused.
    const attest = vi
      .fn()
      .mockRejectedValue(new Error("User rejected the request (ACTION_REJECTED)"));
    const showError = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError }),
      { wrapper }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(mockErrorManager).toHaveBeenCalled());
    // errorManager was still called (it decides Sentry), but no user toast fired.
    expect(showError).not.toHaveBeenCalled();
  });

  it("routes a SignerUnavailableError thrown inside attest to guidance, not errorManager", async () => {
    const attest = vi.fn().mockRejectedValue(new SignerUnavailableError("no-wallet-connected"));
    const showError = vi.fn();
    const { result } = renderHook(
      () => useAttestation({ attest, action: "create milestone", showError }),
      { wrapper }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(showError).toHaveBeenCalled());
    expect(mockErrorManager).not.toHaveBeenCalled();
  });
});
