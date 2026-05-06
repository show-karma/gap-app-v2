"use client";

import { Info } from "lucide-react";
import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { cn } from "@/utilities/tailwind";
import { formatTokenAmount } from "../lib/hedgey-contract";
import type { ClaimCampaign } from "../providers/types";
import type { ClaimEligibility, ClaimLockup } from "../types";

type DelegatedClaimStep = "idle" | "awaiting_signature" | "signature_obtained" | "submitting";

interface CampaignCardProps {
  campaign: ClaimCampaign;
  eligibility: ClaimEligibility | null;
  isClaimed: boolean;
  onClaim: () => void;
  alternateAddress?: `0x${string}` | null;
  onRequestSignature?: () => void;
  onSubmitDelegatedClaim?: () => void;
  delegatedClaimStep?: DelegatedClaimStep;
  hasPendingSignature?: boolean;
  claimingCampaignId?: string | null;
  delegatedActiveCampaignId?: string | null;
  isAnyClaiming?: boolean;
  overrideDisplayName?: string;
  isSafeYouOwn?: boolean;
  isCheckingOwnership?: boolean;
  onRequestClaimViaSafe?: () => void;
  onSubmitClaimViaSafe?: () => void;
  safeClaimStep?: "idle" | "preparing" | "awaiting_signature" | "submitting";
  safeActiveCampaignId?: string | null;
}

const truncateAddress = (address: string) => formatAddressForDisplay(address, 6, 4);

function formatUnixTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function LockupWarning({ cliffDate }: { cliffDate: string }) {
  return (
    <div className="mb-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
      <div className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
        <span>Funds will be locked until {cliffDate}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 cursor-help flex-shrink-0" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>
              This claim has a vesting period. Your tokens will be locked in a vesting contract
              until the specified date.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function CampaignCardComponent({
  campaign,
  eligibility,
  isClaimed,
  onClaim,
  alternateAddress,
  onRequestSignature,
  onSubmitDelegatedClaim,
  delegatedClaimStep = "idle",
  hasPendingSignature = false,
  claimingCampaignId,
  delegatedActiveCampaignId,
  isAnyClaiming = false,
  overrideDisplayName,
  isSafeYouOwn = false,
  isCheckingOwnership = false,
  onRequestClaimViaSafe,
  onSubmitClaimViaSafe,
  safeClaimStep = "idle",
  safeActiveCampaignId,
}: CampaignCardProps) {
  const displayName = useMemo(
    () => overrideDisplayName || eligibility?.title || campaign.token.name,
    [overrideDisplayName, eligibility?.title, campaign.token.name]
  );

  const claimableAmount = useMemo(() => {
    if (!eligibility) return null;
    return formatTokenAmount(eligibility.amount, campaign.token.decimals);
  }, [eligibility, campaign.token.decimals]);

  const claimLockup = campaign.metadata?.claimLockup as ClaimLockup | undefined;

  const isLockupActive = useMemo(() => {
    if (!claimLockup?.cliff) return false;
    const cliffDate = new Date(claimLockup.cliff * 1000);
    return cliffDate > new Date();
  }, [claimLockup?.cliff]);

  const formattedCliffDate = useMemo(() => {
    if (!claimLockup?.cliff) return null;
    return formatUnixTimestamp(claimLockup.cliff);
  }, [claimLockup?.cliff]);

  const isCampaignCompleted = eligibility?.campaignStatus === "completed";
  const canClaim = eligibility && !isClaimed && !isCampaignCompleted;
  const isViewingAlternateAddress = Boolean(alternateAddress);

  const isThisCampaignClaiming = claimingCampaignId === campaign.id;
  const isThisCampaignRequesting =
    delegatedActiveCampaignId === campaign.id && delegatedClaimStep === "awaiting_signature";
  const isThisCampaignSubmitting = hasPendingSignature && delegatedClaimStep === "submitting";
  const isThisCampaignSafePreparing =
    safeActiveCampaignId === campaign.id && safeClaimStep === "preparing";
  const isThisCampaignSafeAwaitingSignature =
    safeActiveCampaignId === campaign.id && safeClaimStep === "awaiting_signature";
  const isThisCampaignSafeSubmitting =
    safeActiveCampaignId === campaign.id && safeClaimStep === "submitting";

  const getSafeClaimButton = () => {
    if (!canClaim || !isViewingAlternateAddress || !isSafeYouOwn) return null;

    // After prepare succeeds, show the explicit "Sign & Propose" button so the user
    // can trigger the wallet signature + Safe API submission.
    if (isThisCampaignSafeAwaitingSignature || isThisCampaignSafeSubmitting) {
      return (
        <Button
          className="w-full font-semibold"
          onClick={onSubmitClaimViaSafe}
          disabled={isAnyClaiming && !isThisCampaignSafeAwaitingSignature}
          aria-label={`Sign and propose Safe transaction for ${displayName}`}
          aria-busy={isThisCampaignSafeSubmitting}
        >
          {isThisCampaignSafeSubmitting ? "Submitting to Safe..." : "Sign & Propose"}
        </Button>
      );
    }

    return (
      <Button
        className="w-full font-semibold"
        onClick={onRequestClaimViaSafe}
        disabled={isAnyClaiming || isCheckingOwnership}
        aria-label={`Propose claim to Safe for ${displayName}`}
        aria-busy={isThisCampaignSafePreparing}
      >
        {isCheckingOwnership
          ? "Checking ownership..."
          : isThisCampaignSafePreparing
            ? "Preparing Safe transaction..."
            : "Propose Claim"}
      </Button>
    );
  };

  const getDelegatedClaimButton = () => {
    if (!canClaim || !isViewingAlternateAddress) return null;
    if (isSafeYouOwn) return null;

    if (hasPendingSignature && delegatedClaimStep !== "awaiting_signature") {
      return (
        <Button
          className="w-full font-semibold"
          onClick={onSubmitDelegatedClaim}
          disabled={isAnyClaiming}
          aria-label={`Submit claim transaction for ${displayName}`}
          aria-busy={isThisCampaignSubmitting}
        >
          {isThisCampaignSubmitting ? "Submitting..." : "Submit Claim"}
        </Button>
      );
    }

    return (
      <Button
        className="w-full font-semibold"
        onClick={onRequestSignature}
        disabled={isAnyClaiming}
        aria-label={`Authorize claim for ${alternateAddress ? truncateAddress(alternateAddress) : "alternate wallet"}`}
        aria-busy={isThisCampaignRequesting}
      >
        {isThisCampaignRequesting ? "Waiting for signature..." : "Authorize Claim"}
      </Button>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground font-mono w-full">{campaign.id}</p>
        <div className="flex gap-3 justify-between items-start w-full">
          <div className="flex flex-col flex-1 gap-1">
            <p className="text-lg font-semibold">{displayName}</p>
            <p className="text-sm text-muted-foreground">{campaign.token.ticker}</p>
          </div>
          {isClaimed ? (
            <Badge variant="secondary">Claimed</Badge>
          ) : isCampaignCompleted ? (
            <Badge
              className={cn(
                "border-transparent bg-yellow-100 text-yellow-800",
                "dark:bg-yellow-900/30 dark:text-yellow-400"
              )}
            >
              Ended
            </Badge>
          ) : (
            <Badge
              className={cn(
                "border-transparent bg-green-100 text-green-800",
                "dark:bg-green-900/30 dark:text-green-400"
              )}
            >
              Available
            </Badge>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 flex flex-col gap-4 pt-4">
        {claimableAmount ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {isClaimed ? "Amount Claimed" : "Claimable Amount"}
            </span>
            <span className="font-semibold text-lg">
              {claimableAmount} {campaign.token.ticker}
            </span>
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold">Previously claimed</span>
          </div>
        )}
        <div className="mt-auto">
          {canClaim && !isViewingAlternateAddress && (
            <>
              {isLockupActive && formattedCliffDate && (
                <LockupWarning cliffDate={formattedCliffDate} />
              )}
              <Button
                className="w-full font-semibold"
                onClick={onClaim}
                disabled={isAnyClaiming}
                aria-label={`Claim ${claimableAmount} ${campaign.token.ticker} from ${displayName}`}
                aria-busy={isThisCampaignClaiming}
              >
                {isThisCampaignClaiming ? "Claiming..." : "Claim"}
              </Button>
            </>
          )}
          {canClaim && alternateAddress && (
            <>
              {isLockupActive && formattedCliffDate && (
                <LockupWarning cliffDate={formattedCliffDate} />
              )}
              {isSafeYouOwn ? (
                <>
                  <div
                    role="alert"
                    className="mb-2 p-3 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                  >
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {isThisCampaignSafeAwaitingSignature ? (
                        <>
                          Ready to sign. Click <strong>Sign & Propose</strong> to submit this
                          transaction to the Safe queue at{" "}
                          <span title={alternateAddress}>{truncateAddress(alternateAddress)}</span>.
                        </>
                      ) : (
                        <>
                          Safe wallet{" "}
                          <span title={alternateAddress}>
                            {truncateAddress(alternateAddress)}
                          </span>
                          . Propose claim to Safe. Any signer can execute it.
                        </>
                      )}
                    </p>
                  </div>
                  {getSafeClaimButton()}
                </>
              ) : (
                <>
                  <div
                    role="alert"
                    className="mb-2 p-3 rounded-lg border bg-primary/5 border-primary/20"
                  >
                    <p className="text-sm text-primary">
                      {hasPendingSignature ? (
                        <>
                          Signature obtained. Submit claim to send tokens to{" "}
                          <span title={alternateAddress}>{truncateAddress(alternateAddress)}</span>.
                        </>
                      ) : (
                        <>
                          Funds belong to{" "}
                          <span title={alternateAddress}>{truncateAddress(alternateAddress)}</span>.
                          Authorize to claim on their behalf.
                        </>
                      )}
                    </p>
                  </div>
                  {getDelegatedClaimButton()}
                </>
              )}
            </>
          )}
          {isCampaignCompleted && !isClaimed && (
            <>
              <div
                role="alert"
                className="mb-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
              >
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This campaign has ended. Claims are no longer available.
                </p>
              </div>
              <Button
                className="w-full font-semibold"
                variant="secondary"
                disabled
                aria-label="Campaign has ended, claiming is no longer available"
              >
                Campaign Ended
              </Button>
            </>
          )}
          {isClaimed &&
            (isLockupActive && formattedCliffDate ? (
              <output className="w-full flex items-center justify-center gap-1 py-2 text-muted-foreground">
                <span>Claim funds after {formattedCliffDate}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 cursor-help" aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Your funds are locked for vesting until {formattedCliffDate}. Login and claim
                      your funds after that date.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </output>
            ) : (
              <Button
                className="w-full font-semibold"
                variant="secondary"
                disabled
                aria-label="Tokens already claimed for this campaign"
              >
                Already Claimed
              </Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export const CampaignCard = memo(CampaignCardComponent);
