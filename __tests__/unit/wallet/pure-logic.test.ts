/**
 * Pure logic trust tests for wallet transaction utilities.
 *
 * Tests pure utility functions with ZERO external dependencies:
 * - parseDonationError: Web3 error → user-friendly messages
 * - isRecoverableError: classifies retryable vs fatal errors
 * - getShortErrorMessage: one-liner error messages
 * - validateChainSync: wallet/chain validation
 * - chainSyncValidation edge cases
 * - isWalletClientGoodEnough: wallet readiness checks
 * - Token config helpers: getNativeTokenSymbol, hasUSDC, getTokenDecimals, isTestnet
 */

import { describe, expect, it } from "vitest";
import {
  getNativeTokenSymbol,
  getTokenDecimals,
  hasUSDC,
  isTestnet,
  NATIVE_TOKENS,
  NETWORKS,
  TOKEN_ADDRESSES,
} from "@/config/tokens";
import { validateChainSync } from "@/utilities/chainSyncValidation";
import {
  DonationErrorCode,
  getDetailedErrorInfo,
  getShortErrorMessage,
  isRecoverableError,
  parseDonationError,
} from "@/utilities/donations/errorMessages";
import { isWalletClientGoodEnough } from "@/utilities/walletClientFallback";

// ---------------------------------------------------------------------------
// parseDonationError — error pattern matching
// ---------------------------------------------------------------------------
describe("parseDonationError", () => {
  describe("user rejection patterns", () => {
    it.each([
      "user rejected the request",
      "User denied transaction signature",
      "user cancelled the operation",
      "rejected by user",
    ])('recognises "%s" as USER_REJECTED', (msg) => {
      const result = parseDonationError(new Error(msg));
      expect(result.code).toBe(DonationErrorCode.USER_REJECTED);
      expect(result.message).toBe("Transaction cancelled by user");
    });

    it("provides actionable steps for user rejection", () => {
      const result = parseDonationError(new Error("user rejected"));
      expect(result.actionableSteps.length).toBeGreaterThan(0);
    });
  });

  describe("insufficient gas patterns", () => {
    it.each([
      "insufficient funds for gas",
      "insufficient funds for intrinsic transaction cost",
      "out of gas",
    ])('recognises "%s" as INSUFFICIENT_GAS', (msg) => {
      const result = parseDonationError(new Error(msg));
      expect(result.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
    });

    it("preserves technical message for gas errors", () => {
      const err = new Error("insufficient funds for gas * price + value");
      const result = parseDonationError(err);
      expect(result.technicalMessage).toBe(err.message);
    });
  });

  describe("insufficient balance patterns", () => {
    it.each(["insufficient balance", "insufficient funds for transfer", "exceeds balance"])(
      'recognises "%s" as INSUFFICIENT_BALANCE',
      (msg) => {
        const result = parseDonationError(new Error(msg));
        expect(result.code).toBe(DonationErrorCode.INSUFFICIENT_BALANCE);
      }
    );
  });

  describe("network mismatch patterns", () => {
    it.each([
      "chain mismatch detected",
      "wrong network selected",
      "switch network required",
      "network switch failed",
    ])('recognises "%s" as NETWORK_MISMATCH', (msg) => {
      const result = parseDonationError(new Error(msg));
      expect(result.code).toBe(DonationErrorCode.NETWORK_MISMATCH);
    });
  });

  describe("contract revert patterns", () => {
    it.each([
      "execution reverted",
      "transaction reverted without a reason",
      "contract error: invalid call",
    ])('recognises "%s" as CONTRACT_ERROR', (msg) => {
      const result = parseDonationError(new Error(msg));
      expect(result.code).toBe(DonationErrorCode.CONTRACT_ERROR);
    });

    it("extracts revert reason when present", () => {
      const result = parseDonationError(
        new Error("execution reverted\nreason: insufficientallowance\nmore data")
      );
      expect(result.message).toContain("insufficientallowance");
    });
  });

  describe("approval / allowance patterns", () => {
    it.each(["token approval failed", "insufficient allowance"])(
      'recognises "%s" as APPROVAL_ERROR',
      (msg) => {
        const result = parseDonationError(new Error(msg));
        expect(result.code).toBe(DonationErrorCode.APPROVAL_ERROR);
      }
    );
  });

  describe("permit / signature patterns", () => {
    it.each(["permit validation failed", "signature invalid", "sign typed data error"])(
      'recognises "%s" as PERMIT_SIGNATURE_ERROR',
      (msg) => {
        const result = parseDonationError(new Error(msg));
        expect(result.code).toBe(DonationErrorCode.PERMIT_SIGNATURE_ERROR);
      }
    );
  });

  describe("chain sync patterns", () => {
    it.each(["chain sync timeout", "wallet client unavailable", "failed to sync to chain"])(
      'recognises "%s" as CHAIN_SYNC_ERROR',
      (msg) => {
        const result = parseDonationError(new Error(msg));
        expect(result.code).toBe(DonationErrorCode.CHAIN_SYNC_ERROR);
      }
    );
  });

  describe("timeout patterns", () => {
    it.each(["transaction timeout", "request timed out"])(
      'recognises "%s" as TRANSACTION_TIMEOUT',
      (msg) => {
        const result = parseDonationError(new Error(msg));
        expect(result.code).toBe(DonationErrorCode.TRANSACTION_TIMEOUT);
      }
    );
  });

  describe("balance fetch patterns", () => {
    it("recognises balance fetch failure", () => {
      const result = parseDonationError(new Error("balance fetch failed"));
      expect(result.code).toBe(DonationErrorCode.BALANCE_FETCH_ERROR);
    });
  });

  describe("payout address patterns", () => {
    it.each(["missing payout address", "invalid recipient address"])(
      'recognises "%s" as PAYOUT_ADDRESS_ERROR',
      (msg) => {
        const result = parseDonationError(new Error(msg));
        expect(result.code).toBe(DonationErrorCode.PAYOUT_ADDRESS_ERROR);
      }
    );
  });

  describe("edge cases", () => {
    it("handles non-Error objects (string)", () => {
      const result = parseDonationError("plain string error");
      expect(result.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
      expect(result.technicalMessage).toBe("plain string error");
    });

    it("handles null/undefined gracefully", () => {
      const result = parseDonationError(undefined);
      expect(result.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    });

    it("handles number input", () => {
      const result = parseDonationError(42);
      expect(result.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    });

    it("unknown error includes actionable steps", () => {
      const result = parseDonationError(new Error("something completely new"));
      expect(result.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
      expect(result.actionableSteps.length).toBeGreaterThan(0);
    });

    it("case insensitive matching", () => {
      const result = parseDonationError(new Error("USER REJECTED the request"));
      expect(result.code).toBe(DonationErrorCode.USER_REJECTED);
    });
  });
});

// ---------------------------------------------------------------------------
// isRecoverableError
// ---------------------------------------------------------------------------
describe("isRecoverableError", () => {
  it("user rejection is recoverable", () => {
    expect(isRecoverableError(new Error("user rejected"))).toBe(true);
  });

  it("network mismatch is recoverable", () => {
    expect(isRecoverableError(new Error("wrong network"))).toBe(true);
  });

  it("chain sync is recoverable", () => {
    expect(isRecoverableError(new Error("chain sync failed"))).toBe(true);
  });

  it("wallet client is recoverable", () => {
    expect(isRecoverableError(new Error("wallet client not ready"))).toBe(true);
  });

  it("timeout is recoverable", () => {
    expect(isRecoverableError(new Error("timed out waiting"))).toBe(true);
  });

  it("balance fetch is recoverable", () => {
    expect(isRecoverableError(new Error("balance fetch error"))).toBe(true);
  });

  it("contract error is NOT recoverable", () => {
    expect(isRecoverableError(new Error("execution reverted"))).toBe(false);
  });

  it("insufficient balance is NOT recoverable", () => {
    expect(isRecoverableError(new Error("insufficient balance"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getShortErrorMessage & getDetailedErrorInfo
// ---------------------------------------------------------------------------
describe("getShortErrorMessage", () => {
  it("returns the parsed message string", () => {
    expect(getShortErrorMessage(new Error("user rejected"))).toBe("Transaction cancelled by user");
  });

  it("returns generic message for unknown errors", () => {
    expect(getShortErrorMessage(new Error("xyz"))).toBe("An unexpected error occurred");
  });
});

describe("getDetailedErrorInfo", () => {
  it("returns full parsed error with actionableSteps", () => {
    const info = getDetailedErrorInfo(new Error("timeout"));
    expect(info).toHaveProperty("code");
    expect(info).toHaveProperty("message");
    expect(info).toHaveProperty("actionableSteps");
    expect(info.code).toBe(DonationErrorCode.TRANSACTION_TIMEOUT);
  });
});

// ---------------------------------------------------------------------------
// validateChainSync — pure validation, no network calls
// ---------------------------------------------------------------------------
describe("validateChainSync", () => {
  it("throws when walletClient is null", async () => {
    await expect(validateChainSync(null, 10)).rejects.toThrow(/wallet client is not available/i);
  });

  it("throws when walletClient is undefined", async () => {
    await expect(validateChainSync(undefined, 10)).rejects.toThrow(
      /wallet client is not available/i
    );
  });

  it("throws when account is missing", async () => {
    const client = { chain: { id: 10 } } as any;
    await expect(validateChainSync(client, 10)).rejects.toThrow(/no account connected/i);
  });

  it("throws when chain is missing", async () => {
    const client = { account: { address: "0x1" } } as any;
    await expect(validateChainSync(client, 10)).rejects.toThrow(/no chain information/i);
  });

  it("throws on chain mismatch", async () => {
    const client = {
      account: { address: "0x1" },
      chain: { id: 1 },
    } as any;
    await expect(validateChainSync(client, 10)).rejects.toThrow(/chain mismatch/i);
  });

  it("includes operation name in error", async () => {
    await expect(validateChainSync(null, 10, "batch donations")).rejects.toThrow(/batch donations/);
  });

  it("resolves when chain matches", async () => {
    const client = {
      account: { address: "0x1" },
      chain: { id: 10 },
    } as any;
    await expect(validateChainSync(client, 10)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isWalletClientGoodEnough
// ---------------------------------------------------------------------------
describe("isWalletClientGoodEnough", () => {
  it("returns false for null", () => {
    expect(isWalletClientGoodEnough(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isWalletClientGoodEnough(undefined)).toBe(false);
  });

  it("returns false when account is missing", () => {
    expect(isWalletClientGoodEnough({ chain: { id: 10 } } as any)).toBe(false);
  });

  it("returns true when account exists and no chain check", () => {
    expect(isWalletClientGoodEnough({ account: { address: "0x1" } } as any)).toBe(true);
  });

  it("returns false on chain mismatch", () => {
    expect(
      isWalletClientGoodEnough({ account: { address: "0x1" }, chain: { id: 1 } } as any, 10)
    ).toBe(false);
  });

  it("returns true on chain match", () => {
    expect(
      isWalletClientGoodEnough({ account: { address: "0x1" }, chain: { id: 10 } } as any, 10)
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Token config helpers
// ---------------------------------------------------------------------------
describe("getNativeTokenSymbol", () => {
  it("returns ETH for mainnet", () => {
    expect(getNativeTokenSymbol(1)).toBe("ETH");
  });

  it("returns ETH for optimism", () => {
    expect(getNativeTokenSymbol(10)).toBe("ETH");
  });

  it("returns POL for polygon", () => {
    expect(getNativeTokenSymbol(137)).toBe("POL");
  });

  it("returns CELO for celo", () => {
    expect(getNativeTokenSymbol(42220)).toBe("CELO");
  });

  it("returns ETH for unknown chain", () => {
    expect(getNativeTokenSymbol(99999)).toBe("ETH");
  });
});

describe("hasUSDC", () => {
  it("returns true for mainnet", () => {
    expect(hasUSDC(1)).toBe(true);
  });

  it("returns true for optimism", () => {
    expect(hasUSDC(10)).toBe(true);
  });

  it("returns false for unknown chain", () => {
    expect(hasUSDC(99999)).toBe(false);
  });
});

describe("getTokenDecimals", () => {
  it("returns 18 for native token (null address)", () => {
    expect(getTokenDecimals(null)).toBe(18);
  });

  it("returns chain-specific decimals for native token", () => {
    expect(getTokenDecimals(null, 1)).toBe(18);
  });

  it("returns 6 for known USDC addresses", () => {
    expect(getTokenDecimals(TOKEN_ADDRESSES.usdc[1])).toBe(6);
  });

  it("USDC match is case-insensitive", () => {
    expect(getTokenDecimals(TOKEN_ADDRESSES.usdc[10].toLowerCase())).toBe(6);
  });

  it("returns 18 for unknown token addresses", () => {
    expect(getTokenDecimals("0x0000000000000000000000000000000000000001")).toBe(18);
  });
});

describe("isTestnet", () => {
  it("returns false for mainnet", () => {
    expect(isTestnet(1)).toBe(false);
  });

  it("returns false for optimism", () => {
    expect(isTestnet(10)).toBe(false);
  });

  it("returns true for sepolia", () => {
    expect(isTestnet(11155111)).toBe(true);
  });

  it("returns true for OP sepolia", () => {
    expect(isTestnet(11155420)).toBe(true);
  });

  it("returns false for unknown chain", () => {
    expect(isTestnet(99999)).toBe(false);
  });
});

describe("NETWORKS config consistency", () => {
  it("every NETWORK entry has a matching NATIVE_TOKENS entry", () => {
    for (const chainId of Object.keys(NETWORKS)) {
      expect(NATIVE_TOKENS[Number(chainId)]).toBeDefined();
    }
  });

  it("all NETWORK entries have required fields", () => {
    for (const net of Object.values(NETWORKS)) {
      expect(net).toHaveProperty("name");
      expect(net).toHaveProperty("chainId");
      expect(net).toHaveProperty("shortName");
      expect(net).toHaveProperty("rpcUrl");
      expect(net).toHaveProperty("blockExplorer");
    }
  });
});
