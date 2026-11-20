import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { FOLLOW_UP_ROUTES } from "@/utilities/indexer-follow-up";

export type FollowUpLogKind =
  | "event"
  | "step"
  | "message_queued"
  | "timer_set"
  | "timer_cancelled"
  | "verdict_submitted"
  | "verdict_published"
  | "verdict_dismissed"
  | "escalated"
  | "stage_changed";

export interface FollowUpLogEntry {
  at: string;
  kind: FollowUpLogKind | string;
  text: string;
}

export interface FollowUpCaseSummary {
  milestoneUid: string;
  milestoneTitle: string | null;
  referenceNumber: string | null;
  stage: string;
  needsOperator: boolean;
  closedAt: string | null;
  updatedAt: string;
  lastEntry: FollowUpLogEntry | null;
  entryCount: number;
}

export interface FollowUpCaseDetail extends FollowUpCaseSummary {
  log: FollowUpLogEntry[];
}

export interface FollowUpCasesResult {
  items: FollowUpCaseSummary[];
  total: number;
  page: number;
  limit: number;
  forbidden: boolean;
}

const isDenied = (error: unknown) =>
  error instanceof HttpError && (error.status === 403 || error.status === 401);

export async function fetchFollowUpCases(
  programId: string,
  page: number,
  limit: number
): Promise<FollowUpCasesResult> {
  try {
    const data = await api.get<Omit<FollowUpCasesResult, "forbidden">>(
      FOLLOW_UP_ROUTES.CASES(programId, page, limit)
    );
    return {
      items: data?.items ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
      forbidden: false,
    };
  } catch (error) {
    if (isDenied(error)) return { items: [], total: 0, page, limit, forbidden: true };
    throw error;
  }
}

export async function fetchFollowUpCase(
  programId: string,
  milestoneUid: string
): Promise<FollowUpCaseDetail | null> {
  try {
    return await api.get<FollowUpCaseDetail>(FOLLOW_UP_ROUTES.CASE(programId, milestoneUid));
  } catch (error) {
    if (isDenied(error)) return null;
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export interface FollowUpPlaybook {
  programId: string;
  version: number;
  content: string;
  createdBy: string | null;
  createdAt: string | null;
  isDefault: boolean;
}

export interface FollowUpPlaybookVersion {
  version: number;
  createdBy: string;
  createdAt: string;
}

export interface FollowUpPlaybookResult {
  playbook: FollowUpPlaybook;
  versions: FollowUpPlaybookVersion[];
}

export async function fetchFollowUpPlaybook(programId: string): Promise<FollowUpPlaybookResult> {
  return api.get<FollowUpPlaybookResult>(FOLLOW_UP_ROUTES.PLAYBOOK(programId));
}

export async function saveFollowUpPlaybook(
  programId: string,
  content: string
): Promise<FollowUpPlaybook> {
  const data = await api.put<{ playbook: FollowUpPlaybook }>(FOLLOW_UP_ROUTES.PLAYBOOK(programId), {
    content,
  });
  return data.playbook;
}
