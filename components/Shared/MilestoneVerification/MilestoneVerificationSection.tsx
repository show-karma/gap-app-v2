import type {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { VerifiedBadge } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerifiedBadge";
import { VerifyMilestoneUpdateDialog } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerifyMilestoneUpdateDialog";
import type { UnifiedMilestone } from "@/types/roadmap";

interface MilestoneVerificationSectionProps {
  milestone: IMilestoneResponse | UnifiedMilestone;
  title: string;
  verifiedMilestones?: IMilestoneCompleted[];
  onVerificationAdded?: (newVerified: IMilestoneCompleted) => void;
}

export const MilestoneVerificationSection: FC<MilestoneVerificationSectionProps> = ({
  milestone,
  title,
  verifiedMilestones: initialVerifiedMilestones,
  onVerificationAdded,
}) => {
  // Compute initial verified milestones from props
  const computedVerifiedMilestones = useMemo(() => {
    if (initialVerifiedMilestones) {
      return initialVerifiedMilestones;
    }

    // For IMilestoneResponse
    if ("verified" in milestone) {
      return milestone.verified || [];
    }

    // For UnifiedMilestone
    if ("source" in milestone) {
      const grantMilestone = milestone.source.grantMilestone;
      if (grantMilestone) {
        return grantMilestone.milestone.verified || [];
      }
    }

    return [];
  }, [initialVerifiedMilestones, milestone]);

  const [verifiedMilestones, setVerifiedMilestones] = useState<IMilestoneCompleted[]>(
    computedVerifiedMilestones
  );

  const addVerifiedMilestone = useCallback(
    (newVerified: IMilestoneCompleted) => {
      setVerifiedMilestones((prev) => [...prev, newVerified]);
      onVerificationAdded?.(newVerified);
    },
    [onVerificationAdded]
  );

  // Sync state when computed value changes
  useEffect(() => {
    setVerifiedMilestones(computedVerifiedMilestones);
  }, [computedVerifiedMilestones]);

  // Convert UnifiedMilestone to IMilestoneResponse format for VerifyMilestoneUpdateDialog
  const getMilestoneForDialog = (): IMilestoneResponse | null => {
    if ("verified" in milestone) {
      return milestone as IMilestoneResponse;
    }

    if ("source" in milestone) {
      const grantMilestone = milestone.source.grantMilestone;
      if (grantMilestone) {
        return grantMilestone.milestone;
      }
    }

    return null;
  };

  const milestoneForDialog = getMilestoneForDialog();

  return (
    <div className="flex flex-row gap-4 items-center flex-wrap w-max max-w-full">
      {verifiedMilestones.length > 0 && (
        <VerifiedBadge verifications={verifiedMilestones} title={title} />
      )}
      {milestoneForDialog && (
        <VerifyMilestoneUpdateDialog
          milestone={milestoneForDialog}
          addVerifiedMilestone={addVerifiedMilestone}
        />
      )}
    </div>
  );
};
