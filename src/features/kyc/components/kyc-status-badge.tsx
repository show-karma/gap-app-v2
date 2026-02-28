"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utilities/tailwind";
import {
  getEffectiveStatus,
  kycIconClassMap,
  kycStatusClassMap,
  kycStatusIcons,
  kycStatusLabels,
} from "../lib/status-config";
import type { KycStatusResponse } from "../types";
import { KycTooltipContent } from "./kyc-tooltip-content";

interface KycStatusBadgeProps {
  status: KycStatusResponse | null;
  showLabel?: boolean;
  className?: string;
}

export function KycStatusBadge({ status, showLabel = true, className }: KycStatusBadgeProps) {
  const effectiveStatus = getEffectiveStatus(status?.status, status?.isExpired);
  const Icon = kycStatusIcons[effectiveStatus];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              kycStatusClassMap[effectiveStatus],
              className
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", kycIconClassMap[effectiveStatus])} />
            {showLabel && (
              <span className="hidden sm:inline">{kycStatusLabels[effectiveStatus]}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <KycTooltipContent status={status} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
