import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  type VerificationRecord,
  VerifiedBadge,
} from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerifiedBadge";
import { VerifyMilestoneUpdateDialog } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerifyMilestoneUpdateDialog";
import type { GrantMilestone, Verification } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

interface MilestoneVerificationSectionProps {
  milestone: GrantMilestone | UnifiedMilestone;
  title: string;
  isVerified?: boolean;
  onVerified?: () => void;
}

export const MilestoneVerificationSection: FC<MilestoneVerificationSectionProps> = ({
  milestone,
  title,
  isVerified: isVerifiedProp,
  onVerified,
}) => {
  // V2: verified is an array of verifications
  const getInitialVerifiedState = (): boolean => {
    if (isVerifiedProp !== undefined) {
      return isVerifiedProp;
    }

    // For GrantMilestone with array verified
    if ("verified" in milestone && Array.isArray(milestone.verified)) {
      return milestone.verified.length > 0;
    }

    // For UnifiedMilestone
    if ("source" in milestone) {
      const grantMilestone = milestone.source.grantMilestone;
      if (grantMilestone?.milestone.verified && Array.isArray(grantMilestone.milestone.verified)) {
        return grantMilestone.milestone.verified.length > 0;
      }
    }

    return false;
  };

  const [isVerified, setIsVerified] = useState<boolean>(getInitialVerifiedState());

  const markAsVerified = useCallback(() => {
    setIsVerified(true);
    onVerified?.();
  }, [onVerified]);

  // Sync state when prop changes
  useEffect(() => {
    if (isVerifiedProp !== undefined) {
      setIsVerified(isVerifiedProp);
    }
  }, [isVerifiedProp]);

  // Get milestone for dialog
  const getMilestoneForDialog = (): GrantMilestone | null => {
    // For GrantMilestone (has refUID which UnifiedMilestone doesn't have at top level)
    if ("refUID" in milestone && typeof (milestone as GrantMilestone).refUID === "string") {
      return milestone as GrantMilestone;
    }

    // For UnifiedMilestone
    if ("source" in milestone && (milestone as UnifiedMilestone).source?.grantMilestone) {
      return (milestone as UnifiedMilestone).source.grantMilestone?.milestone || null;
    }

    return null;
  };

  const milestoneForDialog = getMilestoneForDialog();

  // Extract V2 verifications and transform to the shape expected by VerifiedBadge/VerificationsDialog
  const verifications = useMemo((): VerificationRecord[] | undefined => {
    let raw: Verification[] = [];
    if ("verified" in milestone && Array.isArray(milestone.verified)) {
      raw = milestone.verified;
    } else if ("source" in milestone) {
      const grantMilestone = (milestone as UnifiedMilestone).source?.grantMilestone;
      if (grantMilestone?.milestone.verified && Array.isArray(grantMilestone.milestone.verified)) {
        raw = grantMilestone.milestone.verified;
      }
    }
    if (raw.length === 0) return undefined;
    // Transform to match legacy shape: { attester, createdAt, data: { reason } }
    return raw.map((v) => ({
      attester: v.attester as `0x${string}`,
      createdAt: v.createdAt,
      data: { reason: v.reason },
    }));
  }, [milestone]);

  return (
    <div className="flex flex-row gap-4 items-center flex-wrap w-max max-w-full">
      {isVerified && (
        <VerifiedBadge isVerified={isVerified} verifications={verifications} title={title} />
      )}
      {milestoneForDialog && (
        <VerifyMilestoneUpdateDialog
          milestone={milestoneForDialog}
          onVerified={markAsVerified}
          isVerified={isVerified}
        />
      )}
    </div>
  );
};
