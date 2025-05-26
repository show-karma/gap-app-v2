import Image from "next/image";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import {
  IGrantUpdate,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { UnifiedMilestone } from "@/types/roadmap";

// Shared UI component for rendering grant items
interface GrantItemProps {
  href: string;
  title: string;
  communityImage?: string;
  communityName?: string;
  keyPrefix: string;
}

const GrantItem = ({
  href,
  title,
  communityImage,
  communityName,
  keyPrefix,
}: GrantItemProps) => (
  <ExternalLink
    href={href}
    key={keyPrefix}
    className="flex max-w-max items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1 hover:shadow-sm animation-default"
  >
    {communityImage ? (
      <div className="w-4 h-4 relative overflow-hidden rounded-full">
        <Image
          src={communityImage}
          alt={communityName || "Community"}
          width={16}
          height={16}
        />
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
  const containerClass = `flex flex-col px-5 py-2 w-full flex-wrap gap-2 border-b border-b-gray-300 dark:border-b-zinc-400 ${className}`;
  const { project } = useProjectStore();

  // Handle milestone data
  if (milestone) {
    const { type } = milestone;

    // Only show for grant milestones
    if (type !== "grant") {
      return null;
    }

    const grantMilestone = milestone.source.grantMilestone;
    const grantTitle = grantMilestone?.grant.details?.data.title;
    const programId = grantMilestone?.grant.details?.data.programId;
    const communityData = grantMilestone?.grant.community?.details?.data;

    if (
      !grantTitle &&
      (!milestone.mergedGrants || milestone.mergedGrants.length === 0)
    ) {
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
                  href={PAGES.COMMUNITY.ALL_GRANTS(
                    communityData?.slug || "",
                    grant.programId
                  )}
                  title={grant.grantTitle || "Untitled Grant"}
                  communityImage={grant.communityImage}
                  communityName={grant.communityName}
                  keyPrefix={`${grant.grantUID}-${grant.grantTitle}-${milestone.uid}-${milestone.title}-${idx}`}
                />
              ))
          ) : grantTitle ? (
            // Single grant display
            <GrantItem
              href={PAGES.COMMUNITY.ALL_GRANTS(
                communityData?.slug || "",
                programId
              )}
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

  const grant = project?.grants?.find(
    (grant) => grant.uid?.toLowerCase() === update.refUID?.toLowerCase()
  );

  const multipleGrants = project?.grants.filter((grant) =>
    (update as IProjectUpdate)?.data?.grants?.some(
      (grantId: string) => grantId.toLowerCase() === grant.uid.toLowerCase()
    )
  );

  if (!grant && !multipleGrants?.length) return null;

  return (
    <div className={containerClass}>
      {multipleGrants?.length ? (
        multipleGrants.map((individualGrant) => (
          <GrantItem
            key={`${individualGrant.uid}-${individualGrant.details?.data.title}-${update.uid}-${update.data?.title}-${index}`}
            href={PAGES.COMMUNITY.ALL_GRANTS(
              individualGrant.community?.details?.data?.slug || "",
              individualGrant.details?.data.programId
            )}
            title={individualGrant.details?.data.title || "Untitled Grant"}
            communityImage={individualGrant.community?.details?.data?.imageURL}
            communityName={individualGrant.community?.details?.data?.name}
            keyPrefix={`${individualGrant.uid}-${individualGrant.details?.data.title}-${update.uid}-${update.data?.title}-${index}`}
          />
        ))
      ) : grant ? (
        <GrantItem
          href={PAGES.COMMUNITY.ALL_GRANTS(
            grant.community?.details?.data?.slug || grant?.community?.uid || "",
            grant?.details?.data.programId || ""
          )}
          title={grant?.details?.data.title || "Untitled Grant"}
          communityImage={grant.community?.details?.data?.imageURL}
          communityName={grant.community?.details?.data?.name}
          keyPrefix={`single-update-grant-${update.uid}-${index}`}
        />
      ) : null}
    </div>
  );
};
