import type { User } from "@privy-io/react-auth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";

const makeUser = (linkedAccounts: unknown[]): User => ({ linkedAccounts }) as unknown as User;

describe("compareAllWallets", () => {
  it("matches a standard wallet address", () => {
    const user = makeUser([
      { type: "wallet", address: "0xabcdef1234567890abcdef1234567890abcdef12" },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("matches a smart_wallet address", () => {
    const user = makeUser([
      {
        type: "smart_wallet",
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
      },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("matches a farcaster ownerAddress", () => {
    const user = makeUser([
      {
        type: "farcaster",
        ownerAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        fid: 12345,
        username: "testuser",
      },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("does not match farcaster account without ownerAddress", () => {
    const user = makeUser([
      {
        type: "farcaster",
        fid: 12345,
        username: "testuser",
      },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(false);
  });

  it("does not match farcaster with invalid ownerAddress", () => {
    const user = makeUser([
      {
        type: "farcaster",
        ownerAddress: "not-a-valid-address",
        fid: 12345,
      },
    ]);

    expect(compareAllWallets(user, "not-a-valid-address")).toBe(false);
  });

  it("returns false when no linked accounts match", () => {
    const user = makeUser([
      { type: "wallet", address: "0x1111111111111111111111111111111111111111" },
    ]);

    expect(compareAllWallets(user, "0x2222222222222222222222222222222222222222")).toBe(false);
  });

  it("matches cross_app embedded wallet", () => {
    const user = makeUser([
      {
        type: "cross_app",
        embeddedWallets: [{ address: "0xabcdef1234567890abcdef1234567890abcdef12" }],
        smartWallets: [],
      },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("matches when user has multiple account types", () => {
    const user = makeUser([
      { type: "wallet", address: "0x1111111111111111111111111111111111111111" },
      {
        type: "farcaster",
        ownerAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        fid: 12345,
      },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  // ── Additional coverage ──────────────────────────────────────────────────

  it("performs case-insensitive address comparison", () => {
    const user = makeUser([
      { type: "wallet", address: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12" },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("returns false for empty linkedAccounts array", () => {
    const user = makeUser([]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(false);
  });

  it("returns false when linkedAccounts is null/undefined", () => {
    const user = { linkedAccounts: null } as unknown as User;

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(false);
  });

  it("matches cross_app smartWallets address", () => {
    const user = makeUser([
      {
        type: "cross_app",
        embeddedWallets: [],
        smartWallets: [{ address: "0xabcdef1234567890abcdef1234567890abcdef12" }],
      },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("matches checksummed address against lowercased stored address", () => {
    const user = makeUser([
      { type: "wallet", address: "0xabcdef1234567890abcdef1234567890abcdef12" },
    ]);

    // Checksummed version of the same address
    expect(compareAllWallets(user, "0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(true);
  });

  it("returns false for user with only non-wallet account types", () => {
    const user = makeUser([
      { type: "email", address: "user@example.com" },
      { type: "phone", phoneNumber: "+1234567890" },
    ]);

    expect(compareAllWallets(user, "0xabcdef1234567890abcdef1234567890abcdef12")).toBe(false);
  });
});
