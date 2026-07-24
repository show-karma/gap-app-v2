import { NoSymbolIcon } from "@heroicons/react/24/outline";
import { memo } from "react";

import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import type { MilestoneCancellation } from "@/services/milestones";
import { formatDate } from "@/utilities/formatDate";

interface CancelledMilestoneBannerProps {
  cancellation: MilestoneCancellation;
}

/**
 * Quiet terminal state for a cancelled milestone (DEV-523). Styled to match the
 * neutral "Cancelled" badge rather than the colored completion/verification
 * boxes, and surfaces the canceller as a human-readable profile name.
 */
function CancelledMilestoneBannerComponent({ cancellation }: CancelledMilestoneBannerProps) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
        <NoSymbolIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-tight">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Cancelled</span>
          {cancellation.cancelledBy ? (
            <span className="text-gray-500 dark:text-gray-400">
              by{" "}
              <EthereumAddressToProfileName
                address={cancellation.cancelledBy}
                className="font-medium text-gray-700 dark:text-gray-300"
              />
            </span>
          ) : null}
          {cancellation.cancelledAt ? (
            <span className="text-gray-400 dark:text-gray-500">
              <span aria-hidden="true">·</span> {formatDate(cancellation.cancelledAt)}
            </span>
          ) : null}
        </div>
        {cancellation.reason ? (
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span>{" "}
            {cancellation.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const CancelledMilestoneBanner = memo(CancelledMilestoneBannerComponent);
