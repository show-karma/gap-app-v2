import type { User } from "@privy-io/react-auth";
import { compareAllWallets } from "./compare-all-wallets";

/**
 * The signing strategy implied by HOW the authenticated user logged in.
 * - "embedded": email/Google/Farcaster login — the user signs with the
 *   Privy-managed embedded wallet (gasless where supported). The external
 *   path is forbidden for these users; a connected MetaMask is never theirs
 *   to sign with.
 * - "external": wallet login — the user signs with their own external wallet.
 * - "none": no resolvable user (pre-auth / hydration) — nothing may sign.
 */
type SigningMode = "embedded" | "external" | "none";

/**
 * Minimal shape the resolver needs from a Privy connected wallet. Accepting a
 * structural type (rather than the full ConnectedWallet) keeps this pure and
 * trivially testable.
 */
interface ResolvableWallet {
  address: string;
  walletClientType: string;
}

interface ResolvedSigningWallets<T extends ResolvableWallet> {
  /** The connected embedded (Privy-managed) wallet, or null while it hydrates. */
  embeddedWallet: T | null;
  /**
   * The connected external wallet that is LINKED to the authenticated user, or
   * null. An unlinked/stale external wallet (e.g. a lingering MetaMask from a
   * previous session) is never returned.
   */
  externalWallet: T | null;
  /** The signing strategy implied by the login method. */
  signingMode: SigningMode;
}

/**
 * Check if the user logged in with email/Google/Farcaster (not an external
 * wallet). These users sign with the embedded wallet via gasless transactions.
 *
 * Farcaster users belong in the embedded signing mode too, but they may never
 * get an embedded wallet: their linked ownerAddress counts as a linked wallet,
 * which suppresses embedded-wallet creation in useEnsureEmbeddedWallet
 * (createOnLogin is "off"). Consumers must therefore fall back to the LINKED
 * external wallet when no embedded wallet exists in embedded mode.
 *
 * Exported here (rather than living privately in useZeroDevSigner) so identity
 * resolution and signer resolution share one definition and can never diverge.
 */
export function didUserLoginWithEmailOrSocial(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.linkedAccounts.some(
    (account) =>
      account.type === "email" || account.type === "google_oauth" || account.type === "farcaster"
  );
}

/**
 * Single source of truth for "which connected wallet may sign for the
 * authenticated user, and how".
 *
 * Privy's useWallets() lists EVERY physically-connected wallet, including one
 * left over from a previous session that is NOT linked to the current user —
 * notably MetaMask, which Privy cannot disconnect programmatically. The
 * attestation signer previously picked the first non-Privy wallet outright,
 * which happily returned that foreign wallet and routed a signature prompt to
 * someone else's account.
 *
 * Rules (the enforced invariant: "a wallet may only sign if it is linked to the
 * authenticated user"):
 * - `embeddedWallet` is the connected `walletClientType === "privy"` wallet.
 *   When linkedAccounts are populated we additionally verify it against
 *   `compareAllWallets` as defense in depth, but the embedded wallet is created
 *   by Privy for this very user, so the type check is normally sufficient and we
 *   keep it when linkage can't yet be confirmed (hydration).
 * - `externalWallet` is the first non-Privy connected wallet that passes
 *   `compareAllWallets(user, wallet.address)`. Unlinked wallets are excluded
 *   outright, so a foreign MetaMask can never be returned.
 * - `signingMode` derives from the login method, NOT from which wallets happen
 *   to be connected — so an email user mid-hydration (embedded not yet present)
 *   still resolves to "embedded" and never silently falls back to external.
 */
export function resolveSigningWallets<T extends ResolvableWallet>(
  user: User | null | undefined,
  wallets: T[]
): ResolvedSigningWallets<T> {
  const signingMode: SigningMode = !user
    ? "none"
    : didUserLoginWithEmailOrSocial(user)
      ? "embedded"
      : "external";

  const connectedEmbedded = wallets.find((wallet) => wallet.walletClientType === "privy") ?? null;
  // Defense in depth: when linkedAccounts confirm a different embedded wallet,
  // honor only the linked one. Otherwise (hydration, or the embedded wallet not
  // yet reflected in linkedAccounts) trust the Privy-typed wallet — Privy mints
  // it for this user.
  const embeddedWallet =
    connectedEmbedded && user && !compareAllWallets(user, connectedEmbedded.address)
      ? (wallets.find(
          (wallet) => wallet.walletClientType === "privy" && compareAllWallets(user, wallet.address)
        ) ?? connectedEmbedded)
      : connectedEmbedded;

  const externalWallet = user
    ? (wallets.find(
        (wallet) => wallet.walletClientType !== "privy" && compareAllWallets(user, wallet.address)
      ) ?? null)
    : null;

  return { embeddedWallet, externalWallet, signingMode };
}
