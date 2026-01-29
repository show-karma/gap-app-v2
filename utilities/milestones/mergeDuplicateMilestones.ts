import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Merges duplicate milestones based on content.
 *
 * Milestones of type "update", "impact", "activity", "grant_update", "project", and "milestone"
 * are kept as unique entries. Grant milestones with matching title, description, and dates
 * are merged together, with their grant information consolidated into `mergedGrants`.
 *
 * @param milestones - Array of unified milestones to process
 * @returns Array of milestones with duplicates merged
 */
export function mergeDuplicateMilestones(milestones: UnifiedMilestone[]): UnifiedMilestone[] {
  const mergedMap = new Map<string, UnifiedMilestone>();

  milestones.forEach((milestone) => {
    // Skip updates, impacts, activities from merging as they're unique
    if (
      milestone.type === "update" ||
      milestone.type === "impact" ||
      milestone.type === "activity" ||
      milestone.type === "grant_update"
    ) {
      mergedMap.set(milestone.uid, milestone);
      return;
    }

    // Skip project milestones from merging (they're unique by nature)
    if (milestone.type === "project" || milestone.type === "milestone") {
      mergedMap.set(milestone.uid, {
        ...milestone,
        uid: milestone.uid || "",
        chainID: milestone.chainID || 0,
        refUID: milestone.source.projectMilestone?.uid || milestone.refUID || "",
      });
      return;
    }

    // Create a unique key based on title, description, and dates
    const startDate = milestone.startsAt;
    const endDate = milestone.endsAt;

    const key = `${milestone.title}|${milestone.description || ""}|${startDate || ""}|${endDate || ""}`;

    if (mergedMap.has(key)) {
      // Milestone exists, add this grant to the merged list
      const existingMilestone = mergedMap.get(key)!;

      if (!existingMilestone.mergedGrants) {
        // Initialize mergedGrants if this is the first duplicate
        const firstGrant = existingMilestone.source.grantMilestone;
        const firstGrantDetails = firstGrant?.grant.details as
          | { title?: string; programId?: string }
          | undefined;
        const firstCommunityDetails = firstGrant?.grant.community?.details as
          | { name?: string; imageURL?: string }
          | undefined;
        existingMilestone.mergedGrants = [
          {
            grantUID: firstGrant?.grant.uid || "",
            grantTitle: firstGrantDetails?.title,
            communityName: firstCommunityDetails?.name,
            communityImage: firstCommunityDetails?.imageURL,
            chainID: firstGrant?.grant.chainID || 0,
            milestoneUID: firstGrant?.milestone.uid || "",
            programId: firstGrantDetails?.programId,
          },
        ];
      }

      // Add the current grant to the merged list
      const currentGrantDetails = milestone.source.grantMilestone?.grant.details as
        | { title?: string; programId?: string }
        | undefined;
      const currentCommunityDetails = milestone.source.grantMilestone?.grant.community?.details as
        | { name?: string; imageURL?: string }
        | undefined;
      existingMilestone.mergedGrants.push({
        grantUID: milestone.source.grantMilestone?.grant.uid || "",
        grantTitle: currentGrantDetails?.title,
        communityName: currentCommunityDetails?.name,
        communityImage: currentCommunityDetails?.imageURL,
        chainID: milestone.source.grantMilestone?.grant.chainID || 0,
        milestoneUID: milestone.source.grantMilestone?.milestone.uid || "",
        programId: currentGrantDetails?.programId,
      });

      // Sort the merged grants alphabetically
      existingMilestone.mergedGrants.sort((a, b) => {
        const titleA = a.grantTitle || "Untitled Grant";
        const titleB = b.grantTitle || "Untitled Grant";
        return titleA.localeCompare(titleB);
      });

      mergedMap.set(key, existingMilestone);
    } else {
      // Add as new milestone with required properties
      mergedMap.set(key, {
        ...milestone,
        uid: milestone.uid || "",
        chainID: milestone.source.grantMilestone?.grant.chainID || 0,
        refUID: milestone.source.grantMilestone?.grant.uid || "",
      });
    }
  });

  return Array.from(mergedMap.values());
}
