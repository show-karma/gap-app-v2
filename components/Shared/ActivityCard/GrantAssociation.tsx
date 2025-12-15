import type {
  IGrantUpdate,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Image from "next/image";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { PAGES } from "@/utilities/pages";

// Shared UI component for rendering grant items
interface GrantItemProps {
  href: string;
  title: string;
  communityImage?: string;
  communityName?: string;
  keyPrefix: string;
}

const GrantItem = ({ href, title, communityImage, communityName, keyPrefix }: GrantItemProps) => (
  <ExternalLink
    href={href}
    key={keyPrefix}
    className="flex max-w-max items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1 hover:shadow-sm animation-default"
  >
    {communityImage ? (
      <div className="w-4 h-4 relative overflow-hidden rounded-full">
        <Image src={communityImage} alt={communityName || "Community"} width={16} height={16} />
      </div>
    ) : null}
    <span className="font-medium">{title}</span>
  </ExternalLink>
);

// Props for the flexible grant association component
interface GrantAssociationProps {
  // For updates (existing functionality)
  update?: IProjectUpdate | IGrantUpdate | any;
  index?: number;

  // For milestones (new functionality)
  milestone?: UnifiedMilestone;

  // Styling options
  className?: string;
}

export const GrantAssociation = ({
  update,
  index,
  milestone,
  className = "",
}: GrantAssociationProps) => {
  const containerClass = `flex flex-row w-max flex-wrap gap-2 ${className}`;
  const { project } = useProjectStore();

  // Fetch grants using dedicated hook
  const { grants } = useProjectGrants(project?.uid || "");

  // Handle milestone data
  if (milestone) {
    const { type } = milestone;

    // Only show for grant milestones
    if (type !== "grant") {
      return null;
    }

    const grantMilestone = milestone.source.grantMilestone;
    const grantDetails = grantMilestone?.grant.details as
      | { title?: string; programId?: string }
      | undefined;
    const grantTitle = grantDetails?.title;
    const programId = grantDetails?.programId;
    const communityData = grantMilestone?.grant.community?.details as
      | { name?: string; slug?: string; imageURL?: string }
      | undefined;

    if (!grantTitle && (!milestone.mergedGrants || milestone.mergedGrants.length === 0)) {
      return null;
    }

    return (
      <div className={containerClass}>
        <div className="flex flex-wrap gap-2">
          {milestone.mergedGrants && milestone.mergedGrants.length > 0 ? (
            // Display all merged grants with their images
            [...milestone.mergedGrants]
              .sort((a, b) => {
                const titleA = a.grantTitle || "Untitled Grant";
                const titleB = b.grantTitle || "Untitled Grant";
                return titleA.localeCompare(titleB);
              })
              .map((grant, idx) => (
                <GrantItem
                  key={`${grant.grantUID}-${grant.grantTitle}-${milestone.uid}-${milestone.title}-${idx}`}
                  href={PAGES.COMMUNITY.ALL_GRANTS(communityData?.slug || "", grant.programId)}
                  title={grant.grantTitle || "Untitled Grant"}
                  communityImage={grant.communityImage}
                  communityName={grant.communityName}
                  keyPrefix={`${grant.grantUID}-${grant.grantTitle}-${milestone.uid}-${milestone.title}-${idx}`}
                />
              ))
          ) : grantTitle ? (
            // Single grant display
            <GrantItem
              href={PAGES.COMMUNITY.ALL_GRANTS(communityData?.slug || "", programId)}
              title={grantTitle}
              communityImage={communityData?.imageURL}
              communityName={communityData?.name}
              keyPrefix={`single-grant-${milestone.uid}`}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // Handle update data (existing functionality)
  if (!update || !index) {
    return null;
  }

  // Don't show grant associations for certain types
  if (
    update.type === "ProjectImpact" ||
    update.type === "ProjectMilestone" ||
    update.type === "Milestone"
  ) {
    return null;
  }

  const grant = grants.find((g) => g.uid?.toLowerCase() === update.refUID?.toLowerCase());

  const multipleGrants = grants.filter((g) =>
    (update as IProjectUpdate)?.data?.grants?.some(
      (grantId: string) => grantId.toLowerCase() === g.uid.toLowerCase()
    )
  );

  if (!grant && !multipleGrants.length) return null;

  return (
    <div className={containerClass}>
      {multipleGrants.length ? (
        multipleGrants.map((individualGrant) => (
          <GrantItem
            key={`${individualGrant.uid}-${individualGrant.details?.title}-${update.uid}-${update.title}-${index}`}
            href={PAGES.COMMUNITY.ALL_GRANTS(
              individualGrant.community?.details?.slug || "",
              individualGrant.details?.programId
            )}
            title={individualGrant.details?.title || "Untitled Grant"}
            communityImage={individualGrant.community?.details?.imageURL}
            communityName={individualGrant.community?.details?.name}
            keyPrefix={`${individualGrant.uid}-${individualGrant.details?.title}-${update.uid}-${update.title}-${index}`}
          />
        ))
      ) : grant ? (
        <GrantItem
          href={PAGES.COMMUNITY.ALL_GRANTS(
            grant.community?.details?.slug || grant?.community?.uid || "",
            grant?.details?.programId || ""
          )}
          title={grant?.details?.title || "Untitled Grant"}
          communityImage={grant.community?.details?.imageURL}
          communityName={grant.community?.details?.name}
          keyPrefix={`single-update-grant-${update.uid}-${index}`}
        />
      ) : null}
    </div>
  );
};
