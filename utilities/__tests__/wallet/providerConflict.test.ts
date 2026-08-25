import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeProviderConflict,
  detectInjectedProviderConflict,
  isProviderConflictError,
  startInjectedProviderDiscovery,
} from "@/utilities/wallet/providerConflict";

/**
 * Fixtures below are the real production shapes from GAP-FRONTEND-23J, not
 * invented ones: the karma-gap-sdk wrapper, the ethers "could not coalesce"
 * wrapper, and Privy's code-less `ConnectorError`.
 */

/** karma-gap-sdk `AttestationError` — numeric code + `originalError`. */
function sdkWrapper(originalError: unknown) {
  const error = new Error("ATTEST_ERROR: Error during attestation.");
  Object.assign(error, { code: 50012, originalError });
  return error;
}

/** ethers v6 `could not coalesce error`, with the provider throw on `.error`. */
function ethersCoalesce(inner: unknown) {
  const error = new Error(
    'could not coalesce error (error={ "message": "Unknown connector error" }, payload={ "id": 5, "jsonrpc": "2.0", "method": "eth_sendTransaction" })'
  );
  Object.assign(error, { code: "UNKNOWN_ERROR", error: inner });
  return error;
}

describe("isProviderConflictError", () => {
  it("detects a bare RangeError", () => {
    expect(isProviderConflictError(new RangeError("Maximum call stack size exceeded"))).toBe(true);
  });

  it("detects a stack overflow by message when the prototype is lost across a bundle boundary", () => {
    expect(isProviderConflictError({ message: "Maximum call stack size exceeded" })).toBe(true);
  });

  it("detects a stack overflow by name alone", () => {
    expect(isProviderConflictError({ name: "RangeError", message: "" })).toBe(true);
  });

  it("walks the full production chain: sdk wrapper -> ethers -> RangeError", () => {
    const error = sdkWrapper(ethersCoalesce(new RangeError("Maximum call stack size exceeded")));
    expect(isProviderConflictError(error)).toBe(true);
  });

  it("walks a native `cause` chain", () => {
    const error = new Error("wrapped", {
      cause: new Error("deeper", { cause: new RangeError("Maximum call stack size exceeded") }),
    });
    expect(isProviderConflictError(error)).toBe(true);
  });

  it("does NOT match the same wrapper around a genuine wallet timeout", () => {
    const error = sdkWrapper(ethersCoalesce({ message: "Wallet timeout" }));
    expect(isProviderConflictError(error)).toBe(false);
  });

  it("does NOT match an ordinary attestation failure", () => {
    expect(isProviderConflictError(sdkWrapper(new Error("insufficient funds")))).toBe(false);
  });

  it("is safe on null, undefined and primitives", () => {
    expect(isProviderConflictError(null)).toBe(false);
    expect(isProviderConflictError(undefined)).toBe(false);
    expect(isProviderConflictError("boom")).toBe(false);
  });

  it("terminates on a self-referencing cause chain", () => {
    const error: { message: string; cause?: unknown } = { message: "loop" };
    error.cause = error;
    expect(isProviderConflictError(error)).toBe(false);
  });
});

describe("detectInjectedProviderConflict", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window as unknown as Record<string, unknown>, "ethereum");
  });

  it("returns null when no wallet is present", () => {
    expect(detectInjectedProviderConflict()).toBeNull();
  });

  it("returns null for a single injected provider", () => {
    (window as unknown as Record<string, unknown>).ethereum = { isMetaMask: true };
    expect(detectInjectedProviderConflict()).toBeNull();
  });

  it("names the wallets when several race for window.ethereum", () => {
    (window as unknown as Record<string, unknown>).ethereum = {
      providers: [{ isMetaMask: true }, { isBackpack: true }, { isLeap: true }],
    };

    const conflict = detectInjectedProviderConflict();

    expect(conflict).not.toBeNull();
    expect(conflict?.count).toBe(3);
    expect(conflict?.names).toEqual(["Backpack", "Leap", "MetaMask"]);
  });

  it("labels providers it cannot identify rather than dropping them", () => {
    (window as unknown as Record<string, unknown>).ethereum = {
      providers: [{ isMetaMask: true }, { someUnknownWallet: true }],
    };

    expect(detectInjectedProviderConflict()?.names).toContain("an unidentified wallet extension");
  });

  it("returns null instead of throwing when window.ethereum is a throwing getter", () => {
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      get() {
        throw new Error("blocked by extension");
      },
    });

    expect(detectInjectedProviderConflict()).toBeNull();
  });

  it("collects EIP-6963 announcements", () => {
    startInjectedProviderDiscovery();

    window.dispatchEvent(
      Object.assign(new Event("eip6963:announceProvider"), {
        detail: { info: { uuid: "uuid-leap", name: "Leap" } },
      })
    );
    window.dispatchEvent(
      Object.assign(new Event("eip6963:announceProvider"), {
        detail: { info: { uuid: "uuid-backpack", name: "Backpack" } },
      })
    );

    const conflict = detectInjectedProviderConflict();
    expect(conflict?.names).toEqual(expect.arrayContaining(["Backpack", "Leap"]));
  });
});

describe("describeProviderConflict", () => {
  it("names the extensions when they are known", () => {
    const message = describeProviderConflict({ count: 2, names: ["Backpack", "Leap"] });
    expect(message).toContain("Backpack, Leap");
    expect(message).toContain("Nothing was submitted");
    expect(message).toContain("WalletConnect");
  });

  it("still tells the user nothing was submitted when the wallets are unknown", () => {
    const message = describeProviderConflict(null);
    expect(message).toContain("Nothing was submitted");
    expect(message).toContain("WalletConnect");
  });

  it("never advises retrying, which cannot work for a deterministic conflict", () => {
    for (const conflict of [null, { count: 2, names: ["Leap", "MetaMask"] }]) {
      expect(describeProviderConflict(conflict).toLowerCase()).not.toContain("try again");
    }
  });
});
