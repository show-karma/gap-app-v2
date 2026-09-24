// Simocracy integration endpoints, kept out of INDEXER so utilities/indexer.ts
// stays within the file-size gate.
export const SIMOCRACY_ROUTES = {
  programs: {
    INTEGRATION_SIMOCRACY: (programId: string) =>
      `/v2/funding-programs/${programId}/integrations/simocracy`,
    SIMOCRACY_COUNCIL: (programId: string) =>
      `/v2/funding-programs/${programId}/integrations/simocracy/council`,
    SIMOCRACY_SIM_PERSONA: (programId: string, simUri: string) =>
      `/v2/funding-programs/${programId}/integrations/simocracy/sim-persona?simUri=${encodeURIComponent(simUri)}`,
    SIM_LINKS: (programId: string) =>
      `/v2/funding-programs/${programId}/integrations/simocracy/sim-links`,
    SIMOCRACY_CREDENTIAL: (programId: string) =>
      `/v2/funding-programs/${programId}/integrations/simocracy/credential`,
    SIMOCRACY_FEEDBACK_EXPORT: (programId: string) =>
      `/v2/funding-programs/${programId}/integrations/simocracy/feedback/export`,
  },
  applications: {
    INTEGRATIONS: (referenceNumber: string) =>
      `/v2/funding-applications/${referenceNumber}/integrations`,
    INTEGRATION_SIMOCRACY: (referenceNumber: string) =>
      `/v2/funding-applications/${referenceNumber}/integrations/simocracy`,
    SIMOCRACY_FEEDBACK: (referenceNumber: string) =>
      `/v2/funding-applications/${referenceNumber}/integrations/simocracy/feedback`,
    SIMOCRACY_COMMENTS: (referenceNumber: string) =>
      `/v2/funding-applications/${referenceNumber}/integrations/simocracy/comments`,
  },
} as const;
