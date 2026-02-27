import type { FC } from "react";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

interface EndorsementCardProps {
  milestone: UnifiedMilestone;
}

export const EndorsementCard: FC<EndorsementCardProps> = ({ milestone }) => {
  if (!milestone.endorsement?.comment) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 w-full px-6 py-6">
      <p className="text-sm text-muted-foreground italic">"{milestone.endorsement.comment}"</p>
    </div>
  );
};
