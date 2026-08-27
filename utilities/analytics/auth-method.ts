/**
 * Maps Privy's identity vocabulary onto the analytics `AuthMethod` union.
 *
 * Privy names the same identity two different ways depending on where it is
 * read: `useLogin({ onComplete })` reports a `loginMethod` (`"siwe"` for a
 * wallet signature, `"google"` for OAuth), while `user.linkedAccounts` reports
 * an account `type` (`"wallet"`, `"google_oauth"`). Both funnel through here so
 * `login_completed.auth_method` and the `auth_method` super property never
 * disagree in the dashboard.
 */

import type { AuthMethod } from "./events";

/** Every spelling Privy uses for a given method, on either side of the API. */
const AUTH_METHOD_ALIASES: Record<AuthMethod, readonly string[]> = {
  email: ["email"],
  google: ["google", "google_oauth"],
  wallet: ["wallet", "siwe", "siws"],
  farcaster: ["farcaster"],
  unknown: [],
};

const ALIAS_LOOKUP = new Map<string, AuthMethod>(
  Object.entries(AUTH_METHOD_ALIASES).flatMap(([method, aliases]) =>
    aliases.map((alias) => [alias, method as AuthMethod])
  )
);

/** Anything Privy reports that the catalog does not model collapses to `unknown`. */
export const toAuthMethod = (raw: string | null | undefined): AuthMethod =>
  (raw && ALIAS_LOOKUP.get(raw)) || "unknown";

interface LinkedAccountLike {
  type: string;
}

/** The raw Privy account types on the profile, deduped and order-preserved. */
export const linkedAccountTypes = (
  linkedAccounts: readonly LinkedAccountLike[] | undefined | null
): string[] => Array.from(new Set((linkedAccounts ?? []).map((account) => account.type)));

/**
 * The method that best describes how this user signs in, given the account
 * types from `linkedAccountTypes`. A wallet is the fallback rather than the
 * answer: an email or social user who later links a wallet still signs in with
 * the social identity, and reporting them as a wallet user would move them into
 * the wrong activation cohort.
 */
export const primaryAuthMethod = (types: readonly string[]): AuthMethod => {
  const methods = types.map(toAuthMethod);
  return (
    methods.find((method) => method !== "wallet" && method !== "unknown") ??
    methods.find((method) => method === "wallet") ??
    "unknown"
  );
};
