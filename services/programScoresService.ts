import fetchData from "@/utilities/fetchData";

export interface ProgramScoreUploadRequest {
  communityUID: string;
  programId: string;
  chainId: number;
  csvData: any[];
}

export interface ProgramScoreUploadResult {
  successful: number;
  failed: string[];
}

export const programScoresService = {
  async uploadProgramScores(request: ProgramScoreUploadRequest): Promise<ProgramScoreUploadResult> {
    const [data, error] = await fetchData(
      "/v2/program-scores/bulk-create-from-csv",
      "POST",
      request
    );
    
    if (error) {
      throw new Error(`Failed to upload program scores: ${error}`);
    }

    return data as ProgramScoreUploadResult;
  }
};