/**
 * Philanthropy service — ported from grant-atlas
 * src/features/grant-atlas/services/philanthropy.service.ts.
 *
 * Uses the gap-app-v2 `apiFetch` helper (authenticated via TokenManager,
 * validated with Zod) and returns `ResultAsync<T, AppError>` throughout.
 *
 * Differences from the grant-atlas original:
 * - `apiFetch` is imported from the feature-local lib/api-fetch (uses
 *   envVars.NEXT_PUBLIC_GAP_INDEXER_URL + TokenManager for auth).
 * - Endpoint constants come from `NON_PROFITS_API` (already scaffolded in
 *   Phase 0/1 to match grant-atlas paths exactly).
 * - No `query()` / `submitFeedback()` — those are handled by the SSE stream
 *   hook and search-history service respectively.
 */
import type { ResultAsync } from "neverthrow";
import { z } from "zod";
import { NON_PROFITS_API } from "../lib/api";
import { apiFetch } from "../lib/api-fetch";
import type { AppError } from "../lib/errors";
import {
  type Filing,
  FilingSchema,
  type Financials,
  FinancialsSchema,
  type Foundation,
  FoundationSchema,
  type Grant,
  GrantSchema,
  type Nonprofit,
  NonprofitSchema,
  type Officer,
  OfficerSchema,
} from "../types/philanthropy";

export interface SortOption {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

function buildSortQs(sort?: SortOption): string {
  const params = new URLSearchParams();
  if (sort?.sortBy) params.set("sortBy", sort.sortBy);
  if (sort?.sortOrder) params.set("sortOrder", sort.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface DeepResearchRequestInput {
  email: string;
  query: string;
}

const DeepResearchResponseSchema = z.object({ success: z.boolean() });

export const philanthropyService = {
  /**
   * Submits a free-text deep-research brief plus the requester's email to the
   * indexer, which emails the Karma team for manual follow-up.
   */
  submitDeepResearchRequest(
    input: DeepResearchRequestInput
  ): ResultAsync<{ success: boolean }, AppError> {
    return apiFetch(
      NON_PROFITS_API.PHILANTHROPY.DEEP_RESEARCH,
      DeepResearchResponseSchema,
      "POST",
      input
    );
  },

  getFoundation(id: string): ResultAsync<Foundation, AppError> {
    return apiFetch(NON_PROFITS_API.PHILANTHROPY.FOUNDATIONS.GET(id), FoundationSchema);
  },

  getFoundationGrants(id: string, sort?: SortOption): ResultAsync<Grant[], AppError> {
    return apiFetch(
      `${NON_PROFITS_API.PHILANTHROPY.FOUNDATIONS.GRANTS(id)}${buildSortQs(sort)}`,
      z.array(GrantSchema)
    );
  },

  getFoundationOfficers(id: string, sort?: SortOption): ResultAsync<Officer[], AppError> {
    return apiFetch(
      `${NON_PROFITS_API.PHILANTHROPY.FOUNDATIONS.OFFICERS(id)}${buildSortQs(sort)}`,
      z.array(OfficerSchema)
    );
  },

  getFoundationFinancials(id: string, sort?: SortOption): ResultAsync<Financials[], AppError> {
    return apiFetch(
      `${NON_PROFITS_API.PHILANTHROPY.FOUNDATIONS.FINANCIALS(id)}${buildSortQs(sort)}`,
      z.array(FinancialsSchema)
    );
  },

  getFoundationFiling(id: string, year: number): ResultAsync<Filing, AppError> {
    return apiFetch(NON_PROFITS_API.PHILANTHROPY.FOUNDATIONS.FILING(id, year), FilingSchema);
  },

  getNonprofit(id: string): ResultAsync<Nonprofit, AppError> {
    return apiFetch(NON_PROFITS_API.PHILANTHROPY.NONPROFITS.GET(id), NonprofitSchema);
  },

  getNonprofitGrants(id: string): ResultAsync<Grant[], AppError> {
    return apiFetch(NON_PROFITS_API.PHILANTHROPY.NONPROFITS.GRANTS(id), z.array(GrantSchema));
  },

  getGrant(id: string): ResultAsync<Grant, AppError> {
    return apiFetch(NON_PROFITS_API.PHILANTHROPY.GRANTS.GET(id), GrantSchema);
  },

  submitFeedback(
    traceId: string,
    value: number,
    comment?: string
  ): ResultAsync<{ success: boolean }, AppError> {
    const body = {
      traceId,
      value,
      comment: comment?.trim() || undefined,
    };
    return apiFetch(NON_PROFITS_API.PHILANTHROPY.FEEDBACK, z.unknown(), "POST", body).map(() => ({
      success: true,
    }));
  },
};
