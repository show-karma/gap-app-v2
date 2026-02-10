/* eslint-disable @next/next/no-img-element */

import type {
  IGrantUpdateStatus,
  IMilestoneCompleted,
  IProjectImpactStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, useMemo, useState } from "react";
import type { Hex } from "viem";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { VerificationsDialog } from "./VerificationsDialog";

export interface VerificationRecord {
  attester: `0x${string}`;
  createdAt: Date | string;
  data?: { reason?: string };
}

interface VerifiedBadgeProps {
  // V2: Simple boolean verification
  isVerified?: boolean;
  // Legacy: Array of verification records
  verifications?:
    | VerificationRecord[]
    | IMilestoneCompleted[]
    | IGrantUpdateStatus[]
    | IProjectImpactStatus[];
  title: string;
}

export const VerifiedBadge: FC<VerifiedBadgeProps> = ({ isVerified, verifications, title }) => {
  // Prefer the rich badge with attester avatars when verifications data is available
  if (verifications && verifications.length > 0) {
    return <VerifiedBadgeLegacy verifications={verifications} title={title} />;
  }

  // Fallback: simple verified badge when we know it's verified but lack details
  if (isVerified === true) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 dark:bg-green-900">
        <span className="text-sm font-medium text-green-700 dark:text-green-300">Verified</span>
      </div>
    );
  }

  return null;
};

// Legacy component for array-based verifications
export type VerificationEntry =
  | VerificationRecord
  | IMilestoneCompleted
  | IGrantUpdateStatus
  | IProjectImpactStatus;

const VerifiedBadgeLegacy: FC<{
  verifications: VerificationEntry[];
  title: string;
}> = ({ verifications, title }) => {
  const orderedSort = useMemo(() => {
    // get unique and by last date
    const uniqueVerifications: Record<Hex, VerificationEntry> = {};
    verifications.forEach((verification) => {
      if (!verification.attester) return;
      if (!uniqueVerifications[verification.attester]) {
        uniqueVerifications[verification.attester] = verification;
      } else if (uniqueVerifications[verification.attester].createdAt < verification.createdAt) {
        uniqueVerifications[verification.attester] = verification;
      }
    });
    const uniques = Object.values(uniqueVerifications);

    // order by date (newest first)
    return uniques.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [verifications]);

  const [isOpenDialog, setIsOpenDialog] = useState(false);

  const openDialog = () => setIsOpenDialog(true);

  const closeDialog = () => setIsOpenDialog(false);

  const hasMore = orderedSort.length > 4;

  return (
    <div className="flex flex-row items-center gap-2 flex-1">
      <img alt="Verified Badge" src={"/icons/milestone-verified-badge.svg"} className="w-6 h-6" />
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-400">Verified by</span>
      <VerificationsDialog
        verifications={orderedSort}
        isOpen={isOpenDialog}
        closeDialog={closeDialog}
        title={title}
      />
      <button className="ml-2 flex flex-row -space-x-1 flex-wrap" onClick={openDialog}>
        {orderedSort.slice(0, 4).map((verification) => (
          <EthereumAddressToENSAvatar
            key={verification.attester}
            address={verification.attester}
            className="h-8 w-8 min-h-8 min-w-8 rounded-full ring-2 ring-white dark:ring-gray-800"
          />
        ))}
        {hasMore ? (
          <div className="text-xs text-zinc-900 dark:text-white flex h-8 w-8 min-h-8 min-w-8 rounded-full ring-2 ring-zinc-200 dark:ring-gray-700 bg-white dark:bg-gray-800 justify-center items-center">
            + {orderedSort.length - 4}
          </div>
        ) : null}
      </button>
    </div>
  );
};
