import { act, renderHook } from "@testing-library/react";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSetupChainAndWallet } from "../useSetupChainAndWallet";

const mockEnsureCorrectChain = vi.fn();
vi.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: (...args: unknown[]) => mockEnsureCorrectChain(...args),
}));

const mockGetAttestationSigner = vi.fn();
vi.mock("../useZeroDevSigner", () => ({
  useZeroDevSigner: () => ({
    getAttestationSigner: mockGetAttestationSigner,
    isGaslessAvailable: false,
    attestationAddress: "0xabc",
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  }),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: vi.fn(),
  },
}));

describe("useSetupChainAndWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mockEnsureCorrectChain.mockResolvedValue({
      success: true,
      chainId: 11155420,
      gapClient: { id: "gap-client" },
    });
  });

  it("returns signer setup details when chain and signer setup succeed", async () => {
    const walletSigner = { signMessage: vi.fn() };
    mockGetAttestationSigner.mockResolvedValue(walletSigner);

    const { result } = renderHook(() => useSetupChainAndWallet());

    let setupResult: Awaited<ReturnType<typeof result.current.setupChainAndWallet>>;
    await act(async () => {
      setupResult = await result.current.setupChainAndWallet({
        targetChainId: 11155420,
        currentChainId: 1,
        switchChainAsync: vi.fn(),
      });
    });

    expect(setupResult).toEqual({
      gapClient: { id: "gap-client" },
      walletSigner,
      chainId: 11155420,
      isGasless: false,
    });
  });

  it("returns null and shows a toast when signer setup hits a network-changed wallet error", async () => {
    mockGetAttestationSigner.mockRejectedValue(
      Object.assign(new Error('network changed: 1 => 11155420 (event="changed", code=NETWORK_ERROR)'), {
        code: "NETWORK_ERROR",
      })
    );

    const { result } = renderHook(() => useSetupChainAndWallet());

    let setupResult: Awaited<ReturnType<typeof result.current.setupChainAndWallet>>;
    await act(async () => {
      setupResult = await result.current.setupChainAndWallet({
        targetChainId: 11155420,
        currentChainId: 1,
        switchChainAsync: vi.fn(),
      });
    });

    expect(setupResult).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      "Wallet network changed while preparing the transaction. Please try again."
    );
  });
});
