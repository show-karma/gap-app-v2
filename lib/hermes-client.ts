import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

// Internal team-role identifiers. Four user-facing employees total — small
// enough for a 2-person ED to manage. ED leads the list and acts as the
// catch-all for cross-role or strategic asks that don't fit a specialist.
//
// The internal slug for ED stays `orchestrator` because Hermes' kanban
// dispatcher and the bundled `kanban-orchestrator` skill key off that
// profile name. The "ED" framing is UI-only.
export const TEAM_ROLES = ["orchestrator", "fundraiser", "communications", "operations"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** All user-facing roles in display order. Alias for TEAM_ROLES kept for consumers. */
export const VISIBLE_TEAM_ROLES: TeamRole[] = [...TEAM_ROLES];

// Product-language labels — never leak Hermes terms ("profile", "SOUL") to
// the UI copy. Renderers use these.
export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  orchestrator: "ED",
  fundraiser: "Fundraiser",
  communications: "Communications",
  operations: "Operations",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  orchestrator: "Plans work across the team and handles anything that doesn't fit a specialist.",
  fundraiser: "Finds funders, qualifies prospects, and drafts LOIs, proposals, and grant reports.",
  communications: "Donor communications, newsletters, social content, and impact stories.",
  operations: "Process support, finance support, vendor coordination, and tech upkeep.",
};

// Longer titles shown beside the short role label on the Team grid card.
export const TEAM_ROLE_LONG_LABELS: Record<TeamRole, string> = {
  orchestrator: "Executive Director",
  fundraiser: "Fundraising Lead",
  communications: "Communications Lead",
  operations: "Operations Lead",
};

