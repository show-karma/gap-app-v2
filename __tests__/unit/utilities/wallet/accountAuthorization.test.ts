/**
 * @file Unit tests for EIP-1193 4100 ("not authorized") handling.
 *
 * Reproduces the project-update failure where MetaMask refused
 * `eth_sendTransaction` for the linked account (locked, or that account not
 * connected to the site) and ethers surfaced it as "could not coalesce error".
 */
import { describe, expect, it, vi } from "vitest";
import {
  ensureAccountAuthorized,
  isWalletUnauthorizedError,
  toWalletGuidanceError,
} from "@/utilities/wallet/accountAuthorization";
import { SignerUnavailableError } from "@/utilities/wallet/signerReadiness";

const ACCOUNT = "0x9b750f08b73d7441d4a0eff112648764613019a4";
const OTHER = "0x1111111111111111111111111111111111111111";

const metaMask4100 = () =>
  Object.assign(
    new Error("The requested account and/or method has not been authorized by the user."),
    { code: 4100 }
  );

/** The exact shape ethers v6 throws for the MetaMask 4100 in the bug report. */
const ethersCoalesced = () =>
  Object.assign(
    new Error(
      'could not coalesce error (error={ "code": 4100, "message": "The requested account and/or method has not been authorized by the user." }, code=UNKNOWN_ERROR, version=6.11.0)'
    ),
    { code: "UNKNOWN_ERROR", error: { code: 4100, message: "The requested account…" } }
  );

function provider(responses: Record<string, unknown | Error>) {
  return {
    request: vi.fn(async ({ method }: { method: string }) => {
      const response = responses[method];
      if (response instanceof Error) throw response;
      return response;
    }),
  };
}

describe("isWalletUnauthorizedError", () => {
  it("matches a raw EIP-1193 4100", () => {
    expect(isWalletUnauthorizedError(metaMask4100())).toBe(true);
  });

  it("matches the ethers 'could not coalesce' wrapper around a 4100", () => {
    expect(isWalletUnauthorizedError(ethersCoalesced())).toBe(true);
  });

  it("matches a 4100 nested under the SDK's originalError", () => {
    const sdkError = Object.assign(new Error("Error during attestation."), {
      originalError: ethersCoalesced(),
    });
    expect(isWalletUnauthorizedError(sdkError)).toBe(true);
  });

  it("matches the typed account-not-authorized error", () => {
    expect(
      isWalletUnauthorizedError(new SignerUnavailableError("account-not-authorized", ACCOUNT))
    ).toBe(true);
  });

  it.each([
    ["a user rejection", Object.assign(new Error("User rejected the request."), { code: 4001 })],
    [
      "a transient timeout",
      new Error('could not coalesce error (error={ "message": "Wallet timeout" })'),
    ],
    ["another signer state", new SignerUnavailableError("no-wallet-connected")],
    ["null", null],
  ])("does not match %s", (_label, error) => {
    expect(isWalletUnauthorizedError(error)).toBe(false);
  });
});

describe("ensureAccountAuthorized", () => {
  it("does not prompt when the account is already authorized (case-insensitive)", async () => {
    const p = provider({ eth_accounts: [ACCOUNT.toUpperCase().replace("0X", "0x")] });
    await expect(ensureAccountAuthorized(p, ACCOUNT)).resolves.toBeUndefined();
    expect(p.request).toHaveBeenCalledTimes(1);
    expect(p.request).toHaveBeenCalledWith({ method: "eth_accounts" });
  });

  it("prompts with eth_requestAccounts when the wallet is locked (no accounts)", async () => {
    const p = provider({ eth_accounts: [], eth_requestAccounts: [ACCOUNT] });
    await expect(ensureAccountAuthorized(p, ACCOUNT)).resolves.toBeUndefined();
    expect(p.request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
  });

  it("throws a typed, expected error naming the account when another account is connected", async () => {
    const p = provider({ eth_accounts: [OTHER], eth_requestAccounts: [OTHER] });
    const error = await ensureAccountAuthorized(p, ACCOUNT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SignerUnavailableError);
    expect((error as SignerUnavailableError).reason).toBe("account-not-authorized");
    expect((error as SignerUnavailableError).expected).toBe(true);
    expect((error as Error).message).toContain("0x9b75…19a4");
  });

  it("rethrows a user rejection of the connect prompt unchanged", async () => {
    const rejection = Object.assign(new Error("User rejected the request."), { code: 4001 });
    const p = provider({ eth_accounts: [], eth_requestAccounts: rejection });
    await expect(ensureAccountAuthorized(p, ACCOUNT)).rejects.toBe(rejection);
  });

  it("maps any other prompt failure to account-not-authorized", async () => {
    const pending = Object.assign(new Error("Request already pending"), { code: -32002 });
    const p = provider({ eth_accounts: [], eth_requestAccounts: pending });
    await expect(ensureAccountAuthorized(p, ACCOUNT)).rejects.toMatchObject({
      reason: "account-not-authorized",
    });
  });

  it("does not block a provider that cannot answer eth_accounts", async () => {
    const p = provider({ eth_accounts: new Error("method not supported") });
    await expect(ensureAccountAuthorized(p, ACCOUNT)).resolves.toBeUndefined();
    expect(p.request).toHaveBeenCalledTimes(1);
  });
});

describe("toWalletGuidanceError", () => {
  it("turns a send-time 4100 into account-not-authorized guidance", () => {
    const guidance = toWalletGuidanceError(ethersCoalesced(), ACCOUNT);
    expect(guidance?.reason).toBe("account-not-authorized");
    expect(guidance?.message).toContain("0x9b75…19a4");
  });

  it("passes a typed signer error through", () => {
    const typed = new SignerUnavailableError("wallets-hydrating");
    expect(toWalletGuidanceError(typed, ACCOUNT)).toBe(typed);
  });

  it("returns null for unrelated failures", () => {
    expect(toWalletGuidanceError(new Error("Validation failed"), ACCOUNT)).toBeNull();
  });
});
