import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/render";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import { PERMISSIONS_TIMEOUT_MS } from "@/src/core/rbac/services/authorization.service";
import type { ResearchReportDetail } from "@/types/donor-research";
import { ReportBriefView } from "../ReportBriefView";

/**
 * REGRESSION: a `GET /v2/auth/permissions` request that never completes used to
 * pin the report page on its "Loading report…" skeleton forever.
 *
 * `ReportBriefView` holds the skeleton until management authorization resolves
 * (`useStaff().isLoading`), and that flag stayed true for as long as the
 * permissions query stayed pending. The permissions request inherited the api
 * client's 360s indexer ceiling — a long-poll allowance that is meaningless for
 * an authorization lookup — so an unresolvable request produced an eternal
 * skeleton with no error, no retry, and nothing for the user to do.
 *
 * These tests drive the REAL chain (PermissionProvider -> usePermissionsQuery ->
 * authorizationService -> api client) against an `api.get` that never settles,
 * which is the only faithful reproduction: anything that mocks the query or the
 * service out cannot observe whether the fetch is actually bounded.
 */

const apiGet = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token"), clearCache: vi.fn() },
}));

vi.mock("@/hooks/useDonorReportStream", () => ({
  useDonorReportStream: () => ({ events: [], status: "idle" }),
}));

const mockReport = {
  id: "report-1",
  advisorId: "advisor-owner",
  status: "complete",
} as unknown as ResearchReportDetail;

vi.mock("@/hooks/useDonorReports", () => ({
  useDonorReport: () => ({ data: mockReport, isLoading: false, isError: false, error: null }),
}));

let advisorId: string | null = null;
vi.mock("@/hooks/useDonorAdvisor", () => ({
  useDonorAdvisor: () => ({
    data: advisorId ? { id: advisorId } : null,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("../ReportBrief", () => ({
  ReportBrief: ({ canManageReport }: { canManageReport: boolean }) => (
    <div data-testid="report-brief" data-can-manage={String(canManageReport)}>
      report content
    </div>
  ),
}));

function renderReport() {
  return renderWithProviders(
    <PermissionProvider>
      <ReportBriefView reportId="report-1" />
    </PermissionProvider>,
    { authState: { ready: true, authenticated: true } }
  );
}

/** Flush React effects + microtasks without moving the fake clock. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Move the fake clock past the permissions deadline and let React re-render. */
async function advancePastPermissionsDeadline() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PERMISSIONS_TIMEOUT_MS + 1_000);
  });
}

describe("ReportBriefView — unresolvable permissions fetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    advisorId = null;
    apiGet.mockReset();
    // The stall under investigation: the request is issued and never settles.
    apiGet.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("escapes the loading skeleton and surfaces a retry affordance", async () => {
    renderReport();
    await settle();

    // Precondition: the page really is gated on the pending permissions query.
    expect(screen.getByText("Loading report…")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await advancePastPermissionsDeadline();

    expect(screen.queryByText("Loading report…")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("aborts the in-flight request instead of leaving it hanging", async () => {
    renderReport();
    await settle();

    const signal = apiGet.mock.calls[0]?.[1]?.signal as AbortSignal | undefined;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);

    await advancePastPermissionsDeadline();

    expect(signal?.aborted).toBe(true);
  });

  it("does not block the report for a confirmed owner, whose access is not RBAC-derived", async () => {
    advisorId = "advisor-owner";

    renderReport();
    await advancePastPermissionsDeadline();

    expect(screen.getByTestId("report-brief")).toHaveAttribute("data-can-manage", "true");
  });
});