export interface HermesOrgResponse {
  id: string;
  slug: string;
  communityId: string | null;
  status: "provisioning" | "active" | "suspended" | "failed";
  statusReason: string | null;
  provisionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HermesProfileResponse {
  name: string;
  path?: string;
  is_default?: boolean;
  model?: string;
  skill_count?: number;
}

export interface ProvisionOrgInput {
  slug: string;
  communityId?: string | null;
  containerUrl: string;
  sessionToken: string;
}

export interface UpdateAboutInput {
  slug: string;
  role: TeamRole;
  content: string;
}

export type OrgBrainTopic = "mission" | "brand";

export interface OrgBrainResponse<TData = Record<string, unknown>> {
  topic: OrgBrainTopic;
  exists: boolean;
  data: TData;
}

export interface MissionData {
  legalName?: string;
  ein?: string;
  missionStatement?: string;
  website?: string;
  theoryOfChange?: string;
  targetPopulation?: string;
  geographicScope?: string;
  yearFounded?: string;
  fiscalSponsor?: string;
  leadership?: Array<{ name: string; role: string }>;
}

export interface BrandData {
  voice?: string;
  tones?: {
    donor_email?: string;
    proposal?: string;
    social?: string;
  };
  boilerplates?: Array<{ name: string; body: string }>;
  wordDos?: string[];
  wordDonts?: string[];
  taglines?: string[];
  sensitiveTopics?: string;
}

export type WorkTaskStatus = "queued" | "working" | "blocked" | "done";

export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  status: WorkTaskStatus;
  assignee?: string;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Activity feed for "what's the worker actually doing?" — populated only
// on the single-task endpoint, not the list. currentRun is null if Hermes
// never dispatched the task (typically: still in queued/triage).
export interface WorkActivityEvent {
  id: number;
  runId: number | null;
  kind: string;
  note: string | null;
  createdAt: number;
}

export interface WorkActivity {
  currentRun: {
    id: number;
    profile: string | null;
    status: string;
    workerPid: number | null;
    startedAt: number | null;
    endedAt: number | null;
    lastHeartbeatAt: number | null;
    claimExpires: number | null;
    consecutiveFailures: number;
    lastError: string | null;
  } | null;
  latestHeartbeatNote: string | null;
  recentEvents: WorkActivityEvent[];
  runCount: number;
}

export interface HermesSkillSummary {
  id: string;
  namespace: string;
  name: string;
  description: string | null;
  version: string | null;
  tags: string[];
}

export interface HermesSkillInstallResult {
  installed: boolean;
  skill: HermesSkillSummary | null;
}

export interface HermesUploadSummary {
  sha256: string;
  filename: string;
  mime: string | null;
  size: number;
}

export interface HermesSkillUninstallResult {
  removed: boolean;
  id: string;
}

export interface WorkTaskComment {
  id: string;
  taskId: string;
  author?: string;
  body: string;
  createdAt: string;
}

// Single instance reused across hooks. The shared API client handles auth
// (Bearer token) and 401 refresh — see utilities/auth/api-client.ts.
const api = createAuthenticatedApiClient();

export const hermesClient = {
  async getOrg(slug: string): Promise<HermesOrgResponse> {
    const { data } = await api.get<HermesOrgResponse>(INDEXER.HERMES.ORG(slug));
    return data;
  },

  async listProfiles(slug: string): Promise<HermesProfileResponse[]> {
    const { data } = await api.get<{ profiles: HermesProfileResponse[] }>(
      INDEXER.HERMES.PROFILES(slug)
    );
    return data.profiles;
  },

  async getAbout(slug: string, role: TeamRole): Promise<string> {
    const { data } = await api.get<{ content: string }>(INDEXER.HERMES.SOUL(slug, role));
    return data.content;
  },

  async updateAbout(input: UpdateAboutInput): Promise<void> {
    await api.put(INDEXER.HERMES.SOUL(input.slug, input.role), {
      content: input.content,
    });
  },

  async getOrgBrain<TData = Record<string, unknown>>(
    slug: string,
    topic: OrgBrainTopic
  ): Promise<OrgBrainResponse<TData>> {
    const { data } = await api.get<OrgBrainResponse<TData>>(INDEXER.HERMES.BRAIN(slug, topic));
    return data;
  },

  async putOrgBrain(
    slug: string,
    topic: OrgBrainTopic,
    payload: MissionData | BrandData
  ): Promise<void> {
    await api.put(INDEXER.HERMES.BRAIN(slug, topic), payload);
  },

  async listWorkTasks(slug: string): Promise<WorkTask[]> {
    const { data } = await api.get<{ tasks: WorkTask[] }>(INDEXER.HERMES.WORK_TASKS(slug));
    return data.tasks;
  },

  async getWorkTask(slug: string, taskId: string): Promise<WorkTask & { activity?: WorkActivity }> {
    const { data } = await api.get<WorkTask & { activity?: WorkActivity }>(
      INDEXER.HERMES.WORK_TASK(slug, taskId)
    );
    return data;
  },

  async createWorkTask(
    slug: string,
    input: { title: string; description?: string; assignee?: string }
  ): Promise<WorkTask> {
    const { data } = await api.post<WorkTask>(INDEXER.HERMES.WORK_TASKS(slug), input);
    return data;
  },

  async updateWorkTaskStatus(slug: string, taskId: string, status: WorkTaskStatus): Promise<void> {
    await api.put(INDEXER.HERMES.WORK_TASK_STATUS(slug, taskId), { status });
  },

  async listWorkTaskComments(slug: string, taskId: string): Promise<WorkTaskComment[]> {
    const { data } = await api.get<{ comments: WorkTaskComment[] }>(
      INDEXER.HERMES.WORK_TASK_COMMENTS(slug, taskId)
    );
    return data.comments;
  },

  async startChat(
    slug: string,
    role: TeamRole,
    message: string,
    previousResponseId?: string
  ): Promise<{ runId: string; sessionId: string }> {
    const { data } = await api.post<{ runId: string; sessionId: string }>(
      INDEXER.HERMES.CHAT_START(slug, role),
      { message, previousResponseId }
    );
    return data;
  },

  async stopChatRun(slug: string, role: TeamRole, runId: string): Promise<void> {
    await api.post(INDEXER.HERMES.CHAT_RUN_STOP(slug, role, runId), {});
  },

  async addWorkTaskComment(slug: string, taskId: string, body: string): Promise<WorkTaskComment> {
    const { data } = await api.post<WorkTaskComment>(
      INDEXER.HERMES.WORK_TASK_COMMENTS(slug, taskId),
      { body }
    );
    return data;
  },

  async listAvailableSkills(slug: string): Promise<HermesSkillSummary[]> {
    const { data } = await api.get<{ skills: HermesSkillSummary[] }>(
      INDEXER.HERMES.SKILLS_AVAILABLE(slug)
    );
    return data.skills;
  },

  async listProfileSkills(slug: string, profile: TeamRole): Promise<HermesSkillSummary[]> {
    const { data } = await api.get<{ skills: HermesSkillSummary[] }>(
      INDEXER.HERMES.PROFILE_SKILLS(slug, profile)
    );
    return data.skills;
  },

  async installProfileSkill(
    slug: string,
    profile: TeamRole,
    skillId: string
  ): Promise<HermesSkillInstallResult> {
    const { data } = await api.post<HermesSkillInstallResult>(
      INDEXER.HERMES.PROFILE_SKILLS(slug, profile),
      { id: skillId }
    );
    return data;
  },

  async uninstallProfileSkill(
    slug: string,
    profile: TeamRole,
    namespace: string,
    skillId: string
  ): Promise<HermesSkillUninstallResult> {
    const { data } = await api.delete<HermesSkillUninstallResult>(
      INDEXER.HERMES.PROFILE_SKILL(slug, profile, namespace, skillId)
    );
    return data;
  },

  async listChatUploads(slug: string, profile: TeamRole): Promise<HermesUploadSummary[]> {
    const { data } = await api.get<{ files: HermesUploadSummary[] }>(
      INDEXER.HERMES.CHAT_UPLOADS(slug, profile)
    );
    return data.files;
  },

  async uploadChatFile(slug: string, profile: TeamRole, file: File): Promise<HermesUploadSummary> {
    const form = new FormData();
    form.append("file", file, file.name);
    // Force axios to compute the multipart boundary by clearing the default
    // application/json Content-Type from api-client.ts — otherwise the
    // indexer route rejects the request as 406 / can't parse the body.
    const { data } = await api.post<HermesUploadSummary>(
      INDEXER.HERMES.CHAT_UPLOADS(slug, profile),
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  async deleteChatFile(
    slug: string,
    profile: TeamRole,
    sha256: string
  ): Promise<{ removed: boolean; sha256: string }> {
    const { data } = await api.delete<{ removed: boolean; sha256: string }>(
      INDEXER.HERMES.CHAT_UPLOAD(slug, profile, sha256)
    );
    return data;
  },

  chatDownloadUrl(slug: string, profile: TeamRole, sha256: string): string {
    return INDEXER.HERMES.CHAT_UPLOAD(slug, profile, sha256);
  },

  async listTaskAttachments(slug: string, taskId: string): Promise<HermesUploadSummary[]> {
    const { data } = await api.get<{ files: HermesUploadSummary[] }>(
      INDEXER.HERMES.TASK_ATTACHMENTS(slug, taskId)
    );
    return data.files;
  },

  async uploadTaskAttachment(
    slug: string,
    taskId: string,
    file: File
  ): Promise<HermesUploadSummary> {
    const form = new FormData();
    form.append("file", file, file.name);
    const { data } = await api.post<HermesUploadSummary>(
      INDEXER.HERMES.TASK_ATTACHMENTS(slug, taskId),
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  async archiveWorkTask(slug: string, taskId: string): Promise<void> {
    await api.delete(INDEXER.HERMES.WORK_TASK(slug, taskId));
  },

  async deleteTaskAttachment(
    slug: string,
    taskId: string,
    sha256: string
  ): Promise<{ removed: boolean; sha256: string }> {
    const { data } = await api.delete<{ removed: boolean; sha256: string }>(
      INDEXER.HERMES.TASK_ATTACHMENT(slug, taskId, sha256)
    );
    return data;
  },

  taskAttachmentDownloadUrl(slug: string, taskId: string, sha256: string): string {
    return INDEXER.HERMES.TASK_ATTACHMENT(slug, taskId, sha256);
  },

  async provision(input: ProvisionOrgInput): Promise<HermesOrgResponse> {
    const { data } = await api.post<HermesOrgResponse>(INDEXER.HERMES.PROVISION(input.slug), {
      slug: input.slug,
      communityId: input.communityId ?? null,
      containerUrl: input.containerUrl,
      sessionToken: input.sessionToken,
    });
    return data;
  },

  /** Open the SSE event stream for a chat run via an authenticated fetch.
   *  axios doesn't support streaming, so we use fetch with the same auth
   *  source as the axios interceptor (TokenManager.getAuthHeader). */
  async openChatStream(
    slug: string,
    role: TeamRole,
    runId: string,
    signal: AbortSignal
  ): Promise<ReadableStream<Uint8Array>> {
    const authHeaders = await TokenManager.getAuthHeader();
    const res = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.HERMES.CHAT_RUN_EVENTS(slug, role, runId)}`,
      { method: "GET", headers: { Accept: "text/event-stream", ...authHeaders }, signal }
    );
    if (!res.ok || !res.body) {
      throw new Error(`Stream failed (${res.status})`);
    }
    return res.body;
  },
};
