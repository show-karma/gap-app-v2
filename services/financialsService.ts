import type { ProgramFinancialsResponse } from "@/types/financials";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches financial data for a program including summary and project-level breakdown
 *
 * @param programId - The program ID
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Promise with the program financials data
 */
export const getProgramFinancials = async (
  programId: string,
  page: number = 1,
  limit: number = 10
): Promise<ProgramFinancialsResponse> => {
  // TODO(#1775): add zod schema
  return api.get<ProgramFinancialsResponse>(INDEXER.PROGRAMS.FINANCIALS(programId, page, limit));
};
