"use client";

import { Info } from "lucide-react";
import type { FC } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/utilities/formatDate";

interface PostedInfoTooltipProps {
  date?: string | number | null;
  attester?: string;
  className?: string;
}

export const PostedInfoTooltip: FC<PostedInfoTooltipProps> = ({ date, attester, className }) => {
  if (!date && !attester) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Posted info"
            className={`flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ${className ?? ""}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="flex flex-row items-center gap-1.5 text-xs">
            {date ? <span>Posted {formatDate(date)}</span> : null}
            {attester ? (
              <>
                <span>by</span>
                <EthereumAddressToProfileName
                  address={attester}
                  showProfilePicture
                  pictureClassName="h-4 w-4 min-h-4 min-w-4 rounded-full"
                />
              </>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
