import Image from "next/image";
import { type FC, useMemo, useState } from "react";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { VerificationsDialog } from "./VerificationsDialog";

/** Minimal verification record compatible with both V2 Verification and legacy SDK types */
export interface VerificationRecord {
  attester: string;
  createdAt: string | Date;
  reason?: string;
  data?: { reason?: string };
}

interface VerifiedBadgeProps {
  // V2: Simple boolean verification
  isVerified?: boolean;
  // Array of verification records (V2 or legacy)
  verifications?: VerificationRecord[];
  title: string;
}

export const VerifiedBadge: FC<VerifiedBadgeProps> = ({ isVerified, verifications, title }) => {
  // V2: If isVerified is true, just show a simple verified badge
  if (isVerified === true) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 dark:bg-green-900">
        <span className="text-sm font-medium text-green-700 dark:text-green-300">Verified</span>
      </div>
    );
  }

  // Legacy: Array-based verifications
  if (!verifications || verifications.length === 0) return null;

  return <VerifiedBadgeLegacy verifications={verifications} title={title} />;
};

// Legacy component for array-based verifications
const VerifiedBadgeLegacy: FC<{
  verifications: VerificationRecord[];
  title: string;
}> = ({ verifications, title }) => {
  const orderedSort = useMemo(() => {
    // get unique verifications by attester, keeping the latest date
    const uniqueVerifications: Record<string, VerificationRecord> = {};
    verifications.forEach((verification) => {
      if (!verification.attester) return;
      if (!uniqueVerifications[verification.attester]) {
        uniqueVerifications[verification.attester] = verification;
      } else if (uniqueVerifications[verification.attester].createdAt < verification.createdAt) {
        uniqueVerifications[verification.attester] = verification;
      }
    });

    // order by date descending
    return Object.values(uniqueVerifications).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [verifications]);

  const [isOpenDialog, setIsOpenDialog] = useState(false);

  const openDialog = () => setIsOpenDialog(true);

  const closeDialog = () => setIsOpenDialog(false);

  const hasMore = orderedSort.length > 4;

  return (
    <div className="flex flex-row items-center gap-2 flex-1">
      <Image
        alt="Verified Badge"
        src={"/icons/milestone-verified-badge.svg"}
        width={24}
        height={24}
        className="w-6 h-6"
      />
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-400">Verified by</span>
      <VerificationsDialog
        verifications={orderedSort}
        isOpen={isOpenDialog}
        closeDialog={closeDialog}
        title={title}
      />
      <button
        type="button"
        className="ml-2 flex flex-row -space-x-1 flex-wrap"
        onClick={openDialog}
      >
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
