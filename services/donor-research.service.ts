import type {
  DonorAdvisor,
  DonorHandle,
  DonorHandleList,
  ReportCreateResponse,
  ResearchReportDetail,
  ResearchReportList,
  SharedReportPayload,
  ShareTokenPayload,
} from "@/types/donor-research";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const NOT_PROVISIONED_404 = "donor_research_advisor_not_provisioned";

/**
 * Donor-research API client.
 *
 * All authenticated endpoints rely on the Privy session cookie that
 * `fetchData` attaches by default. The shared donor view
 * (`fetchSharedReport`) does NOT require authentication — the path token
 * IS the capability.
 *
 * Failure shape mirrors the rest of the v2 services: tuple
 * `[data, error, _, status]` from `fetchData`. We unwrap into either the
 * data object or `null` plus throw on hard failures so callers (React
 * Query hooks) can lean on `useQuery`'s built-in retry + cache layers.
 */

// -- Advisor -----------------------------------------------------------

/**
 * Fetches the current advisor row.
 * Returns `null` when the backend signals "not provisioned" (404 with the
 * `donor_research_advisor_not_provisioned` error code) — the caller
 * routes to onboarding in that case rather than surfacing the 404 as an
 * exception.
 */
export const fetchCurrentAdvisor = async (): Promise<DonorAdvisor | null> => {
  const [data, error, , status] = await fetchData<DonorAdvisor | { error: string }>(
    INDEXER.DONOR_RESEARCH.ME
  );
  if (status === 404) {
    return null;
  }
  if (error) {
    throw new Error(error);
  }
  if (data && "error" in data && data.error === NOT_PROVISIONED_404) {
    return null;
  }
  return data as DonorAdvisor;
};

export interface OnboardAdvisorRequest {
  displayName: string;
  orgName?: string | null;
  timezone: string;
}

export const onboardAdvisor = async (body: OnboardAdvisorRequest): Promise<DonorAdvisor> => {
  const [data, error] = await fetchData<DonorAdvisor>(INDEXER.DONOR_RESEARCH.ME, "POST", body);
  if (error || !data) {
    throw new Error(error || "Failed to onboard advisor");
  }
  return data;
};

// -- Donor handles -----------------------------------------------------

export interface ListHandlesOptions {
  limit?: number;
  offset?: number;
}

export const listDonorHandles = async (
  options: ListHandlesOptions = {}
): Promise<DonorHandleList> => {
  const params: Record<string, number> = {};
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.offset !== undefined) params.offset = options.offset;
  const [data, error] = await fetchData<DonorHandleList>(
    INDEXER.DONOR_RESEARCH.HANDLES,
    "GET",
    {},
    params
  );
  if (error || !data) {
    throw new Error(error || "Failed to load donor handles");
  }
  return data;
};

export const getDonorHandle = async (handleId: string): Promise<DonorHandle> => {
  const [data, error] = await fetchData<DonorHandle>(INDEXER.DONOR_RESEARCH.HANDLE_BY_ID(handleId));
  if (error || !data) {
    throw new Error(error || "Failed to load donor handle");
  }
  return data;
};

export interface CreateHandleRequest {
  opaqueLabel: string;
  notes?: string | null;
}

export const createDonorHandle = async (body: CreateHandleRequest): Promise<DonorHandle> => {
  const [data, error] = await fetchData<DonorHandle>(INDEXER.DONOR_RESEARCH.HANDLES, "POST", body);
  if (error || !data) {
    throw new Error(error || "Failed to create donor handle");
  }
  return data;
};

export interface UpdateHandleRequest {
  notes?: string | null;
}

export const updateDonorHandle = async (
  handleId: string,
  body: UpdateHandleRequest
): Promise<DonorHandle> => {
  const [data, error] = await fetchData<DonorHandle>(
    INDEXER.DONOR_RESEARCH.HANDLE_BY_ID(handleId),
    "PATCH",
    body
  );
  if (error || !data) {
    throw new Error(error || "Failed to update donor handle");
  }
  return data;
};

// -- Reports -----------------------------------------------------------

export interface ListReportsOptions {
  limit?: number;
  offset?: number;
}

export const listResearchReports = async (
  options: ListReportsOptions = {}
): Promise<ResearchReportList> => {
  const params: Record<string, number> = {};
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.offset !== undefined) params.offset = options.offset;
  const [data, error] = await fetchData<ResearchReportList>(
    INDEXER.DONOR_RESEARCH.REPORTS,
    "GET",
    {},
    params
  );
  if (error || !data) {
    throw new Error(error || "Failed to load research reports");
  }
  return data;
};

export const getResearchReport = async (reportId: string): Promise<ResearchReportDetail> => {
  const [data, error] = await fetchData<ResearchReportDetail>(
    INDEXER.DONOR_RESEARCH.REPORT_BY_ID(reportId)
  );
  if (error || !data) {
    throw new Error(error || "Failed to load research report");
  }
  return data;
};

export interface CreateReportRequest {
  donorHandleId: string;
  criteriaText: string;
  cause?: string | null;
  geography?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  poolLimit?: number;
}

export const createResearchReport = async (
  body: CreateReportRequest
): Promise<ReportCreateResponse> => {
  const [data, error] = await fetchData<ReportCreateResponse>(
    INDEXER.DONOR_RESEARCH.REPORTS,
    "POST",
    body
  );
  if (error || !data) {
    throw new Error(error || "Failed to start research report");
  }
  return data;
};

// -- Share tokens ------------------------------------------------------

export interface GenerateShareTokenRequest {
  ttlSeconds?: number;
  shareDisplayName?: string | null;
  shareIntroText?: string | null;
}

export const generateShareToken = async (
  reportId: string,
  body: GenerateShareTokenRequest
): Promise<ShareTokenPayload> => {
  const [data, error] = await fetchData<ShareTokenPayload>(
    INDEXER.DONOR_RESEARCH.SHARE_TOKEN(reportId),
    "POST",
    body
  );
  if (error || !data) {
    throw new Error(error || "Failed to generate share token");
  }
  return data;
};

export const revokeShareToken = async (reportId: string): Promise<void> => {
  const [, error] = await fetchData(INDEXER.DONOR_RESEARCH.SHARE_TOKEN(reportId), "DELETE");
  if (error) {
    throw new Error(error);
  }
};

// -- Public donor view (unauthenticated) -------------------------------

/**
 * The donor-facing share view is unauthenticated: the 32-byte token in
 * the path is the capability. We deliberately disable the auth header
 * via `isAuthorized = false` so the request doesn't carry the advisor's
 * session, mirroring the way an external visitor would hit it.
 */
export const fetchSharedReport = async (token: string): Promise<SharedReportPayload> => {
  const [data, error] = await fetchData<SharedReportPayload>(
    INDEXER.DONOR_RESEARCH.SHARED(token),
    "GET",
    {},
    {},
    {},
    false
  );
  if (error || !data) {
    throw new Error(error || "Failed to load shared report");
  }
  return data;
};
