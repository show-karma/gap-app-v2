"use client";

import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Spinner } from "@/components/Utilities/Spinner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import {
  getEffectiveStatus,
  kycIconClassMap,
  kycStatusClassMap,
  kycStatusDescriptions,
  kycStatusIcons,
  kycStatusLabels,
} from "../lib/status-config";
import { type KycConfigResponse, type KycStatusResponse, KycVerificationStatus } from "../types";
import { KycTooltipContent } from "./kyc-tooltip-content";

interface KycVerificationCardProps {
  status: KycStatusResponse | null;
  config: KycConfigResponse | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function KycVerificationCard({
  status,
  config,
  isLoading = false,
  error,
}: KycVerificationCardProps) {
  const effectiveStatus = getEffectiveStatus(status?.status, status?.isExpired);
  const Icon = kycStatusIcons[effectiveStatus];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 py-4 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">
              Unable to load verification status. Please try again later.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config?.isEnabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Identity Verification</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    kycStatusClassMap[effectiveStatus]
                  )}
                >
                  <Icon className={cn("h-4 w-4", kycIconClassMap[effectiveStatus])} />
                  {kycStatusLabels[effectiveStatus]}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <KycTooltipContent status={status} showLabel={false} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {kycStatusDescriptions[effectiveStatus]}
        </p>

        {status?.verificationType && (
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-500">
            Verification type: {status.verificationType}
          </p>
        )}

        {effectiveStatus === KycVerificationStatus.NOT_STARTED && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="h-5 w-5" />
            <span className="text-sm">Awaiting verification link from program administrator.</span>
          </div>
        )}

        {(effectiveStatus === KycVerificationStatus.EXPIRED ||
          effectiveStatus === KycVerificationStatus.REJECTED) && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Please contact the program administrator to proceed.</span>
          </div>
        )}

        {effectiveStatus === KycVerificationStatus.OUTREACH && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">
              Please check your email for instructions to complete verification.
            </span>
          </div>
        )}

        {effectiveStatus === KycVerificationStatus.PENDING && (
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <Clock className="h-5 w-5" />
            <span className="text-sm">
              Verification in progress. You will be notified when complete.
            </span>
          </div>
        )}

        {effectiveStatus === KycVerificationStatus.VERIFIED && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">
              Your identity has been verified.
              {status?.expiresAt && (
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  Valid until {formatDate(status.expiresAt)}.
                </span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
