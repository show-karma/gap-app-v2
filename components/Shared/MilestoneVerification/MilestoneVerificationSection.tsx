import { type FC, useEffect, useState } from "react";
import {
  type VerificationRecord,
  VerifiedBadge,
} from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerifiedBadge";
import type { GrantMilestone } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

interface MilestoneVerificationSectionProps {
  milestone: GrantMilestone | UnifiedMilestone;
  title: string;
  isVerified?: boolean;
  verifications?: VerificationRecord[];
  onVerified?: () => void;
  programId?: string;
  communityUID?: string;
}

export const MilestoneVerificationSection: FC<MilestoneVerificationSectionProps> = ({
  milestone,
  title,
  isVerified: isVerifiedProp,
  verifications,
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

  // Sync state when prop changes
  useEffect(() => {
    if (isVerifiedProp !== undefined) {
      setIsVerified(isVerifiedProp);
    }
  }, [isVerifiedProp]);

  if (!isVerified) return null;

  return (
    <div className="flex flex-row gap-4 items-center flex-wrap w-max max-w-full">
      <VerifiedBadge
        verifications={verifications && verifications.length > 0 ? verifications : undefined}
        isVerified={!(verifications && verifications.length > 0) ? isVerified : undefined}
        title={title}
      />
    </div>
  );
};
