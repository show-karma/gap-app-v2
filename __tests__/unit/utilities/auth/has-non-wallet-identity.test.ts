/**
 * @file Tests for hasNonWalletIdentity
 * @description Decides whether a Privy session survives losing every connected
 * wallet. Drives the wallet-disconnect logout in useAuth, so a false positive
 * here strands a user in a session with no identity, and a false negative signs
 * out an email/social user who merely unlinked a wallet.
 */

import type { User } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";
import { hasNonWalletIdentity } from "@/utilities/auth/has-non-wallet-identity";

const userWith = (linkedAccounts: unknown[]): User =>
  ({ id: "user-1", linkedAccounts }) as unknown as User;

describe("hasNonWalletIdentity", () => {
  it("returns false for a wallet-only session", () => {
    expect(hasNonWalletIdentity(userWith([{ type: "wallet", address: "0xabc" }]))).toBe(false);
  });

  it("returns false when every linked account is a wallet flavour", () => {
    expect(
      hasNonWalletIdentity(
        userWith([
          { type: "wallet", address: "0xabc" },
          { type: "smart_wallet", address: "0xdef" },
          { type: "cross_app", embeddedWallets: [], smartWallets: [] },
        ])
      )
    ).toBe(false);
  });

  it("returns true for an email login", () => {
    expect(hasNonWalletIdentity(userWith([{ type: "email", address: "a@b.com" }]))).toBe(true);
  });

  it("returns true for a Google login", () => {
    expect(hasNonWalletIdentity(userWith([{ type: "google_oauth", email: "a@b.com" }]))).toBe(true);
  });

  it("returns true for a Farcaster login", () => {
    expect(hasNonWalletIdentity(userWith([{ type: "farcaster", username: "amaury" }]))).toBe(true);
  });

  it("returns true for a social user who also linked a wallet", () => {
    expect(
      hasNonWalletIdentity(
        userWith([
          { type: "wallet", address: "0xabc" },
          { type: "email", address: "a@b.com" },
        ])
      )
    ).toBe(true);
  });

  it("returns false for null, undefined, or a user with no linkedAccounts", () => {
    expect(hasNonWalletIdentity(null)).toBe(false);
    expect(hasNonWalletIdentity(undefined)).toBe(false);
    expect(hasNonWalletIdentity({ id: "user-1" } as unknown as User)).toBe(false);
  });
});
