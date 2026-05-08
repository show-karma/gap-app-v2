import { arbitrum, mainnet, optimism, sepolia } from "viem/chains";

// Mock viem to avoid real HTTP transports
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ mockClient: true })),
    http: vi.fn(() => "mock-transport"),
  };
});

import {
  type EthereumProvider,
  getChainByName,
  switchOrAddChain,
} from "@/src/features/claim-funds/lib/viem-clients";

// ── getChainByName ───────────────────────────────────────────────────────────

describe("getChainByName", () => {
  it("returns optimism chain for 'optimism'", () => {
    expect(getChainByName("optimism")).toBe(optimism);
  });

  it("returns arbitrum chain for 'arbitrum'", () => {
    expect(getChainByName("arbitrum")).toBe(arbitrum);
  });

  it("returns mainnet chain for 'mainnet'", () => {
    expect(getChainByName("mainnet")).toBe(mainnet);
  });

  it("returns sepolia chain for 'sepolia'", () => {
    expect(getChainByName("sepolia")).toBe(sepolia);
  });

  it("defaults to optimism for unknown chain name", () => {
    expect(getChainByName("polygon")).toBe(optimism);
  });

  it("defaults to optimism for empty string", () => {
    expect(getChainByName("")).toBe(optimism);
  });

  it("is case-sensitive (uppercase returns default)", () => {
    expect(getChainByName("Optimism")).toBe(optimism);
  });
});

// ── switchOrAddChain ─────────────────────────────────────────────────────────

describe("switchOrAddChain", () => {
  let provider: EthereumProvider;

  beforeEach(() => {
    provider = { request: vi.fn() };
  });

  it("calls wallet_switchEthereumChain with hex chainId", async () => {
    await switchOrAddChain(provider, optimism);
    expect(provider.request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${optimism.id.toString(16)}` }],
    });
  });

  it("resolves successfully when switch succeeds", async () => {
    await expect(switchOrAddChain(provider, optimism)).resolves.toBeUndefined();
  });

  it("adds chain when switch fails with 4902 (chain not added)", async () => {
    (provider.request as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce({ code: 4902 })
      .mockResolvedValueOnce(undefined);

    await switchOrAddChain(provider, optimism);

    expect(provider.request).toHaveBeenCalledTimes(2);
    const addCall = (provider.request as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(addCall[0].method).toBe("wallet_addEthereumChain");
  });

  it("passes chain details in wallet_addEthereumChain params", async () => {
    (provider.request as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce({ code: 4902 })
      .mockResolvedValueOnce(undefined);

    await switchOrAddChain(provider, optimism);

    const addCall = (provider.request as ReturnType<typeof vi.fn>).mock.calls[1];
    const addParams = addCall[0].params[0];
    expect(addParams.chainId).toBe(`0x${optimism.id.toString(16)}`);
    expect(addParams.chainName).toBe(optimism.name);
    expect(addParams.nativeCurrency).toBe(optimism.nativeCurrency);
  });

  it("re-throws non-4902 errors", async () => {
    const otherError = { code: 4001, message: "user rejected" };
    (provider.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(otherError);

    await expect(switchOrAddChain(provider, optimism)).rejects.toBe(otherError);
  });

  it("re-throws errors without a code property", async () => {
    const genericError = new Error("unexpected");
    (provider.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(genericError);

    await expect(switchOrAddChain(provider, optimism)).rejects.toBe(genericError);
  });

  it("formats chainId as hex correctly for different chains", async () => {
    await switchOrAddChain(provider, arbitrum);
    expect(provider.request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${arbitrum.id.toString(16)}` }],
    });
  });
});
