import { useEffect, useMemo, useState } from "react";
import { getProject } from "@/services/project.service";
import type { ChainPayoutAddressMap } from "@/src/features/chain-payout-address/types/chain-payout-address";

interface CartItem {
  uid: string;
  slug?: string;
  title: string;
}

/**
 * Fetches chainPayoutAddress for a single project
 */
async function fetchProjectChainPayoutAddress(
  projectIdOrSlug: string
): Promise<ChainPayoutAddressMap | null> {
  const project = await getProject(projectIdOrSlug);
  return project?.chainPayoutAddress || null;
}

/**
 * Hook for fetching chain payout addresses for all cart items.
 * Replaces the legacy usePayoutAddressManager which used community-based resolution.
 */
export function useCartChainPayoutAddresses(items: CartItem[]) {
  const [chainPayoutAddresses, setChainPayoutAddresses] = useState<
    Record<string, ChainPayoutAddressMap>
  >({});
  const [missingPayouts, setMissingPayouts] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Memoize item UIDs to prevent unnecessary refetches
  const itemIds = useMemo(() => items.map((i) => i.uid).join(","), [items]);

  useEffect(() => {
    if (!itemIds || items.length === 0) {
      setChainPayoutAddresses({});
      setMissingPayouts([]);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);

    // Fetch payout addresses for all items
    // Note: itemIds is used for memoization (string comparison), items is used for data
    Promise.all(
      items.map((item) =>
        fetchProjectChainPayoutAddress(item.slug || item.uid).then((addresses) => ({
          uid: item.uid,
          addresses,
        }))
      )
    )
      .then((results) => {
        if (cancelled) return;

        const addressMap: Record<string, ChainPayoutAddressMap> = {};
        const missing: string[] = [];

        for (const { uid, addresses } of results) {
          if (addresses && Object.keys(addresses).length > 0) {
            addressMap[uid] = addresses;
          } else {
            missing.push(uid);
          }
        }

        setChainPayoutAddresses(addressMap);
        setMissingPayouts(missing);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to fetch chain payout addresses:", error);
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [itemIds, items]); // itemIds for change detection, items for data access

  return {
    chainPayoutAddresses,
    missingPayouts,
    isFetching,
    setMissingPayouts,
  };
}
