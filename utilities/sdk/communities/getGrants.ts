import type { Hex } from "@show-karma/karma-gap-sdk";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { SortByOptions, StatusOptions } from "@/types/filters";
import type { Grant } from "@/types/v2/grant";
import { api } from "@/utilities/api/client";
import { orElse } from "@/utilities/api/or-else";
import { INDEXER } from "@/utilities/indexer";

export interface GrantsResponse {
  // TODO: needs to be added to the SDK
  grants: (Grant & { regions: [] })[];
  pageInfo: {
    page?: string;
    pageLimit?: string;
    totalItems?: number;
  };
  uniqueProjectCount?: number;
}

// Raw indexer envelope. `Grant` items and `pageInfo` are left unvalidated
// (z.custom) — they're already hand-typed interfaces of uncertain fidelity to
// the real payload, and this migration must not be stricter than reality.
const GrantsAPIResponseSchema = z
  .object({
    data: z.array(z.custom<Grant & { regions: [] }>()).optional(),
    pageInfo: z.custom<GrantsResponse["pageInfo"]>().optional(),
    uniqueProjectCount: z.number().optional(),
  })
  .passthrough();
type GrantsAPIResponse = z.infer<typeof GrantsAPIResponseSchema>;

export interface GrantsFilter {
  categories?: string[];
  sortBy?: SortByOptions;
  status?: StatusOptions;
  selectedProgramId?: string;
  selectedTrackIds?: string[];
}

export const getGrants = async (
  uid: Hex,
  filter?: GrantsFilter,
  paginationOps?: {
    page: number;
    pageLimit: number;
  }
): Promise<GrantsResponse> => {
  try {
    const response = await orElse<GrantsAPIResponse | null>(
      api.get<GrantsAPIResponse>(
        INDEXER.COMMUNITY.GRANTS(uid, {
          page: paginationOps?.page,
          pageLimit: paginationOps?.pageLimit,
          categories: filter?.categories?.join(","),
          sort: filter?.sortBy,
          status: filter?.status,
          selectedProgramId: filter?.selectedProgramId,
          selectedTrackIds: filter?.selectedTrackIds,
        }),
        { schema: GrantsAPIResponseSchema }
      ),
      null
    );
    if (!response) return { grants: [], pageInfo: {}, uniqueProjectCount: 0 };
    const { data: grants, pageInfo, uniqueProjectCount } = response;
    if (!grants || grants.length === 0) return { grants: [], pageInfo: {} };

    return { grants, pageInfo: pageInfo ?? {}, uniqueProjectCount };
  } catch (error: unknown) {
    errorManager(`Error getting grants of community: ${uid}`, error);
    return { grants: [], pageInfo: {} };
  }
};
