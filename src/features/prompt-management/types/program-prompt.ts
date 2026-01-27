export type PromptType = "external" | "internal";

export interface ProgramPrompt {
  id: string;
  programId: string;
  promptType: PromptType;
  name: string;
  systemMessage: string | null;
  content: string;
  modelId: string;
  langfusePromptId: string;
  langfuseVersion: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ProgramPromptsResponse {
  external: ProgramPrompt | null;
  internal: ProgramPrompt | null;
  migrationRequired: boolean;
  legacyPromptIds: {
    external: string | null;
    internal: string | null;
  };
}

export interface SaveProgramPromptRequest {
  name: string;
  systemMessage?: string;
  content: string;
  modelId: string;
}

export interface TestProgramPromptRequest {
  applicationId: string;
}

export interface TestProgramPromptResult {
  success: boolean;
  result?: string;
  rawResponse?: unknown;
  compiledPrompt?: string;
  error?: string;
}

export interface TriggerBulkEvaluationRequest {
  promptType: PromptType;
}

export interface TriggerBulkEvaluationResult {
  jobId: string;
  totalApplications: number;
}

export type BulkEvaluationStatus = "pending" | "running" | "completed" | "failed";

export interface BulkEvaluationJob {
  id: string;
  programId: string;
  promptType: PromptType;
  status: BulkEvaluationStatus;
  totalApplications: number;
  completedApplications: number;
  failedApplications: number;
  errorApplicationId?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
  triggeredBy: string;
}
