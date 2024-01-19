import type { FC, ReactNode } from "react";
import { isAddress } from "viem";

import { Blockie } from "../Blockie";

import { cn, shortAddress } from "@/utilities";

interface UserInfoProps {
  attester: string;
  pClassName?: string;
  tooltipPClassName?: string;
  blockieClassName?: string;
  spanNode?: ReactNode;
}

export const UserInfo: FC<UserInfoProps> = ({
  attester,
  pClassName,
  tooltipPClassName,
  blockieClassName,
  spanNode,
}) => {
  return (
    <>
      {/* Idk how can we use headlessui for this... */}
      {/* <TooltipProvider key={attester}>
        <Tooltip delayDuration={2}>
          <TooltipTrigger className="h-6 w-6 rounded-full object-cover">
            <Blockie
              alt={attester}
              className={cn('h-full w-full rounded-full', blockieClassName)}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p
              className={cn(
                'min-h-[16px] text-sm font-normal text-black max-2xl:text-xs',
                tooltipPClassName
              )}
            >
              {attester}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider> */}
      <p
        className={cn(
          "text-sm text-center font-bold text-black max-2xl:text-[13px]",
          pClassName
        )}
      >
        {isAddress(attester) ? shortAddress(attester) : attester} {` `}
        {spanNode}
      </p>
    </>
  );
};
