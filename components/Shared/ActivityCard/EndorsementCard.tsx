import type { FC } from "react";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

interface EndorsementCardProps {
  milestone: UnifiedMilestone;
}

export const EndorsementCard: FC<EndorsementCardProps> = ({ milestone }) => {
  const comment = milestone.endorsement?.comment;

  return (
    <div className="flex flex-col gap-3 w-full px-6 py-6">
      {comment ? (
        <p className="text-sm text-muted-foreground italic">"{comment}"</p>
      ) : (
        <p className="text-sm text-muted-foreground">Endorsed this project</p>
      )}
    </div>
  );
};
