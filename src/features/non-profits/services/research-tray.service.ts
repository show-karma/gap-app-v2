/**
 * Research tray service — ported from
 * grant-atlas features/grant-atlas/services/research-tray.service.ts.
 *
 * Uses apiFetch (authenticated via TokenManager) for all CRUD operations.
 * Returns ResultAsync<_, AppError> for neverthrow pipeline compatibility.
 */
import type { ResultAsync } from "neverthrow";
import { z } from "zod";
import { NON_PROFITS_API } from "../lib/api";
import { apiFetch } from "../lib/api-fetch";
import type { AppError } from "../lib/errors";

export const ResearchTrayEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  name: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});
export type ResearchTrayEntry = z.infer<typeof ResearchTrayEntrySchema>;

export const researchTrayService = {
  list(): ResultAsync<ResearchTrayEntry[], AppError> {
    return apiFetch(NON_PROFITS_API.RESEARCH_TRAY.LIST, z.array(ResearchTrayEntrySchema), "GET");
  },

  create(data: {
    entityType: string;
    entityId: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): ResultAsync<ResearchTrayEntry, AppError> {
    return apiFetch(NON_PROFITS_API.RESEARCH_TRAY.CREATE, ResearchTrayEntrySchema, "POST", data);
  },

  deleteOne(id: string): ResultAsync<void, AppError> {
    return apiFetch(NON_PROFITS_API.RESEARCH_TRAY.DELETE(id), z.void(), "DELETE");
  },

  clearAll(): ResultAsync<void, AppError> {
    return apiFetch(NON_PROFITS_API.RESEARCH_TRAY.CLEAR, z.void(), "DELETE");
  },
};
