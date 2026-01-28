"use client";

import { ChevronRightIcon } from "@heroicons/react/24/solid";
import type { FC } from "react";
import type { Address } from "viem";
import { useKarmaSeeds } from "@/hooks/useKarmaSeeds";
import { useKarmaSeedsTokenData } from "@/hooks/useKarmaSeedsContract";
import { useKarmaSeedsModalStore } from "@/store/modals/karmaSeeds";

interface KarmaSeedsCardProps {
  projectUID: string;
}

export const KarmaSeedsCard: FC<KarmaSeedsCardProps> = ({ projectUID }) => {
  const { data: karmaSeeds, isLoading: isLoadingSeeds } = useKarmaSeeds(projectUID);
  const { openBuyModal } = useKarmaSeedsModalStore();

  // Read total supply directly from the contract (real-time on-chain data)
  const contractAddress = karmaSeeds?.contractAddress as Address | undefined;
  const { totalSupply, refetchTotalSupply } = useKarmaSeedsTokenData(contractAddress);

  // Format the total raised (totalSupply = USD raised since 1 token = $1)
  const totalRaisedValue = totalSupply
    ? parseFloat(totalSupply).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0";
  const totalRaised = `${totalRaisedValue}$`;

  if (isLoadingSeeds) {
    return null;
  }

  if (!karmaSeeds) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openBuyModal}
      className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#10B981] dark:border-l-[#10B981] border-l-[4px] p-4 justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
    >
      <div className="flex flex-col gap-2">
        <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#D1FAE5] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px] min-w-[40px] w-max h-max">
          {totalRaised}
        </p>
        <div className="flex flex-row gap-2">
          <p className="font-normal text-brand-gray text-sm dark:text-zinc-300">
            Raised via Karma Seeds
          </p>
          <img src="/icons/seed.svg" alt="Seeds" className="w-5 h-5" />
        </div>
      </div>
      <div className="w-5 h-5 flex justify-center items-center">
        <ChevronRightIcon className="w-5 h-5 text-[#1D2939] dark:text-zinc-200" />
      </div>
    </button>
  );
};

export default KarmaSeedsCard;
