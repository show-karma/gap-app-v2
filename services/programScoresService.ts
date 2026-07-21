import { z } from "zod";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

export interface ProgramScoreUploadRequest {
  communityUID: string;
  programId: string;
  chainId: number;
  csvData: any[];
}

const ProgramScoreUploadResultSchema = z
  .object({
    successful: z.number(),
    failed: z.array(z.string()),
  })
  .passthrough();

export type ProgramScoreUploadResult = z.infer<typeof ProgramScoreUploadResultSchema>;

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced: prefer the server response body's `message`, then the
 * original axios error's message, then the client's synthetic message.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export const programScoresService = {
  async uploadProgramScores(request: ProgramScoreUploadRequest): Promise<ProgramScoreUploadResult> {
    try {
      return await api.post<ProgramScoreUploadResult>(
        "/v2/program-scores/bulk-create-from-csv",
        request,
        { schema: ProgramScoreUploadResultSchema }
      );
    } catch (error) {
      throw new Error(`Failed to upload program scores: ${httpErrorMessage(error)}`);
    }
  },
};
