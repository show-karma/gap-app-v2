import type {
  DonorAdvisor,
  DonorHandle,
  DonorHandleList,
  DonorResearchCountersSnapshot,
  ReportCreateResponse,
  ResearchReportDetail,
  ResearchReportList,
  SharedReportPayload,
  ShareTokenPayload,
} from "@/types/donor-research";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

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
 *
 * Returns `null` only when the advisor hasn't onboarded yet — `GET /me`
 * returns 404 in exactly that one case (missing/invalid auth surfaces as
 * 401 earlier, and the route always exists), so a 404 is the unambiguous
 * "route to onboarding" signal. `fetchData` exposes only `response.data
 * .message`, not the structured error code, so we key off the status.
 * Any other error is thrown so React Query can retry / surface an error
 * state rather than silently sending the user to onboarding.
 */
export const fetchCurrentAdvisor = async (): Promise<DonorAdvisor | null> => {
  const [data, error, , status] = await fetchData<DonorAdvisor>(INDEXER.DONOR_RESEARCH.ME);
  if (status === 404) {
    return null;
  }
  if (error || !data) {
    throw new Error(error || "Failed to load advisor");
  }
  return data;
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

/**
 * Today's per-channel rate-limit counters + tier caps. Refreshed on each
 * page mount and after a successful report create so the
 * `RateLimitCounter` chip reflects what enforcement sees. `degraded`
 * true means Redis was unreachable on the backend — the chip should
 * still render but with a "—" usage value.
 */
export const fetchMyCounters = async (): Promise<DonorResearchCountersSnapshot> => {
  const [data, error] = await fetchData<DonorResearchCountersSnapshot>(
    INDEXER.DONOR_RESEARCH.ME_COUNTERS
  );
  if (error || !data) {
    throw new Error(error || "Failed to load rate-limit counters");
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

// -- Reports -----------------------------------------------------------

export interface ListReportsOptions {
  limit?: number;
  offset?: number;
  /**
   * Restrict the list to a single donor handle. Omit to load every
   * report for the current advisor (default behavior).
   */
  donorHandleId?: string;
}

export const listResearchReports = async (
  options: ListReportsOptions = {}
): Promise<ResearchReportList> => {
  const params: Record<string, number | string> = {};
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.offset !== undefined) params.offset = options.offset;
  if (options.donorHandleId) params.donorHandleId = options.donorHandleId;
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
