import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import type { IFundingApplication } from "@/types/funding-platform";
import { getStatusUpdateErrorMessage, isStatusConflictError } from "@/utilities/application-status";
import { QUERY_KEYS } from "./fundingPlatformQueryKeys";

/** Shared onError for every application-status mutation: one toast, one report. */
export function notifyStatusUpdateError(error: unknown): void {
  toast.error(getStatusUpdateErrorMessage(error));
  // A transition conflict is an expected stale-UI event, not telemetry.
  if (!isStatusConflictError(error)) {
    errorManager("Failed to update application status", error);
  }
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
    errorManager("Failed to re-read application before status change", error);
    return null;
  }
}
