import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button } from "@/components/ui/button";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { formatGrantAmount } from "@/utilities/formatGrantAmount";

interface FundingReceivedCardProps {
  milestone: UnifiedMilestone;
  projectId?: string;
}

export const FundingReceivedCard: FC<FundingReceivedCardProps> = ({ milestone, projectId }) => {
  if (!milestone.grantReceived) {
    return null;
  }

  const { amount, communityName, communityImage, grantUID } = milestone.grantReceived;
  const formattedAmount = formatGrantAmount(amount);

  return (
    <div className="flex flex-col gap-4 w-full px-6 py-6">
      {/* Amount */}
      {formattedAmount && (
        <p className="text-xl font-semibold text-foreground tabular-nums">{formattedAmount}</p>
      )}

      {/* Heading: "Funds received from [avatar] Community name" */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        <span className="text-xl font-semibold text-foreground">Funds received from</span>
        <div className="flex flex-row items-center gap-2">
          <ProfilePicture
            imageURL={communityImage}
            name={communityName || "Community"}
            size="24"
            className="h-6 w-6 min-w-6 min-h-6 rounded-full"
            alt={communityName || "Community"}
          />
          <span className="text-xl font-semibold text-foreground">
            {communityName || "Community"}
          </span>
        </div>
      </div>

      {/* View grant button */}
      {projectId && grantUID && (
        <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
          <Link href={`/project/${projectId}/funding/${grantUID}`}>
            View grant <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
};
