import { NoSymbolIcon } from "@heroicons/react/24/outline";
import { memo } from "react";

import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import type { MilestoneCancellationInfo } from "@/types/v2/roadmap";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface CancelledMilestoneBannerProps {
  /**
   * On-chain cancellation overlay. May be absent for a status-only cancellation
   * (`status === "cancelled"` with no overlay), in which case the banner still
   * renders the terminal "Cancelled" state without the metadata.
   */
  cancellation: MilestoneCancellationInfo | null;
  /** Spacing is owned by the call site — the banner ships with no outer margin. */
  className?: string;
}

/**
 * Quiet terminal state for a cancelled milestone (DEV-523). A tinted panel
 * rather than a bordered box so it doesn't read as a card nested inside the
 * milestone card, and surfaces the canceller as a human-readable profile name.
 */
function CancelledMilestoneBannerComponent({
  cancellation,
  className,
}: CancelledMilestoneBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg bg-gray-100/80 px-4 py-3 dark:bg-zinc-800/70",
        className
      )}
    >
      <NoSymbolIcon
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm leading-snug">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Milestone cancelled
          </span>
          {cancellation?.cancelledBy ? (
            <span className="text-gray-500 dark:text-gray-400">
              by{" "}
              <EthereumAddressToProfileName
                address={cancellation.cancelledBy}
                className="font-medium text-gray-700 dark:text-gray-300"
              />
            </span>
          ) : null}
          {cancellation?.cancelledAt ? (
            <span className="text-gray-400 dark:text-gray-500">
              <span aria-hidden="true">·</span> {formatDate(cancellation.cancelledAt)}
            </span>
          ) : null}
        </div>
        {cancellation?.reason ? (
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {cancellation.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const CancelledMilestoneBanner = memo(CancelledMilestoneBannerComponent);
