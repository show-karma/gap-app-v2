"use client";

import { getEffectiveKycStatus, KycStatusBadge } from "@/components/KycStatusIcon";
import { useKycConfig, useKycStatus } from "@/hooks/useKycStatus";
import { kycStatusDescriptions } from "@/src/features/kyc/lib/status-config";

interface ApplicationKycCardProps {
  communityId: string;
  referenceNumber: string;
}

/**
 * Applicant-facing KYC/KYB verification card for the application sidebar.
 * Rendered only for the applicant and reviewers/admins (the parent gates on
 * `canViewApplicant`). Status is resolved by application reference, so a Batch-3
 * applicant who inherited verification via their Karma Profile is shown as
 * verified here too.
 */
export function ApplicationKycCard({ communityId, referenceNumber }: ApplicationKycCardProps) {
  const { isEnabled, isLoading: isConfigLoading } = useKycConfig(communityId);
  const {
    status,
    isLoading: isStatusLoading,
    isError,
  } = useKycStatus(referenceNumber, communityId, { enabled: isEnabled });

  // KYC/KYB is not configured for this community — the card has nothing to show.
  if (!isConfigLoading && !isEnabled) {
    return null;
  }

  const isLoading = isConfigLoading || (isEnabled && isStatusLoading);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Identity verification
      </p>

      {isLoading ? (
        <div className="h-6 w-44 animate-pulse rounded-full bg-muted" aria-hidden />
      ) : isError ? (
        <p className="text-[13px] text-muted-foreground">
          Unable to load verification status. Please try again later.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <KycStatusBadge status={status ?? null} className="w-fit" />
          <p className="text-xs text-muted-foreground">
            {kycStatusDescriptions[getEffectiveKycStatus(status ?? null)]}
          </p>
        </div>
      )}
    </div>
  );
}
