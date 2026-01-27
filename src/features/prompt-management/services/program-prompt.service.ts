import fetchData from "@/utilities/fetchData";
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

function unwrapResponse<T>(response: T | null, error: string | null): T {
  if (error) {
    throw new Error(error);
  }
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
    const [response, error] = await fetchData<ProgramPromptsResponse>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.GET(programId),
      "GET"
    );
    return unwrapResponse(response, error);
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
    const [response, error] = await fetchData<ProgramPrompt>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.SAVE(programId, promptType),
      "PUT",
      data
    );
    return unwrapResponse(response, error);
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
    const [response, error] = await fetchData<TestProgramPromptResult>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.TEST(programId, promptType),
      "POST",
      data
    );
    return unwrapResponse(response, error);
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
    const [response, error] = await fetchData<TriggerBulkEvaluationResult>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.BULK_EVALUATE(programId),
      "POST",
      { promptType }
    );
    return unwrapResponse(response, error);
  },

  /**
   * Get the status of a bulk evaluation job
   *
   * @param programId - The program ID
   * @param jobId - The job ID
   * @returns Job status including progress
   */
  async getJobStatus(programId: string, jobId: string): Promise<BulkEvaluationJob> {
    const [response, error] = await fetchData<BulkEvaluationJob>(
      INDEXER.V2.FUNDING_PROGRAMS.PROMPTS.JOB_STATUS(programId, jobId),
      "GET"
    );
    return unwrapResponse(response, error);
  },
};
