import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import type { IFundingApplication } from "@/types/funding-platform";
import { getStatusUpdateErrorMessage } from "@/utilities/application-status";
import { QUERY_KEYS } from "./fundingPlatformQueryKeys";

/** Shared onError for every application-status mutation: one toast, one log. */
export function notifyStatusUpdateError(error: unknown): void {
  console.error("Failed to update application status:", error);
  toast.error(getStatusUpdateErrorMessage(error));
}

/**
 * Single-row freshness read, so validating a pending status transition against
 * server truth costs one request instead of refetching every loaded page.
 * Resolves to null when the read fails — the backend still arbitrates.
 */
export async function fetchFreshApplicationByReference(
  queryClient: QueryClient,
  referenceNumber: string
): Promise<IFundingApplication | null> {
  try {
    return await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.applicationByReference(referenceNumber),
      queryFn: () => fundingPlatformService.applications.getApplicationByReference(referenceNumber),
      staleTime: 0,
    });
  } catch (error) {
    console.error("Failed to re-read application before status change:", error);
    return null;
  }
}
