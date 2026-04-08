import { z } from "zod";

/**
 * Pagination info schema shared across paginated API responses.
 * Matches the backend PaginationInfo / PaginatedContext.Pagination structure.
 */
export const paginationInfoSchema = z.object({
  totalCount: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  nextPage: z.number().nullable(),
  prevPage: z.number().nullable(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});
