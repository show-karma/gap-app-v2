import type { IMilestoneActionItem, IMilestoneTimeline } from "@/types/funding-platform";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Admin milestone queue detail surfaces. Every endpoint is community-admin
 * gated on the indexer — these calls will 403 for a reviewer, which is why the
 * hooks gate them on `useCommunityAdminAccess` before firing.
 */

export async function getMilestoneTimeline(
  communityId: string,
  milestoneUid: string
): Promise<IMilestoneTimeline> {
  const data = await api.get<IMilestoneTimeline>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.TIMELINE(communityId, milestoneUid)
  );

  if (!data) {
    throw new Error("Failed to fetch milestone timeline");
  }

  return data;
}

export async function getMilestoneActionItems(
  communityId: string,
  milestoneUid: string
): Promise<IMilestoneActionItem[]> {
  const data = await api.get<{ items: IMilestoneActionItem[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.LIST(communityId, milestoneUid)
  );

  return data?.items ?? [];
}

export interface CreateMilestoneActionItemInput {
  content: string;
  /** ISO date, or null for no follow-up. */
  followUpAt?: string | null;
}

export async function createMilestoneActionItem(
  communityId: string,
  milestoneUid: string,
  input: CreateMilestoneActionItemInput
): Promise<IMilestoneActionItem> {
  const data = await api.post<IMilestoneActionItem>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.CREATE(communityId, milestoneUid),
    input
  );

  if (!data) {
    throw new Error("Failed to create action item");
  }

  return data;
}

export interface UpdateMilestoneActionItemInput {
  content?: string;
  /** Omit to leave unchanged; null clears the follow-up date. */
  followUpAt?: string | null;
  /** The server stamps the completion timestamp — never send one. */
  completed?: boolean;
}

export async function updateMilestoneActionItem(
  communityId: string,
  id: string,
  input: UpdateMilestoneActionItemInput
): Promise<IMilestoneActionItem> {
  const data = await api.patch<IMilestoneActionItem>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.UPDATE(communityId, id),
    input
  );

  if (!data) {
    throw new Error("Failed to update action item");
  }

  return data;
}

export async function deleteMilestoneActionItem(communityId: string, id: string): Promise<void> {
  await api.delete(INDEXER.V2.MILESTONE_ACTION_ITEMS.DELETE(communityId, id));
}
