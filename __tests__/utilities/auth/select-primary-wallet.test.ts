import type { User } from "@privy-io/react-auth";
import { selectPrimaryWallet } from "@/utilities/auth/select-primary-wallet";

const ADDR = {
  metamask: "0x1111111111111111111111111111111111111111",
  rainbow: "0x2222222222222222222222222222222222222222",
  embedded: "0x3333333333333333333333333333333333333333",
  stale: "0x9999999999999999999999999999999999999999",
};

const makeUser = (linkedAccounts: unknown[]): User => ({ linkedAccounts }) as unknown as User;
const wallet = (address: string) => ({ address, walletClientType: "x" });

describe("selectPrimaryWallet", () => {
  it("returns undefined when there are no wallets", () => {
    const user = makeUser([{ type: "wallet", address: ADDR.embedded }]);
    expect(selectPrimaryWallet(user, [])).toBeUndefined();
  });

  it("falls back to wallets[0] before the user is resolved (pre-auth / hydration)", () => {
    const wallets = [wallet(ADDR.metamask)];
    expect(selectPrimaryWallet(null, wallets)).toBe(wallets[0]);
    expect(selectPrimaryWallet(undefined, wallets)).toBe(wallets[0]);
  });

  it("returns the linked wallet and skips a stale unlinked wallet listed first", () => {
    // login-with-email scenario: a stale MetaMask lingers as wallets[0] but is NOT
    // linked to the email user; the linked embedded wallet must win.
    const user = makeUser([
      { type: "email", address: "user@example.com" },
      { type: "wallet", address: ADDR.embedded, walletClientType: "privy" },
    ]);
    const wallets = [wallet(ADDR.stale), wallet(ADDR.embedded)];

    expect(selectPrimaryWallet(user, wallets)?.address).toBe(ADDR.embedded);
  });

  describe("multiple wallets linked to one account", () => {
    const multiWalletUser = makeUser([
      { type: "email", address: "user@example.com" },
      { type: "wallet", address: ADDR.metamask, walletClientType: "metamask" },
      { type: "wallet", address: ADDR.rainbow, walletClientType: "rainbow" },
      { type: "wallet", address: ADDR.embedded, walletClientType: "privy" },
    ]);

    it("keeps wallets[0] (Privy's active wallet) when it is linked", () => {
      // All connected wallets belong to the user — selection must match the active
      // wallet (wallets[0]) and not reorder it.
      const wallets = [wallet(ADDR.rainbow), wallet(ADDR.metamask), wallet(ADDR.embedded)];
      expect(selectPrimaryWallet(multiWalletUser, wallets)?.address).toBe(ADDR.rainbow);
    });

    it("follows the active wallet when wallets[0] changes between renders", () => {
      const first = [wallet(ADDR.metamask), wallet(ADDR.rainbow)];
      const afterSwitch = [wallet(ADDR.rainbow), wallet(ADDR.metamask)];
      expect(selectPrimaryWallet(multiWalletUser, first)?.address).toBe(ADDR.metamask);
      expect(selectPrimaryWallet(multiWalletUser, afterSwitch)?.address).toBe(ADDR.rainbow);
    });

    it("picks the first linked wallet when wallets[0] is an unlinked stale wallet", () => {
      const wallets = [wallet(ADDR.stale), wallet(ADDR.metamask), wallet(ADDR.rainbow)];
      expect(selectPrimaryWallet(multiWalletUser, wallets)?.address).toBe(ADDR.metamask);
    });
  });

  it("falls back to wallets[0] when the user has no linked wallet addresses yet", () => {
    // linkedAccounts not populated during hydration — keep something rather than
    // flipping to undefined. This preserves wallet-login connect flows.
    const user = makeUser([]);
    const wallets = [wallet(ADDR.stale)];
    expect(selectPrimaryWallet(user, wallets)?.address).toBe(ADDR.stale);
  });

  it("falls back to wallets[0] when the user only has a non-wallet linked account", () => {
    // Email user mid-hydration: an email account is linked but no wallet address
    // is yet known, so there is nothing to compare against — keep wallets[0].
    const user = makeUser([{ type: "email", address: "user@example.com" }]);
    const wallets = [wallet(ADDR.stale)];
    expect(selectPrimaryWallet(user, wallets)?.address).toBe(ADDR.stale);
  });

  it("returns undefined when the user has linked wallets but none are connected (issue #1574)", () => {
    // Email/Google user with a linked embedded wallet, but only a foreign MetaMask
    // is physically connected. Withhold identity rather than leak the foreign
    // address — this is the ownership-flicker fix.
    const user = makeUser([
      { type: "email", address: "user@example.com" },
      { type: "wallet", address: ADDR.embedded, walletClientType: "privy" },
    ]);
    const wallets = [wallet(ADDR.stale)];
    expect(selectPrimaryWallet(user, wallets)).toBeUndefined();
  });
});
