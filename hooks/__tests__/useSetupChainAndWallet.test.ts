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
    vi.resetAllMocks();

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

    let setupResult!: Awaited<ReturnType<typeof result.current.setupChainAndWallet>>;
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
    expect(mockGetAttestationSigner).toHaveBeenCalledTimes(1);
  });

  it("retries once and succeeds when only the first signer attempt hits a network-changed error", async () => {
    const walletSigner = { signMessage: vi.fn() };
    mockGetAttestationSigner
      .mockRejectedValueOnce(
        Object.assign(
          new Error('network changed: 1 => 11155420 (event="changed", code=NETWORK_ERROR)'),
          { code: "NETWORK_ERROR" }
        )
      )
      .mockResolvedValueOnce(walletSigner);

    const { result } = renderHook(() => useSetupChainAndWallet());

    let setupResult!: Awaited<ReturnType<typeof result.current.setupChainAndWallet>>;
    await act(async () => {
      setupResult = await result.current.setupChainAndWallet({
        targetChainId: 11155420,
        currentChainId: 1,
        switchChainAsync: vi.fn(),
      });
    });

    expect(mockGetAttestationSigner).toHaveBeenCalledTimes(2);
    expect(setupResult).toEqual({
      gapClient: { id: "gap-client" },
      walletSigner,
      chainId: 11155420,
      isGasless: false,
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("returns null and shows a toast when both signer attempts hit a network-changed error", async () => {
    mockGetAttestationSigner.mockRejectedValue(
      Object.assign(
        new Error('network changed: 1 => 11155420 (event="changed", code=NETWORK_ERROR)'),
        { code: "NETWORK_ERROR" }
      )
    );

    const { result } = renderHook(() => useSetupChainAndWallet());

    let setupResult!: Awaited<ReturnType<typeof result.current.setupChainAndWallet>>;
    await act(async () => {
      setupResult = await result.current.setupChainAndWallet({
        targetChainId: 11155420,
        currentChainId: 1,
        switchChainAsync: vi.fn(),
      });
    });

    expect(mockGetAttestationSigner).toHaveBeenCalledTimes(2);
    expect(setupResult).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      "Wallet network changed while preparing the transaction. Please try again."
    );
  });

  it("re-throws non-network signer errors so they surface to Sentry instead of being swallowed", async () => {
    const fatalError = new Error("Unsupported chain: 9999");
    mockGetAttestationSigner.mockRejectedValue(fatalError);

    const { result } = renderHook(() => useSetupChainAndWallet());

    await expect(
      result.current.setupChainAndWallet({
        targetChainId: 9999,
        currentChainId: 1,
        switchChainAsync: vi.fn(),
      })
    ).rejects.toThrow("Unsupported chain: 9999");

    expect(mockGetAttestationSigner).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
