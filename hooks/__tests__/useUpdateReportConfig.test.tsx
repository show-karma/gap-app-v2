import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reorderReportCandidates, updateReportConfig } from "@/services/donor-research.service";
import type {
  CompositeWeights,
  ResearchReportCandidate,
  ResearchReportDetail,
} from "@/types/donor-research";
import { donorReportQueryKey } from "../useDonorReports";
import { useReorderReport, useUpdateReportConfig } from "../useUpdateReportConfig";

vi.mock("@/services/donor-research.service");

const mockUpdate = updateReportConfig as unknown as ReturnType<typeof vi.fn>;
const mockReorder = reorderReportCandidates as unknown as ReturnType<typeof vi.fn>;

const REPORT_ID = "report-1";

function candidate(
  id: string,
  ein: string | null,
  components: ResearchReportCandidate["components"],
  featuredFlag: boolean
): ResearchReportCandidate {
  return {
    id,
    fundingOrganizationId: `org-${id}`,
    organizationName: `Org ${id}`,
    organizationDescription: null,
    organizationCity: null,
    organizationState: null,
    organizationWebsiteUrl: null,
    ein,
    composite: 0,
    components,
    featuredFlag,
    manualPosition: null,
    complianceVerdict: "verified",
    disqualificationReasons: [],
    complianceChecks: [],
    recentMentions: [],
    stateRegistrationStatus: "not_verified",
    activitySignalStatus: "no_signal",
    websiteLastUpdatedAt: null,
    socialLastPostAt: null,
    socialMetrics: null,
    reasoningSummary: null,
    onePagerText: id === "c2" ? "C2 one pager" : null,
    detailedText: null,
    financials: [],
  };
}

const DEFAULT_WEIGHTS: CompositeWeights = {
  onlinePresence: 2500,
  socialPresence: 1000,
  impactRecency: 2500,
  donorMatch: 2500,
  compliance: 1500,
};

function buildReport(): ResearchReportDetail {
  return {
    id: REPORT_ID,
    advisorId: "advisor-1",
    donorHandleId: "handle-1",
    donorHandleLabel: null,
    criteriaId: "criteria-1",
    criteria: null,
    mode: "fast",
    status: "complete",
    hasShareToken: false,
    shareToken: null,
    shareTokenExpiresAt: null,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    fastCompletedAt: null,
    completedAt: "2026-01-01T00:00:00.000Z",
    geographyDiagnostic: null,
    weights: DEFAULT_WEIGHTS,
    topCount: 3,
    candidates: [
      candidate(
        "c1",
        "100",
        {
          onlinePresence: 0.8,
          socialPresence: 0.5,
          impactRecency: 0.6,
          donorMatch: 0.7,
          compliance: 1.0,
        },
        true
      ),
      candidate(
        "c4",
        "300",
        {
          onlinePresence: 0.2,
          socialPresence: 0.2,
          impactRecency: 0.9,
          donorMatch: 0.9,
          compliance: 1.0,
        },
        true
      ),
      candidate(
        "c2",
        "200",
        {
          onlinePresence: 0.4,
          socialPresence: 0.9,
          impactRecency: 0.8,
          donorMatch: 0.5,
          compliance: 0.6,
        },
        true
      ),
      candidate(
        "c3",
        null,
        {
          onlinePresence: 0.9,
          socialPresence: 0.1,
          impactRecency: 0.3,
          donorMatch: 0.9,
          compliance: 0.3,
        },
        false
      ),
      candidate(
        "c5",
        "050",
        {
          onlinePresence: 0.5,
          socialPresence: 0.5,
          impactRecency: 0.5,
          donorMatch: 0.5,
          compliance: 0.5,
        },
        false
      ),
    ],
  };
}

const ONLINE_ONLY: CompositeWeights = {
  onlinePresence: 10000,
  socialPresence: 0,
  impactRecency: 0,
  donorMatch: 0,
  compliance: 0,
};

