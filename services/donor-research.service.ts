import type {
  AdminAdvisorsList,
  DonorAdvisor,
  DonorHandle,
  DonorHandleList,
  DonorResearchCountersSnapshot,
  ReportCreateResponse,
  ResearchReportDetail,
  ResearchReportList,
  SharedReportApiPayload,
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
  return withMockSocialMetrics(data);
};

// -- Staff admin overview (DEV-467) ------------------------------------

export interface ListAdvisorsOptions {
  page?: number;
  limit?: number;
  /** Case-insensitive search across wallet, name, org, handle label, and email. */
  search?: string;
}

/**
 * Staff-only: lists every donor-research advisor with their donors and
 * report links. Gated server-side by the staff allowlist; the FE also gates
 * the route on `isStaff`. A non-staff caller gets a 403 that surfaces as a
 * thrown error here.
 */
export const listAdvisors = async (
  options: ListAdvisorsOptions = {}
): Promise<AdminAdvisorsList> => {
  const params: Record<string, number | string> = {};
  if (options.page !== undefined) params.page = options.page;
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.search) params.search = options.search;
  const [data, error] = await fetchData<AdminAdvisorsList>(
    INDEXER.DONOR_RESEARCH.ADMIN_ADVISORS,
    "GET",
    {},
    params
  );
  if (error || !data) {
    throw new Error(error || "Failed to load advisors");
  }
  return data;
};

/**
 * Staff-only: reads any advisor's report with the same shape the advisor
 * sees, so the admin view renders the identical brief. Applies the same
 * illustrative social-metrics fill as {@link getResearchReport} for parity.
 */
export const getAdminReport = async (reportId: string): Promise<ResearchReportDetail> => {
  const [data, error] = await fetchData<ResearchReportDetail>(
    INDEXER.DONOR_RESEARCH.ADMIN_REPORT_BY_ID(reportId)
  );
  if (error || !data) {
    throw new Error(error || "Failed to load report");
  }
  return withMockSocialMetrics(data);
};

// TEMP(DEV-385): the backend social signal isn't producing data yet, so
// fill illustrative social metrics on any candidate that lacks them.
// Remove once real socialMetrics flow from the report response.
const mockDaysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();
function withMockSocialMetrics(report: ResearchReportDetail): ResearchReportDetail {
  return {
    ...report,
    candidates: report.candidates.map((candidate, i) =>
      candidate.socialMetrics
        ? candidate
        : {
            ...candidate,
            socialMetrics: {
              byChannel: [
                {
                  channel: "linkedin",
                  available: true,
                  followers: 4200 + i * 800,
                  postsInWindow: 9,
                  lastPostAt: mockDaysAgo(2),
                  avgLikes: 63,
                  profileUrl: "https://www.linkedin.com/company/climate-solutions",
                },
                {
                  channel: "facebook",
                  available: true,
                  followers: 9400 + i * 600,
                  postsInWindow: 7,
                  lastPostAt: mockDaysAgo(3),
                  avgLikes: 112,
                  profileUrl: "https://www.facebook.com/climatesolutions",
                },
                {
                  channel: "instagram",
                  available: true,
                  followers: 12800 + i * 1200,
                  postsInWindow: 14,
                  lastPostAt: mockDaysAgo(1),
                  avgLikes: 540,
                  profileUrl: "https://www.instagram.com/climatesolutionsnw",
                },
                {
                  channel: "x",
                  available: true,
                  followers: 3100 + i * 300,
                  postsInWindow: 21,
                  lastPostAt: mockDaysAgo(0),
                  avgLikes: 18,
                  profileUrl: "https://x.com/climatesolution",
                },
              ],
              lastPostAt: mockDaysAgo(0),
              totalFollowers: 29500 + i * 2900,
            },
          }
    ),
  };
}

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
export const fetchSharedReport = async (token: string): Promise<ResearchReportDetail> => {
  // The share endpoint returns ONLY render-necessary fields (no advisor IDs,
  // no share-token material). Adapt it to the full ResearchReportDetail shape
  // the brief expects by filling inert defaults for the advisor-only fields —
  // the share view hides every control that would read them.
  const [data, error] = await fetchData<SharedReportApiPayload>(
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
  return {
    ...data,
    advisorId: "",
    donorHandleId: "",
    donorHandleLabel: null,
    criteriaId: "",
    criteria: null,
    hasShareToken: false,
    shareToken: null,
    shareTokenExpiresAt: null,
  };
};
