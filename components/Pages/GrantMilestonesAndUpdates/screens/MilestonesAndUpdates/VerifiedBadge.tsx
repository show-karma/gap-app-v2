/* eslint-disable @next/next/no-img-element */
import {
  GrantUpdateStatus,
  Hex,
  MilestoneCompleted,
} from "@show-karma/karma-gap-sdk";
import { blo } from "blo";
import { FC, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useENSNames } from "@/store/ensNames";
import { formatDate } from "@/utilities/formatDate";

interface VerifiedBadgeProps {
  verifications: MilestoneCompleted[] | GrantUpdateStatus[];
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

export const VerifiedBadge: FC<VerifiedBadgeProps> = ({ verifications }) => {
  const getUniqueVerifications = (
    verifications: MilestoneCompleted[] | GrantUpdateStatus[]
  ) => {
    // get unique and by last date
    const uniqueVerifications: Record<
      Hex,
      MilestoneCompleted | GrantUpdateStatus
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
  const uniques = getUniqueVerifications(verifications);

  // order by date
  const orderedSort = uniques.sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return 0;
  });

  return (
    <div className="flex flex-row items-center gap-2 flex-1">
      <img
        alt="Verified Badge"
        src={"/icons/milestone-verified-badge.svg"}
        className="w-6 h-6"
      />
      <span className="text-sm font-semibold text-[#0E9384]">Verified</span>
      <div className="ml-2 flex flex-row -space-x-1 flex-wrap">
        {orderedSort.map((verification) => (
          <BlockieTooltip
            key={verification.uid}
            address={verification.attester as Hex}
            date={verification.createdAt}
            reason={verification.reason}
          />
        ))}
      </div>
    </div>
  );
};
