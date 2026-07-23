import type { User } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";
import {
  didUserLoginWithEmailOrSocial,
  resolveSigningWallets,
} from "@/utilities/auth/resolve-signing-wallets";

const ADDR = {
  embedded: "0x3333333333333333333333333333333333333333",
  metamask: "0x1111111111111111111111111111111111111111",
  foreign: "0x9999999999999999999999999999999999999999",
};

const makeUser = (linkedAccounts: unknown[]): User => ({ linkedAccounts }) as unknown as User;

const embeddedWallet = (address = ADDR.embedded) => ({ address, walletClientType: "privy" });
const externalWallet = (address = ADDR.metamask, walletClientType = "metamask") => ({
  address,
  walletClientType,
});

describe("didUserLoginWithEmailOrSocial", () => {
  it("returns false for null/undefined user", () => {
    expect(didUserLoginWithEmailOrSocial(null)).toBe(false);
    expect(didUserLoginWithEmailOrSocial(undefined)).toBe(false);
  });

  it("returns true for email, google_oauth, and farcaster logins", () => {
    expect(didUserLoginWithEmailOrSocial(makeUser([{ type: "email" }]))).toBe(true);
    expect(didUserLoginWithEmailOrSocial(makeUser([{ type: "google_oauth" }]))).toBe(true);
    expect(didUserLoginWithEmailOrSocial(makeUser([{ type: "farcaster" }]))).toBe(true);
  });

  it("returns false for a wallet-only login", () => {
    expect(
      didUserLoginWithEmailOrSocial(makeUser([{ type: "wallet", address: ADDR.metamask }]))
    ).toBe(false);
  });
});

describe("resolveSigningWallets", () => {
  describe("signingMode derivation", () => {
    it("is 'none' when user is null/undefined", () => {
      expect(resolveSigningWallets(null, [externalWallet()]).signingMode).toBe("none");
      expect(resolveSigningWallets(undefined, []).signingMode).toBe("none");
    });

    it("is 'embedded' for email/Google/Farcaster users", () => {
      expect(resolveSigningWallets(makeUser([{ type: "email" }]), []).signingMode).toBe("embedded");
      expect(resolveSigningWallets(makeUser([{ type: "google_oauth" }]), []).signingMode).toBe(
        "embedded"
      );
      expect(resolveSigningWallets(makeUser([{ type: "farcaster" }]), []).signingMode).toBe(
        "embedded"
      );
    });

    it("is 'external' for wallet-login users", () => {
      const user = makeUser([{ type: "wallet", address: ADDR.metamask }]);
      expect(resolveSigningWallets(user, []).signingMode).toBe("external");
    });
  });

  describe("the stale unlinked MetaMask (issue #1574)", () => {
    it("excludes a connected MetaMask not linked to an email user", () => {
      // The exact failure: email user, foreign MetaMask lingering as wallets[0],
      // embedded wallet present. The external wallet must NEVER be returned.
      const user = makeUser([{ type: "email" }, { type: "wallet", address: ADDR.embedded }]);
      const wallets = [externalWallet(ADDR.foreign), embeddedWallet()];

      const result = resolveSigningWallets(user, wallets);

      expect(result.signingMode).toBe("embedded");
      expect(result.externalWallet).toBeNull();
      expect(result.embeddedWallet?.address).toBe(ADDR.embedded);
    });

    it("returns a null embedded wallet (never a foreign one) during hydration", () => {
      // Embedded wallet hasn't appeared yet; only the foreign MetaMask is connected.
      const user = makeUser([{ type: "email" }]);
      const wallets = [externalWallet(ADDR.foreign)];

      const result = resolveSigningWallets(user, wallets);

      expect(result.signingMode).toBe("embedded");
      expect(result.embeddedWallet).toBeNull();
      expect(result.externalWallet).toBeNull();
    });
  });

  describe("embedded-only", () => {
    it("returns the embedded wallet and no external wallet", () => {
      const user = makeUser([{ type: "google_oauth" }, { type: "wallet", address: ADDR.embedded }]);
      const result = resolveSigningWallets(user, [embeddedWallet()]);

      expect(result.embeddedWallet?.address).toBe(ADDR.embedded);
      expect(result.externalWallet).toBeNull();
    });
  });

  describe("wallet-login user", () => {
    it("returns the linked external wallet and skips a stale connected one", () => {
      const user = makeUser([{ type: "wallet", address: ADDR.metamask }]);
      // The user's own MetaMask plus a stale foreign wallet listed first.
      const wallets = [externalWallet(ADDR.foreign), externalWallet(ADDR.metamask)];

      const result = resolveSigningWallets(user, wallets);

      expect(result.signingMode).toBe("external");
      expect(result.externalWallet?.address).toBe(ADDR.metamask);
    });

    it("returns no external wallet when only an unlinked wallet is connected", () => {
      const user = makeUser([{ type: "wallet", address: ADDR.metamask }]);
      const result = resolveSigningWallets(user, [externalWallet(ADDR.foreign)]);

      expect(result.externalWallet).toBeNull();
    });
  });

  describe("Farcaster owner-address linkage", () => {
    it("returns the embedded wallet for a Farcaster user", () => {
      const user = makeUser([
        { type: "farcaster", ownerAddress: ADDR.metamask },
        { type: "wallet", address: ADDR.embedded },
      ]);
      const result = resolveSigningWallets(user, [embeddedWallet()]);

      expect(result.signingMode).toBe("embedded");
      expect(result.embeddedWallet?.address).toBe(ADDR.embedded);
    });
  });

  describe("embedded defense-in-depth", () => {
    it("prefers the linked privy wallet when a foreign privy-typed wallet is listed first", () => {
      // A privy-typed wallet not linked to the user listed before the real one.
      const user = makeUser([{ type: "email" }, { type: "wallet", address: ADDR.embedded }]);
      const wallets = [embeddedWallet(ADDR.foreign), embeddedWallet(ADDR.embedded)];

      const result = resolveSigningWallets(user, wallets);

      expect(result.embeddedWallet?.address).toBe(ADDR.embedded);
    });

    it("keeps the connected privy wallet when linkedAccounts don't yet list it", () => {
      // Hydration: embedded wallet present but not yet reflected in linkedAccounts.
      const user = makeUser([{ type: "email" }]);
      const result = resolveSigningWallets(user, [embeddedWallet()]);

      expect(result.embeddedWallet?.address).toBe(ADDR.embedded);
    });
  });
});
