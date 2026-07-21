/**
 * Signer trust tests — resolver-level invariant for issue #1574 / #1573.
 *
 * The single enforced policy these tests pin: "a wallet may only sign for the
 * authenticated user if it is linked to that user". resolveSigningWallets is the
 * source of truth the attestation signer hook derives from, so excluding a stale,
 * unlinked external wallet HERE means a foreign MetaMask can never reach signer
 * construction — for any consumer, not just one hook.
 *
 * These assertions are framework-free so they run in the trust project's node
 * environment as well as the unit project.
 */

import type { User } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";
import { resolveSigningWallets } from "@/utilities/auth/resolve-signing-wallets";

const EMBEDDED = "0xEmbedded1111111111111111111111111111111111";
const LINKED_METAMASK = "0xMetaMask2222222222222222222222222222222222";
const FOREIGN_METAMASK = "0x9b75AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const makeUser = (linkedAccounts: unknown[]): User => ({ linkedAccounts }) as unknown as User;
const privyWallet = (address: string) => ({ address, walletClientType: "privy" });
const metaMask = (address: string) => ({ address, walletClientType: "metamask" });

describe("signer trust — resolveSigningWallets enforces linkage", () => {
  describe("email/social users (embedded signing mode)", () => {
    it("excludes a stale unlinked MetaMask even when an embedded wallet is present", () => {
      const user = makeUser([{ type: "email" }, { type: "wallet", address: EMBEDDED }]);
      const wallets = [metaMask(FOREIGN_METAMASK), privyWallet(EMBEDDED)];

      const { embeddedWallet, externalWallet, signingMode } = resolveSigningWallets(user, wallets);

      expect(signingMode).toBe("embedded");
      // The foreign MetaMask is never eligible to sign.
      expect(externalWallet).toBeNull();
      expect(embeddedWallet?.address).toBe(EMBEDDED);
    });

    it("returns no signing wallet at all while only a foreign MetaMask is connected", () => {
      const user = makeUser([{ type: "google_oauth" }]);
      const wallets = [metaMask(FOREIGN_METAMASK)];

      const { embeddedWallet, externalWallet, signingMode } = resolveSigningWallets(user, wallets);

      expect(signingMode).toBe("embedded");
      expect(embeddedWallet).toBeNull();
      expect(externalWallet).toBeNull();
    });
  });

  describe("wallet-login users (external signing mode)", () => {
    it("returns only the LINKED external wallet, skipping a stale foreign one", () => {
      const user = makeUser([{ type: "wallet", address: LINKED_METAMASK }]);
      const wallets = [metaMask(FOREIGN_METAMASK), metaMask(LINKED_METAMASK)];

      const { externalWallet, signingMode } = resolveSigningWallets(user, wallets);

      expect(signingMode).toBe("external");
      expect(externalWallet?.address).toBe(LINKED_METAMASK);
    });

    it("returns no external wallet when the only connected wallet is unlinked", () => {
      const user = makeUser([{ type: "wallet", address: LINKED_METAMASK }]);
      const wallets = [metaMask(FOREIGN_METAMASK)];

      const { externalWallet } = resolveSigningWallets(user, wallets);

      expect(externalWallet).toBeNull();
    });
  });

  describe("pre-auth", () => {
    it("selects nothing when there is no user", () => {
      const { embeddedWallet, externalWallet, signingMode } = resolveSigningWallets(null, [
        metaMask(FOREIGN_METAMASK),
      ]);

      expect(signingMode).toBe("none");
      expect(embeddedWallet).toBeNull();
      expect(externalWallet).toBeNull();
    });
  });
});
