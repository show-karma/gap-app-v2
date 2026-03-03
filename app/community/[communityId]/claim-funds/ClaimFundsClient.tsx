"use client";

import { AlertTriangle, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { CampaignCard } from "@/src/features/claim-funds/components/CampaignCard";
import { ClaimFundsErrorBoundary } from "@/src/features/claim-funds/components/ClaimFundsErrorBoundary";
import { EmptyState } from "@/src/features/claim-funds/components/EmptyState";
import { LoadingState } from "@/src/features/claim-funds/components/LoadingState";
import { useCampaignNameMappings } from "@/src/features/claim-funds/hooks/use-campaign-name-mappings";
import { useCampaigns } from "@/src/features/claim-funds/hooks/use-campaigns";
import { useClaimGrantsEnabled } from "@/src/features/claim-funds/hooks/use-claim-provider";
import { useClaimTransaction } from "@/src/features/claim-funds/hooks/use-claim-transaction";
import { useClaimedStatuses } from "@/src/features/claim-funds/hooks/use-claimed-status";
import { useDelegatedClaim } from "@/src/features/claim-funds/hooks/use-delegated-claim";
import { useEligibility } from "@/src/features/claim-funds/hooks/use-eligibility";
import type { ClaimCampaign } from "@/src/features/claim-funds/providers/types";
import { getTenantConfig } from "@/src/infrastructure/config/tenant-config";
import { isKnownTenant, type TenantId } from "@/src/infrastructure/types/tenant";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";

const truncateAddress = (address: string) => formatAddressForDisplay(address, 6, 4);

function ClaimFundsContent() {
  const params = useParams();
  const communityId = params.communityId as string;

  // Get tenant config for claim grants
  const tenantId = isKnownTenant(communityId) ? communityId : ("default" as TenantId);
  const tenantConfig = useMemo(
    () => getTenantConfig(tenantId, communityId),
    [tenantId, communityId]
  );
  const claimGrants = tenantConfig.claimGrants;
  const claimFundsEnabled = useClaimGrantsEnabled(claimGrants);

  // Auth state
  const { authenticated, address: connectedAddress, ready, login } = useAuth();

  // Alternate address for checking other wallets
  const [alternateAddress, setAlternateAddress] = useState<`0x${string}` | null>(null);
  const checkAddress = alternateAddress ?? (connectedAddress as `0x${string}` | undefined);
  const isUsingAlternateAddress = alternateAddress !== null;

  // Fetch campaigns
  const {
    campaigns,
    isLoading: isLoadingCampaigns,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = useCampaigns(tenantId, claimGrants);

  // Fetch eligibilities
  const {
    eligibilities,
    isLoading: isLoadingEligibility,
    error: eligibilityError,
    refetch: refetchEligibility,
    progress: eligibilityProgress,
  } = useEligibility(campaigns, checkAddress, tenantId, claimGrants);

  // Fetch claimed statuses
  const {
    claimedStatuses,
    isLoading: isLoadingClaimedStatus,
    error: claimedStatusesError,
    refetch: refetchClaimedStatuses,
  } = useClaimedStatuses(campaigns, checkAddress, claimGrants);

  // Claim transaction (for direct claims)
  const {
    claim,
    isPending: isClaimPending,
    isConfirming: isClaimConfirming,
    claimingCampaignId,
  } = useClaimTransaction(tenantId, claimGrants);

  // Delegated claim (for alternate address claims)
  const {
    requestSignature,
    submitClaim: submitDelegatedClaim,
    step: delegatedClaimStep,
    pendingClaim,
    reset: resetDelegatedClaim,
    activeCampaignId: delegatedActiveCampaignId,
  } = useDelegatedClaim(tenantId, claimGrants);

  // Fetch campaign name mappings from database
  const { data: campaignNameMappings } = useCampaignNameMappings(communityId, claimFundsEnabled);

  const isClaiming = isClaimPending || isClaimConfirming;
  const isDelegatedClaimInProgress =
    delegatedClaimStep === "awaiting_signature" || delegatedClaimStep === "submitting";
  const isAnyClaiming = isClaiming || isDelegatedClaimInProgress;

  // Filter to only show eligible or claimed campaigns
  const displayCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        const isEligible = eligibilities.has(campaign.id);
        const hasClaimedOnChain = claimedStatuses.get(campaign.id) === true;
        const eligibility = eligibilities.get(campaign.id);
        const isCampaignEnded = eligibility?.campaignStatus === "completed";

        if (isCampaignEnded && !hasClaimedOnChain) {
          return false;
        }

        return isEligible || hasClaimedOnChain;
      }),
    [campaigns, eligibilities, claimedStatuses]
  );

  const isLoading =
    isLoadingCampaigns || isLoadingEligibility || (isLoadingClaimedStatus && campaigns.length > 0);

  const handleClaim = useCallback(
    (campaign: ClaimCampaign) => {
      const eligibility = eligibilities.get(campaign.id);
      if (!eligibility) return;
      if (!isAddress(campaign.contractAddress)) return;
      const contractAddress = campaign.contractAddress as `0x${string}`;
      void claim(campaign.id, eligibility, contractAddress);
    },
    [eligibilities, claim]
  );

  const handleRequestSignature = useCallback(
    (campaign: ClaimCampaign) => {
      if (!alternateAddress) return;
      const eligibility = eligibilities.get(campaign.id);
      if (!eligibility) return;
      if (!isAddress(campaign.contractAddress)) return;
      const contractAddress = campaign.contractAddress as `0x${string}`;
      void requestSignature(campaign.id, eligibility, contractAddress, alternateAddress);
    },
    [alternateAddress, eligibilities, requestSignature]
  );

  const handleSubmitDelegatedClaim = useCallback(() => {
    void submitDelegatedClaim();
  }, [submitDelegatedClaim]);

  const handleCheckAlternateAddress = useCallback((address: `0x${string}`) => {
    setAlternateAddress(address);
  }, []);

  const handleResetToConnectedWallet = useCallback(() => {
    setAlternateAddress(null);
    resetDelegatedClaim();
  }, [resetDelegatedClaim]);

  useEffect(() => {
    if (
      alternateAddress &&
      connectedAddress &&
      alternateAddress.toLowerCase() === connectedAddress.toLowerCase()
    ) {
      setAlternateAddress(null);
      resetDelegatedClaim();
    }
  }, [alternateAddress, connectedAddress, resetDelegatedClaim]);

  if (!claimFundsEnabled) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
        <h1 className="text-2xl font-bold">Feature Not Available</h1>
        <p className="text-muted-foreground">Claim funds is not available for this community.</p>
        <Link href={`/community/${communityId}`}>
          <Button>Go Back</Button>
        </Link>
      </section>
    );
  }

  if (!ready) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!authenticated) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
        <h1 className="text-3xl font-bold">Claim Your Funds</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Connect your wallet to view and claim your available tokens.
        </p>
        <Button onClick={() => login()} size="lg" className="mt-4">
          Connect Wallet
        </Button>
      </section>
    );
  }

  if (isLoading) {
    const progressMessage = eligibilityProgress
      ? `Checking eligibility... (${eligibilityProgress.checked}/${eligibilityProgress.total} campaigns)`
      : "Loading claim data...";
    return <LoadingState message={progressMessage} />;
  }

  if (campaignsError) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">{campaignsError.message}</p>
        <Button onClick={() => refetchCampaigns()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </section>
    );
  }

  if (eligibilityError || claimedStatusesError) {
    const message =
      (eligibilityError ?? claimedStatusesError)?.message ?? "Failed to load claim data";
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">{message}</p>
        <Button
          onClick={() => {
            void refetchEligibility();
            void refetchClaimedStatuses();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </section>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Claim Funds</h1>
        {isUsingAlternateAddress && alternateAddress && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground">Showing funds for:</p>
            <Badge variant="secondary" className="font-mono flex items-center gap-1">
              {truncateAddress(alternateAddress)}
              <button
                type="button"
                onClick={handleResetToConnectedWallet}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                aria-label="Reset to connected wallet"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {displayCampaigns.length === 0 ? (
        <EmptyState
          connectedAddress={connectedAddress ?? ""}
          onCheckAddress={handleCheckAlternateAddress}
          isChecking={false}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCampaigns.map((campaign) => {
              const eligibility = eligibilities.get(campaign.id) ?? null;
              const isClaimed = claimedStatuses.get(campaign.id) ?? false;
              const hasPendingSignature = pendingClaim?.campaignId === campaign.id;

              return (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  eligibility={eligibility}
                  isClaimed={isClaimed}
                  onClaim={() => handleClaim(campaign)}
                  alternateAddress={alternateAddress}
                  onRequestSignature={() => handleRequestSignature(campaign)}
                  onSubmitDelegatedClaim={handleSubmitDelegatedClaim}
                  delegatedClaimStep={delegatedClaimStep}
                  hasPendingSignature={hasPendingSignature}
                  claimingCampaignId={claimingCampaignId}
                  delegatedActiveCampaignId={delegatedActiveCampaignId}
                  isAnyClaiming={isAnyClaiming}
                  overrideDisplayName={campaignNameMappings?.get(campaign.id)}
                />
              );
            })}
          </div>
          {!isUsingAlternateAddress && (
            <div className="mt-8">
              <EmptyState
                connectedAddress={connectedAddress ?? ""}
                onCheckAddress={handleCheckAlternateAddress}
                isChecking={false}
                compact
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ClaimFundsClient() {
  return (
    <ClaimFundsErrorBoundary>
      <ClaimFundsContent />
    </ClaimFundsErrorBoundary>
  );
}
