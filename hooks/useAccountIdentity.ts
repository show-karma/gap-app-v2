"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useENS } from "@/store/ens";
import { useUserProfiles } from "@/store/userProfiles";

/**
 * Who the signed-in user is, as the navbar's account button shows them.
 *
 * This exists because that answer was being derived in two places — the button
 * itself and the identity hint published to a tenant's marketing site — and the
 * two disagreed: one showed a name, the other a raw address for the same
 * person. Both now read from here, so they cannot drift apart again.
 *
 * The chain is the button's, unchanged:
 *
 *   1. Farcaster display name, else its username
 *   2. the email Privy has (a direct email login, or Google's)
 *   3. the contributor profile name
 *   4. what `EthereumAddressToProfileName` would resolve for the address:
 *      contributor name, the Privy profile name, ENS, the provider handle, and
 *      finally the truncated address
 *
 * Step 4 needs the ENS and user-profile stores populated. The component that
 * used to render there did that on mount; this does it instead, so removing it
 * from the button does not quietly cost the button its name.
 */

/** Email Privy holds for the user — a direct email login, or Google's. */
function getUserEmail(
  user: { email?: { address: string } | null; google?: { email: string } | null } | null | undefined
): string | undefined {
  return user?.email?.address || user?.google?.email || undefined;
}

/** Truncated the way `EthereumAddressToProfileName` truncates. */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

interface AccountIdentity {
  /** Display name, or undefined while nothing has resolved yet. */
  name?: string;
  /** Picture URL, when one resolved. No identicon — that is the caller's fallback. */
  avatar?: string;
  /** Lower-cased address, when the session has one. */
  address?: string;
}

export function useAccountIdentity(): AccountIdentity {
  const { authenticated, user, address } = useAuth();
  const lowerCased = address?.toLowerCase();

  const { profile } = useContributorProfile(authenticated ? lowerCased : undefined);

  const ensData = useENS((state) => state.ensData);
  const populateEns = useENS((state) => state.populateEns);
  const profiles = useUserProfiles((state) => state.profiles);
  const populateProfiles = useUserProfiles((state) => state.populateProfiles);

  useEffect(() => {
    if (!lowerCased) return;

    if (!ensData[lowerCased as `0x${string}`]) {
      populateEns([lowerCased]);
    }

    const entry = profiles[lowerCased];
    if (!entry || (!entry.isTried && !entry.isFetching)) {
      populateProfiles([lowerCased]);
    }
  }, [lowerCased, ensData, populateEns, profiles, populateProfiles]);

  const privyProfile = lowerCased ? profiles[lowerCased] : undefined;
  const ensEntry = lowerCased ? ensData[lowerCased as `0x${string}`] : undefined;

  const name = useMemo(() => {
    if (user?.farcaster) {
      return user.farcaster.displayName || user.farcaster.username || undefined;
    }

    const email = getUserEmail(user);
    if (email) return email;

    if (profile?.data?.name) return profile.data.name;

    if (!lowerCased) return undefined;

    // Step 4, in `EthereumAddressToProfileName`'s own order.
    if (profile?.name) return profile.name;
    if (privyProfile?.isTried && privyProfile.name) return privyProfile.name;
    if (ensEntry?.name) return ensEntry.name;

    const providerName =
      user?.google?.name ||
      user?.twitter?.name ||
      user?.twitter?.username ||
      user?.discord?.username ||
      undefined;
    if (providerName) return providerName;

    return truncateAddress(lowerCased);
  }, [user, profile, privyProfile, ensEntry, lowerCased]);

  const avatar = useMemo(
    () => user?.farcaster?.pfp || privyProfile?.picture || ensEntry?.avatar || undefined,
    [user, privyProfile, ensEntry]
  );

  return { name, avatar, address: lowerCased };
}
