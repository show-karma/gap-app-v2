import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button } from "@/components/ui/button";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { formatGrantAmount } from "@/utilities/formatGrantAmount";
import { PAGES } from "@/utilities/pages";
import { PostedInfoTooltip } from "./PostedInfoTooltip";

interface FundingReceivedCardProps {
  milestone: UnifiedMilestone;
  projectId?: string;
}

function getHeadingText(programType?: string): string {
  if (programType === "hackathon") return "Participated in hackathon";
  return "Grant received from";
}

function getButtonLabel(programType?: string): string {
  if (programType === "hackathon") return "View hackathon";
  return "View grant";
}

export const FundingReceivedCard: FC<FundingReceivedCardProps> = ({ milestone, projectId }) => {
  if (!milestone.grantReceived) {
    return null;
  }

  const { amount, communityName, communityImage, grantUID, programType } = milestone.grantReceived;
  const formattedAmount = formatGrantAmount(amount);
  const isHackathon = programType === "hackathon";
  const headingText = getHeadingText(programType);
  const buttonLabel = getButtonLabel(programType);

  return (
    <div className="flex flex-col gap-4 w-full px-6 py-6">
      <div className="flex flex-row items-start justify-between gap-3">
        {/* Amount */}
        {formattedAmount ? (
          <p className="text-xl font-semibold text-foreground tabular-nums">{formattedAmount}</p>
        ) : (
          <span />
        )}
        <PostedInfoTooltip date={milestone.createdAt} />
      </div>

      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        <span className="text-xl font-semibold text-foreground">{headingText}</span>
        {!isHackathon && (
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
        )}
        {isHackathon && communityName && (
          <div className="flex flex-row items-center gap-2">
            <ProfilePicture
              imageURL={communityImage}
              name={communityName}
              size="24"
              className="h-6 w-6 min-w-6 min-h-6 rounded-full"
              alt={communityName}
            />
            <span className="text-xl font-semibold text-foreground">{communityName}</span>
          </div>
        )}
      </div>

      {/* View grant/hackathon button */}
      {projectId && grantUID && (
        <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
          <Link href={PAGES.PROJECT.GRANT(projectId, grantUID)}>
            {buttonLabel} <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
};
