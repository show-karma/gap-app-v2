/**
 * @file Trust tests for compareAllWallets
 * @description Tests wallet identity matching: standard wallets, smart wallets,
 * Farcaster, cross-app, edge cases.
 */

jest.unmock("@/utilities/auth/compare-all-wallets");

import type { User } from "@privy-io/react-auth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";

// ---------------------------------------------------------------------------
// Helpers — all addresses are valid 20-byte (40 hex char) Ethereum addresses
// ---------------------------------------------------------------------------
const ADDR_A = "0x1234567890abcdef1234567890abcdef12345678";
const ADDR_B = "0xabcdef1234567890abcdef1234567890abcdef12";
const ADDR_C = "0x2222222222222222222222222222222222222222";
const ADDR_SMART = "0x3333333333333333333333333333333333333333";
const ADDR_FARCASTER = "0x4444444444444444444444444444444444444444";
const ADDR_EMBEDDED = "0x5555555555555555555555555555555555555555";
const ADDR_CROSS_SMART = "0x6666666666666666666666666666666666666666";
const ADDR_CHECKSUMMED = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
const ADDR_UNMATCHED = "0x9999999999999999999999999999999999999999";

function createUser(linkedAccounts: any[]): User {
  return { id: "test-user", linkedAccounts } as unknown as User;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("compareAllWallets — Standard wallets", () => {
  it("matches a standard wallet address", () => {
    const user = createUser([{ type: "wallet", address: ADDR_A }]);
    expect(compareAllWallets(user, ADDR_A)).toBe(true);
  });

  it("matches case-insensitively", () => {
    const user = createUser([{ type: "wallet", address: ADDR_B.toUpperCase() }]);
    expect(compareAllWallets(user, ADDR_B.toLowerCase())).toBe(true);
  });

  it("does NOT match when address differs", () => {
    const user = createUser([{ type: "wallet", address: ADDR_A }]);
    expect(compareAllWallets(user, ADDR_C)).toBe(false);
  });
});

describe("compareAllWallets — Smart wallets", () => {
  it("matches a smart_wallet account", () => {
    const user = createUser([{ type: "smart_wallet", address: ADDR_SMART }]);
    expect(compareAllWallets(user, ADDR_SMART)).toBe(true);
  });
});

describe("compareAllWallets — Farcaster", () => {
  it("matches ownerAddress from Farcaster account", () => {
    const user = createUser([{ type: "farcaster", fid: 12345, ownerAddress: ADDR_FARCASTER }]);
    expect(compareAllWallets(user, ADDR_FARCASTER)).toBe(true);
  });

  it("does NOT match Farcaster account without ownerAddress", () => {
    const user = createUser([{ type: "farcaster", fid: 12345 }]);
    expect(compareAllWallets(user, ADDR_UNMATCHED)).toBe(false);
  });

  it("does NOT match Farcaster with invalid (non-address) ownerAddress", () => {
    const user = createUser([{ type: "farcaster", fid: 12345, ownerAddress: "not-an-address" }]);
    expect(compareAllWallets(user, "not-an-address")).toBe(false);
  });
});

describe("compareAllWallets — Cross-app wallets", () => {
  it("matches embedded wallet from cross_app account", () => {
    const user = createUser([
      {
        type: "cross_app",
        embeddedWallets: [{ address: ADDR_EMBEDDED }],
        smartWallets: [],
      },
    ]);
    expect(compareAllWallets(user, ADDR_EMBEDDED)).toBe(true);
  });

  it("matches smart wallet from cross_app account", () => {
    const user = createUser([
      {
        type: "cross_app",
        embeddedWallets: [],
        smartWallets: [{ address: ADDR_CROSS_SMART }],
      },
    ]);
    expect(compareAllWallets(user, ADDR_CROSS_SMART)).toBe(true);
  });
});

describe("compareAllWallets — Edge cases", () => {
  it("returns false for empty linkedAccounts", () => {
    const user = createUser([]);
    expect(compareAllWallets(user, ADDR_A)).toBe(false);
  });

  it("returns false when linkedAccounts is undefined", () => {
    const user = { id: "test-user" } as unknown as User;
    expect(compareAllWallets(user, ADDR_A)).toBe(false);
  });

  it("handles mixed account types", () => {
    const user = createUser([
      { type: "email", address: "test@example.com" },
      { type: "wallet", address: ADDR_A },
      { type: "farcaster", fid: 1 },
      { type: "smart_wallet", address: ADDR_SMART },
    ]);
    expect(compareAllWallets(user, ADDR_A)).toBe(true);
    expect(compareAllWallets(user, ADDR_SMART)).toBe(true);
    expect(compareAllWallets(user, "test@example.com")).toBe(false);
  });

  it("matches checksummed address against lowercase", () => {
    const user = createUser([{ type: "wallet", address: ADDR_CHECKSUMMED }]);
    expect(compareAllWallets(user, ADDR_CHECKSUMMED.toLowerCase())).toBe(true);
  });

  it("ignores account types that are not wallet/smart_wallet/farcaster/cross_app", () => {
    const user = createUser([
      { type: "google_oauth", email: "test@gmail.com" },
      { type: "phone", phoneNumber: "+1234567890" },
    ]);
    expect(compareAllWallets(user, ADDR_UNMATCHED)).toBe(false);
  });
});
