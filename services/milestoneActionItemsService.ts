import type {
  FollowUpChannel,
  FollowUpMember,
  FollowUpTarget,
  FollowUpTargetInput,
  FollowUpWorkspace,
} from "@/types/follow-up-target";
import type {
  ICommunityActionItemPage,
  IMilestoneActionItem,
  IMilestoneTimeline,
  IQueueItemSummary,
} from "@/types/funding-platform";
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

export async function getApplicationActionItems(
  communityId: string,
  referenceNumber: string
): Promise<IMilestoneActionItem[]> {
  const data = await api.get<{ items: IMilestoneActionItem[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.APPLICATION_LIST(communityId, referenceNumber)
  );

  return data?.items ?? [];
}

export async function getQueueItemSummary(
  communityId: string,
  target: { kind: "milestone" | "application"; id: string },
  options: { refresh?: boolean } = {}
): Promise<IQueueItemSummary> {
  const qs = options.refresh ? "refresh=true" : undefined;
  const url =
    target.kind === "application"
      ? INDEXER.V2.MILESTONE_ACTION_ITEMS.APPLICATION_SUMMARY(communityId, target.id, qs)
      : INDEXER.V2.MILESTONE_ACTION_ITEMS.MILESTONE_SUMMARY(communityId, target.id, qs);
  const data = await api.get<IQueueItemSummary>(url);
  if (!data) throw new Error("Failed to fetch queue item summary");
  return data;
}

export interface CommunityActionItemFilters {
  page: number;
  status: "pending" | "completed" | "all";
  programId?: string | null;
  projectUid?: string | null;
  limit?: number;
}

export async function getCommunityActionItems(
  communityId: string,
  filters: CommunityActionItemFilters
): Promise<ICommunityActionItemPage> {
  const query = new URLSearchParams({ page: String(filters.page), status: filters.status });
  if (filters.programId) query.set("programId", filters.programId);
  if (filters.projectUid) query.set("projectUid", filters.projectUid);
  if (filters.limit) query.set("limit", String(filters.limit));
  const data = await api.get<ICommunityActionItemPage>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.COMMUNITY_LIST(communityId, query.toString())
  );
  if (!data) throw new Error("Failed to fetch community action items");
  return data;
}

export interface CreateMilestoneActionItemInput {
  content: string;
  /** ISO date — required; every action item must be scheduled. */
  followUpAt: string;
  autoFollowUp: boolean;
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

export async function createApplicationActionItem(
  communityId: string,
  referenceNumber: string,
  input: CreateMilestoneActionItemInput
): Promise<IMilestoneActionItem> {
  const data = await api.post<IMilestoneActionItem>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.APPLICATION_CREATE(communityId, referenceNumber),
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
  autoFollowUp?: boolean;
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

export async function suggestFollowUpTargets(
  communityId: string,
  id: string
): Promise<FollowUpTarget[]> {
  const data = await api.post<{ targets: FollowUpTarget[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.FOLLOW_UP_SUGGEST(communityId, id)
  );
  if (!data) throw new Error("Failed to suggest follow-up targets");
  return data.targets;
}

export async function setFollowUpTargets(
  communityId: string,
  id: string,
  targets: FollowUpTargetInput[]
): Promise<FollowUpTarget[]> {
  const data = await api.put<{ targets: FollowUpTarget[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.FOLLOW_UP_TARGETS(communityId, id),
    { targets }
  );
  if (!data) throw new Error("Failed to save follow-up targets");
  return data.targets;
}

export async function getFollowUpWorkspaces(
  communityId: string,
  id: string
): Promise<FollowUpWorkspace[]> {
  const data = await api.get<{ workspaces: FollowUpWorkspace[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.FOLLOW_UP_WORKSPACES(communityId, id)
  );
  if (!data) throw new Error("Failed to fetch Slack workspaces");
  return data.workspaces;
}

export async function getFollowUpChannels(
  communityId: string,
  id: string,
  teamId: string
): Promise<FollowUpChannel[]> {
  const query = new URLSearchParams({ teamId });
  const data = await api.get<{ channels: FollowUpChannel[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.FOLLOW_UP_CHANNELS(communityId, id, query.toString())
  );
  if (!data) throw new Error("Failed to fetch Slack channels");
  return data.channels;
}

export async function searchFollowUpMembers(
  communityId: string,
  id: string,
  teamId: string,
  q: string
): Promise<FollowUpMember[]> {
  const query = new URLSearchParams({ teamId, q });
  const data = await api.get<{ members: FollowUpMember[] }>(
    INDEXER.V2.MILESTONE_ACTION_ITEMS.FOLLOW_UP_MEMBERS(communityId, id, query.toString())
  );
  if (!data) throw new Error("Failed to search Slack members");
  return data.members;
}
