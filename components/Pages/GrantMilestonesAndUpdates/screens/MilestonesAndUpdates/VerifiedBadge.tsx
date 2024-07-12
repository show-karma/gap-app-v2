/* eslint-disable @next/next/no-img-element */

import { blo } from "blo";
import { FC, useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useENSNames } from "@/store/ensNames";
import { formatDate } from "@/utilities/formatDate";
import { VerificationsDialog } from "./VerificationsDialog";
import {
  IMilestoneCompleted,
  IProjectImpactStatus,
  IGrantUpdateStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Hex } from "viem";

interface VerifiedBadgeProps {
  verifications:
    | IMilestoneCompleted[]
    | IGrantUpdateStatus[]
    | IProjectImpactStatus[];
  title: string;
}

const BlockieTooltip = ({
  address,
  date,
  reason,
}: {
  address: Hex;
  date: Date;
  reason?: string;
}) => {
  const { ensNames, populateEnsNames } = useENSNames();

  useEffect(() => {
    populateEnsNames([address]);
  }, [address, populateEnsNames]);

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={0.5}>
        <Tooltip.Trigger asChild>
          <div>
            <img
              src={blo(address, 8)}
              alt={address}
              className="h-8 w-8 min-h-8 min-w-8 rounded-full ring-2 ring-white dark:ring-gray-800"
            />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="TooltipContent bg-[#101828] rounded-lg text-white p-3 max-w-[360px]"
            sideOffset={5}
            side="bottom"
          >
            <div>
              <div>
                <p className="text-xs font-bold truncate">
                  {ensNames[address]?.name || address}
                </p>
                <p className="text-xs font-normal">on {formatDate(date)}</p>
              </div>
              <p className="text-xs font-normal mt-1">{reason}</p>
            </div>
            <Tooltip.Arrow className="TooltipArrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export const VerifiedBadge: FC<VerifiedBadgeProps> = ({
  verifications,
  title,
}) => {
  const [orderedSort, setOrderedSort] = useState<
    (IMilestoneCompleted | IGrantUpdateStatus | IProjectImpactStatus)[]
  >([]);

  const getUniqueVerifications = (
    verifications:
      | IMilestoneCompleted[]
      | IGrantUpdateStatus[]
      | IProjectImpactStatus[]
  ) => {
    // get unique and by last date
    const uniqueVerifications: Record<
      Hex,
      IMilestoneCompleted | IGrantUpdateStatus | IProjectImpactStatus
    > = {};
    verifications.forEach((verification) => {
      if (!verification.attester) return;
      if (!uniqueVerifications[verification.attester]) {
        uniqueVerifications[verification.attester] = verification;
      } else if (
        uniqueVerifications[verification.attester].createdAt <
        verification.createdAt
      ) {
        uniqueVerifications[verification.attester] = verification;
      }
    });
    return Object.values(uniqueVerifications);
  };

  const [isOpenDialog, setIsOpenDialog] = useState(false);

  useEffect(() => {
    const uniques = getUniqueVerifications(verifications);

    // order by date
    const sorted = uniques.sort((a, b) => {
      if (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime())
        return 1;
      if (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime())
        return -1;
      return 0;
    });
    setOrderedSort(sorted);
  }, [verifications]);

  const openDialog = () => setIsOpenDialog(true);

  const closeDialog = () => setIsOpenDialog(false);

  const hasMore = orderedSort.length > 4;

  return (
    <div className="flex flex-row items-center gap-2 flex-1">
      <img
        alt="Verified Badge"
        src={"/icons/milestone-verified-badge.svg"}
        className="w-6 h-6"
      />
      <span className="text-sm font-semibold text-[#0E9384]">Verified</span>
      <VerificationsDialog
        verifications={orderedSort}
        isOpen={isOpenDialog}
        closeDialog={closeDialog}
        title={title}
      />
      <button
        className="ml-2 flex flex-row -space-x-1 flex-wrap"
        onClick={openDialog}
      >
        {orderedSort.slice(0, 4).map((verification) => (
          <img
            key={verification.attester}
            src={blo(verification.attester as Hex, 8)}
            alt={verification.attester}
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
