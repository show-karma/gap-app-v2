import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import type {
  BulkEvaluationJob,
  ProgramPrompt,
  ProgramPromptsResponse,
  PromptType,
  SaveProgramPromptRequest,
  TestProgramPromptRequest,
  TestProgramPromptResult,
  TriggerBulkEvaluationResult,
} from "../types/program-prompt";

// `api.get/post/put` already throw on failure, so the only remaining case
// this guards against is a 2xx response with an empty/null body.
function unwrapResponse<T>(response: T | null): T {
  if (!response) {
    throw new Error("No response from server");
  }
  return response;
}

/**
 * Service for managing program prompts (LLM prompt management)
 */
export const programPromptService = {
  /**
   * Get all prompts for a program
   *
   * @param programId - The program ID
   * @returns Both external and internal prompts with migration info
   */
  async getPrompts(programId: string): Promise<ProgramPromptsResponse> {
    // TODO(#1775): add zod schema
    const response = await api.get<ProgramPromptsResponse>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.GET(programId)
    );
    return unwrapResponse(response);
  },

  /**
   * Save or update a prompt for a program
   * Note: Name cannot be changed after creation
   *
   * @param programId - The program ID
   * @param promptType - Either 'external' or 'internal'
   * @param data - The prompt data to save
   * @returns The saved prompt
   */
  async savePrompt(
    programId: string,
    promptType: PromptType,
    data: SaveProgramPromptRequest
  ): Promise<ProgramPrompt> {
    // TODO(#1775): add zod schema
    const response = await api.put<ProgramPrompt>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.SAVE(programId, promptType),
      data
    );
    return unwrapResponse(response);
  },

  /**
   * Test a prompt with a specific application
   *
   * @param programId - The program ID
   * @param promptType - Either 'external' or 'internal'
   * @param data - The application ID to test with
   * @returns Test result including compiled prompt and response
   */
  async testPrompt(
    programId: string,
    promptType: PromptType,
    data: TestProgramPromptRequest
  ): Promise<TestProgramPromptResult> {
    // TODO(#1775): add zod schema
    const response = await api.post<TestProgramPromptResult>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.TEST(programId, promptType),
      data
    );
    return unwrapResponse(response);
  },

  /**
   * Trigger bulk re-evaluation of all applications
   *
   * @param programId - The program ID
   * @param promptType - Either 'external' or 'internal'
   * @returns Job info including job ID and total applications
   */
  async triggerBulkEvaluation(
    programId: string,
    promptType: PromptType
  ): Promise<TriggerBulkEvaluationResult> {
    // TODO(#1775): add zod schema
    const response = await api.post<TriggerBulkEvaluationResult>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.BULK_EVALUATE(programId),
      { promptType }
    );
    return unwrapResponse(response);
  },

  /**
   * Get the status of a bulk evaluation job
   *
   * @param programId - The program ID
   * @param jobId - The job ID
   * @returns Job status including progress
   */
  async getJobStatus(programId: string, jobId: string): Promise<BulkEvaluationJob> {
    // TODO(#1775): add zod schema
    const response = await api.get<BulkEvaluationJob>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.JOB_STATUS(programId, jobId)
    );
    return unwrapResponse(response);
  },
};