describe("useUpdateReportConfig", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(donorReportQueryKey(REPORT_ID), buildReport());
    vi.clearAllMocks();
  });

  afterEach(() => queryClient.clear());

  it("optimistically re-ranks the cached report before the server responds", async () => {
    let resolve!: (value: ResearchReportDetail) => void;
    mockUpdate.mockReturnValue(
      new Promise<ResearchReportDetail>((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useUpdateReportConfig(), { wrapper });
    result.current.mutate({ reportId: REPORT_ID, weights: ONLINE_ONLY });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID));
      expect(cached?.weights).toEqual(ONLINE_ONLY);
    });

    const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID))!;
    // Online-only ordering: c3, c1, c5, c2, c4.
    expect(cached.candidates.map((c) => c.id)).toEqual(["c3", "c1", "c5", "c2", "c4"]);
    // Manual ordering cleared by a weights re-rank.
    expect(cached.candidates.every((c) => c.manualPosition === null)).toBe(true);
    // c2 leaves the top-3 → its one-pager is nulled optimistically.
    expect(cached.candidates.find((c) => c.id === "c2")?.onePagerText).toBeNull();

    resolve(buildReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("sends only { topCount } and re-flags the featured set for a topCount-only change", async () => {
    let resolve!: (value: ResearchReportDetail) => void;
    mockUpdate.mockReturnValue(
      new Promise<ResearchReportDetail>((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useUpdateReportConfig(), { wrapper });
    result.current.mutate({ reportId: REPORT_ID, topCount: 1 });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID));
      expect(cached?.topCount).toBe(1);
    });

    // Only the changed field reaches the /config endpoint.
    expect(mockUpdate.mock.calls[0][0]).toBe(REPORT_ID);
    expect(mockUpdate.mock.calls[0][1]).toEqual({ topCount: 1 });

    const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID))!;
    // topCount-only keeps the order; only the first candidate stays featured.
    expect(cached.candidates.filter((c) => c.featuredFlag).map((c) => c.id)).toEqual([
      cached.candidates[0].id,
    ]);

    resolve(buildReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls the cache back to the prior report when the commit fails", async () => {
    mockUpdate.mockRejectedValue(new Error("synthesis failed"));
    const original = queryClient.getQueryData(donorReportQueryKey(REPORT_ID));

    const { result } = renderHook(() => useUpdateReportConfig(), { wrapper });
    result.current.mutate({ reportId: REPORT_ID, weights: ONLINE_ONLY });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID));
    expect(cached?.weights).toEqual(DEFAULT_WEIGHTS);
    expect(cached?.candidates.map((c) => c.id)).toEqual(
      (original as ResearchReportDetail).candidates.map((c) => c.id)
    );
  });
});

describe("useReorderReport", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(donorReportQueryKey(REPORT_ID), buildReport());
    vi.clearAllMocks();
  });

  afterEach(() => queryClient.clear());

  it("optimistically applies the manual order and 1-based positions", async () => {
    let resolve!: (value: ResearchReportDetail) => void;
    mockReorder.mockReturnValue(
      new Promise<ResearchReportDetail>((r) => {
        resolve = r;
      })
    );

    const order = ["c5", "c3", "c1", "c2", "c4"];
    const { result } = renderHook(() => useReorderReport(), { wrapper });
    result.current.mutate({ reportId: REPORT_ID, orderedCandidateIds: order });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID));
      expect(cached?.candidates.map((c) => c.id)).toEqual(order);
    });

    const cached = queryClient.getQueryData<ResearchReportDetail>(donorReportQueryKey(REPORT_ID))!;
    expect(cached.candidates.map((c) => c.manualPosition)).toEqual([1, 2, 3, 4, 5]);
    // New top-3 = c5, c3, c1.
    expect(cached.candidates.filter((c) => c.featuredFlag).map((c) => c.id)).toEqual([
      "c5",
      "c3",
      "c1",
    ]);

    resolve(buildReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
