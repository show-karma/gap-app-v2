import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { getProject } from "@/services/project.service";
import { getProjectGrants } from "@/services/project-grants.service";
import type { Grant } from "@/types/v2/grant";
import type { ProjectResponse } from "@/types/v2/project";

interface CartItem {
  uid: string;
  slug?: string;
  title: string;
  imageURL?: string;
}

interface PayoutStatus {
  address?: string;
  isLoading: boolean;
  isMissing: boolean;
}

export function usePayoutAddressManager(items: CartItem[], communityId?: string) {
  const [payoutAddresses, setPayoutAddresses] = useState<Record<string, string>>({});
  const [missingPayouts, setMissingPayouts] = useState<string[]>([]);
  const [isFetchingPayouts, setIsFetchingPayouts] = useState(false);

  /**
   * SECURITY: Resolve and validate payout address from project metadata (V2)
   * - Returns undefined if no address is found OR if address is invalid
   * - Validates that the address is a proper Ethereum address
   * - Priority: communityId-specific > first available > grant > owner
   */
  const resolvePayoutAddress = useCallback(
    (project: ProjectResponse, grants: Grant[]): string | undefined => {
      const payout = project.payoutAddress as string | Record<string, string> | undefined;

      let candidateAddress: string | undefined;

      // Priority 1: Direct string payout address
      if (typeof payout === "string" && payout) {
        candidateAddress = payout;
      }
      // Priority 2: Community-specific or first available in object
      else if (payout && typeof payout === "object") {
        if (communityId && payout[communityId]) {
          candidateAddress = payout[communityId];
        } else {
          const firstEntry = Object.values(payout).find(
            (value) => typeof value === "string" && value
          );
          if (typeof firstEntry === "string") {
            candidateAddress = firstEntry;
          }
        }
      }
      // Priority 3: Grant payout address (V2 flat structure)
      else {
        const grantPayout = grants?.find((grant) => grant.details?.payoutAddress);
        if (grantPayout?.details?.payoutAddress) {
          candidateAddress = grantPayout.details.payoutAddress;
        }
        // Priority 4: Owner address
        else if (project.owner) {
          candidateAddress = project.owner;
        }
      }

      // SECURITY: Validate that the address is a valid Ethereum address
      // This prevents sending funds to invalid/malformed addresses
      if (candidateAddress && isAddress(candidateAddress)) {
        return candidateAddress;
      }

      return undefined;
    },
    [communityId]
  );

  useEffect(() => {
    if (!items.length) {
      // Only update state if it's not already empty to prevent infinite loops
      setPayoutAddresses((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setMissingPayouts((prev) => (prev.length === 0 ? prev : []));
      setIsFetchingPayouts(false);
      return;
    }

    let ignore = false;

    const fetchPayoutAddresses = async () => {
      setIsFetchingPayouts(true);
      try {
        const results = await Promise.all(
          items.map(async (item) => {
            const projectId = item.slug || item.uid;
            const [project, grants] = await Promise.all([
              getProject(projectId),
              getProjectGrants(projectId),
            ]);
            const address = project ? resolvePayoutAddress(project, grants) : undefined;
            return { projectId: item.uid, address };
          })
        );

        if (ignore) return;

        const addressMap: Record<string, string> = {};
        const missing: string[] = [];

        results.forEach(({ projectId, address }) => {
          if (address) {
            addressMap[projectId] = address;
          } else {
            missing.push(projectId);
          }
        });

        setPayoutAddresses(addressMap);
        setMissingPayouts(missing);
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load payout addresses", error);
          toast.error("Unable to load payout addresses. Please try again.");
        }
      } finally {
        if (!ignore) {
          setIsFetchingPayouts(false);
        }
      }
    };

    fetchPayoutAddresses();

    return () => {
      ignore = true;
    };
  }, [items, resolvePayoutAddress]);

  const payoutStatusByProject: Record<string, PayoutStatus> = items.reduce(
    (acc, item) => {
      const address = payoutAddresses[item.uid];
      const isLoading = isFetchingPayouts && !address;
      const hasFailed = !isFetchingPayouts && !address;
      acc[item.uid] = {
        address,
        isLoading,
        isMissing: hasFailed,
      };
      return acc;
    },
    {} as Record<string, PayoutStatus>
  );

  const formatAddress = useCallback((address?: string) => {
    if (!address) return "Not configured";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, []);

  return {
    payoutAddresses,
    missingPayouts,
    isFetchingPayouts,
    payoutStatusByProject,
    formatAddress,
    setMissingPayouts,
  };
}
