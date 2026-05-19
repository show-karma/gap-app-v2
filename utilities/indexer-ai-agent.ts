export const AI_AGENT_INDEXER = {
  PROVISION: (slug: string) => `/v2/hermes/orgs/${slug}/provision`,
  MY_ORGS: `/v2/hermes/orgs/mine`,
  ORG: (slug: string) => `/v2/hermes/orgs/${slug}`,
  PROFILES: (slug: string) => `/v2/hermes/orgs/${slug}/profiles`,
  SOUL: (slug: string, profile: string) => `/v2/hermes/orgs/${slug}/profiles/${profile}/soul`,
  BRAIN: (slug: string, topic: "mission" | "brand") => `/v2/hermes/orgs/${slug}/brain/${topic}`,
  WORK_TASKS: (slug: string) => `/v2/hermes/orgs/${slug}/work/tasks`,
  WORK_TASK: (slug: string, taskId: string) => `/v2/hermes/orgs/${slug}/work/tasks/${taskId}`,
  WORK_TASK_STATUS: (slug: string, taskId: string) =>
    `/v2/hermes/orgs/${slug}/work/tasks/${taskId}/status`,
  WORK_TASK_ASSIGNEE: (slug: string, taskId: string) =>
    `/v2/hermes/orgs/${slug}/work/tasks/${taskId}/assignee`,
  WORK_TASK_COMMENTS: (slug: string, taskId: string) =>
    `/v2/hermes/orgs/${slug}/work/tasks/${taskId}/comments`,
  CHAT_START: (slug: string, profile: string) => `/v2/hermes/orgs/${slug}/profiles/${profile}/chat`,
  CHAT_RUN: (slug: string, profile: string, runId: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/chat/${runId}`,
  CHAT_RUN_EVENTS: (slug: string, profile: string, runId: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/chat/${runId}/events`,
  CHAT_RUN_STOP: (slug: string, profile: string, runId: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/chat/${runId}/stop`,
  SKILLS_AVAILABLE: (slug: string) => `/v2/hermes/orgs/${slug}/skills/available`,
  PROFILE_SKILLS: (slug: string, profile: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/skills`,
  PROFILE_SKILL: (slug: string, profile: string, namespace: string, skillId: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/skills/${namespace}/${skillId}`,
  CHAT_UPLOADS: (slug: string, profile: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/uploads`,
  CHAT_UPLOAD: (slug: string, profile: string, sha256: string) =>
    `/v2/hermes/orgs/${slug}/profiles/${profile}/uploads/${sha256}`,
  TASK_ATTACHMENTS: (slug: string, taskId: string) =>
    `/v2/hermes/orgs/${slug}/work/tasks/${taskId}/attachments`,
  TASK_ATTACHMENT: (slug: string, taskId: string, sha256: string) =>
    `/v2/hermes/orgs/${slug}/work/tasks/${taskId}/attachments/${sha256}`,
};
