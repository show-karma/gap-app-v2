export const FOLLOW_UP_ROUTES = {
  CASES: (programId: string, page: number, limit: number) =>
    `/v2/funding-programs/${programId}/follow-up-agent/cases?page=${page}&limit=${limit}`,
  PLAYBOOK: (programId: string) => `/v2/funding-programs/${programId}/follow-up-agent/playbook`,
  CASE: (programId: string, milestoneUid: string) =>
    `/v2/funding-programs/${programId}/follow-up-agent/cases/${milestoneUid}`,
};
