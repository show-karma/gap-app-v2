import { render, screen } from "@testing-library/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useOwnerStore, useProjectStore } from "@/store";
import { UpdatesContent } from "../UpdatesContent";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => "/project/test-project"),
}));

vi.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: vi.fn(),
}));

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(),
  useProjectStore: vi.fn(),
}));

// The component derives its single `isAuthorized` from useProjectAuthorization.
// Mock it directly (default denied) and let mockStores() drive it from the
// owner/admin flags — avoids wiring the full auth chain (useAuth/useRouter).
vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: vi.fn(() => ({ isAuthorized: false, isLoading: false })),
}));

// Capture latest props passed to ActivityFilters so URL round-trip tests can
// inspect them without coupling to DOM output.
let capturedFiltersProps: Record<string, unknown> = {};

vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFeed", () => ({
  ActivityFeed: vi.fn(({ isAuthorized }) => (
    <div data-testid="activity-feed" data-authorized={isAuthorized}>
      Mock Activity Feed
    </div>
  )),
}));

vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFilters", () => ({
  ActivityFilters: vi.fn((props) => {
    capturedFiltersProps = props;
    return <div data-testid="activity-filters">Mock Filters</div>;
  }),
}));

// ─── Shared test helpers ───────────────────────────────────────────────────────

function mockStores({ isOwner = false, isProjectAdmin = false, isProjectOwner = false } = {}) {
  (useOwnerStore as unknown as vi.Mock).mockImplementation((sel) => sel({ isOwner }));
  (useProjectStore as unknown as vi.Mock).mockImplementation((sel) =>
    sel({ isProjectAdmin, isProjectOwner })
  );
  (useProjectAuthorization as vi.Mock).mockReturnValue({
    isAuthorized: isOwner || isProjectAdmin || isProjectOwner,
    isLoading: false,
  });
}

function mockProjectProfile(overrides: Record<string, unknown> = {}) {
  (useProjectProfile as vi.Mock).mockReturnValue({
    allUpdates: [],
    milestonesCount: 0,
    completedCount: 0,
    isUpdating: false,
    isUpdatesError: false,
    hasUpdatesData: true,
    refetch: vi.fn(),
    ...overrides,
  });
}

function buildSearchParams(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params);
  // Attach a typed .get() shim so tests using vi.Mock work transparently
  return sp;
}

describe("UpdatesContent — authorization", () => {
  const mockRouter = { replace: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedFiltersProps = {};
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue(mockRouter);
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams());
    mockProjectProfile();
  });

  it("passes isAuthorized=true to ActivityFeed when user is owner", () => {
    mockStores({ isOwner: true });
    render(<UpdatesContent />);
    expect(screen.getByTestId("activity-feed")).toHaveAttribute("data-authorized", "true");
  });

  it("passes isAuthorized=true to ActivityFeed when user is project admin", () => {
    mockStores({ isProjectAdmin: true });
    render(<UpdatesContent />);
    expect(screen.getByTestId("activity-feed")).toHaveAttribute("data-authorized", "true");
  });

  it("passes isAuthorized=true when user is both owner and admin", () => {
    mockStores({ isOwner: true, isProjectAdmin: true });
    render(<UpdatesContent />);
    expect(screen.getByTestId("activity-feed")).toHaveAttribute("data-authorized", "true");
  });

  it("passes isAuthorized=true to ActivityFeed when user is project owner (not admin)", () => {
    mockStores({ isProjectOwner: true });
    render(<UpdatesContent />);
    expect(screen.getByTestId("activity-feed")).toHaveAttribute("data-authorized", "true");
  });

  it("passes isAuthorized=false to ActivityFeed when user is neither owner nor admin", () => {
    mockStores();
    render(<UpdatesContent />);
    expect(screen.getByTestId("activity-feed")).toHaveAttribute("data-authorized", "false");
  });

  it("renders both activity filters and feed", () => {
    mockStores();
    render(<UpdatesContent />);
    expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
  });
});

// ─── URL round-trip: reading params ───────────────────────────────────────────

describe("UpdatesContent — reads URL params and passes to ActivityFilters", () => {
  const mockRouter = { replace: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedFiltersProps = {};
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue(mockRouter);
    mockProjectProfile();
    mockStores();
  });

  it("passes dateFrom from URL to ActivityFilters", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams({ dateFrom: "2024-01-01" }));
    render(<UpdatesContent />);
    expect(capturedFiltersProps.dateFrom).toBe("2024-01-01");
  });

  it("passes dateTo from URL to ActivityFilters", () => {
    (useSearchParams as vi.Mock).mockReturnValue(
      buildSearchParams({ dateFrom: "2024-01-01", dateTo: "2024-01-31" })
    );
    render(<UpdatesContent />);
    expect(capturedFiltersProps.dateTo).toBe("2024-01-31");
  });

  it("passes hasAIEvaluation=true when URL has hasAIEvaluation=true", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams({ hasAIEvaluation: "true" }));
    render(<UpdatesContent />);
    expect(capturedFiltersProps.hasAIEvaluation).toBe(true);
  });

  it("passes hasAIEvaluation=false when URL has hasAIEvaluation=false", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams({ hasAIEvaluation: "false" }));
    render(<UpdatesContent />);
    expect(capturedFiltersProps.hasAIEvaluation).toBe(false);
  });

  it("passes hasAIEvaluation=undefined when URL param is absent", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams());
    render(<UpdatesContent />);
    expect(capturedFiltersProps.hasAIEvaluation).toBeUndefined();
  });

  it("passes aiScoreMin as a number when URL has aiScoreMin", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams({ aiScoreMin: "7" }));
    render(<UpdatesContent />);
    expect(capturedFiltersProps.aiScoreMin).toBe(7);
  });

  it("passes aiScoreMin=undefined when URL param is absent", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams());
    render(<UpdatesContent />);
    expect(capturedFiltersProps.aiScoreMin).toBeUndefined();
  });

  it("passes aiScoreMin=undefined when URL param is not a valid number", () => {
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams({ aiScoreMin: "nope" }));
    render(<UpdatesContent />);
    expect(capturedFiltersProps.aiScoreMin).toBeUndefined();
  });
});

// ─── URL round-trip: writing params via onDateRangeChange ─────────────────────

describe("UpdatesContent — onDateRangeChange updates URL", () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedFiltersProps = {};
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue({ replace: mockReplace });
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams());
    mockProjectProfile();
    mockStores();
  });

  it("sets dateFrom param in URL when from is provided", () => {
    render(<UpdatesContent />);
    const { onDateRangeChange } = capturedFiltersProps as {
      onDateRangeChange: (f: string | undefined, t: string | undefined) => void;
    };
    onDateRangeChange("2024-06-01", undefined);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("dateFrom=2024-06-01");
    expect(url).not.toContain("dateTo=");
  });

  it("sets both dateFrom and dateTo when both are provided", () => {
    render(<UpdatesContent />);
    const { onDateRangeChange } = capturedFiltersProps as {
      onDateRangeChange: (f: string | undefined, t: string | undefined) => void;
    };
    onDateRangeChange("2024-06-01", "2024-06-30");

    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("dateFrom=2024-06-01");
    expect(url).toContain("dateTo=2024-06-30");
  });

  it("removes dateFrom and dateTo from URL when both are undefined", () => {
    (useSearchParams as vi.Mock).mockReturnValue(
      buildSearchParams({ dateFrom: "2024-01-01", dateTo: "2024-01-31" })
    );
    render(<UpdatesContent />);
    const { onDateRangeChange } = capturedFiltersProps as {
      onDateRangeChange: (f: string | undefined, t: string | undefined) => void;
    };
    onDateRangeChange(undefined, undefined);

    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("dateFrom");
    expect(url).not.toContain("dateTo");
  });
});

// ─── URL round-trip: writing params via onAIFilterChange ──────────────────────

describe("UpdatesContent — onAIFilterChange updates URL", () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedFiltersProps = {};
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue({ replace: mockReplace });
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams());
    mockProjectProfile();
    mockStores();
  });

  it("sets hasAIEvaluation=true param when hasEvaluation=true and no scoreMin", () => {
    render(<UpdatesContent />);
    const { onAIFilterChange } = capturedFiltersProps as {
      onAIFilterChange: (f: { hasEvaluation?: boolean; scoreMin?: number }) => void;
    };
    onAIFilterChange({ hasEvaluation: true });

    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("hasAIEvaluation=true");
    expect(url).not.toContain("aiScoreMin");
  });

  it("sets hasAIEvaluation=false when hasEvaluation=false and no scoreMin", () => {
    render(<UpdatesContent />);
    const { onAIFilterChange } = capturedFiltersProps as {
      onAIFilterChange: (f: { hasEvaluation?: boolean; scoreMin?: number }) => void;
    };
    onAIFilterChange({ hasEvaluation: false });

    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("hasAIEvaluation=false");
    expect(url).not.toContain("aiScoreMin");
  });

  it("sets aiScoreMin and omits hasAIEvaluation when scoreMin provided without hasEvaluation", () => {
    render(<UpdatesContent />);
    const { onAIFilterChange } = capturedFiltersProps as {
      onAIFilterChange: (f: { hasEvaluation?: boolean; scoreMin?: number }) => void;
    };
    // Business rule: scoreMin alone — hasEvaluation omitted means "don't set hasAIEvaluation"
    onAIFilterChange({ scoreMin: 7 });

    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("aiScoreMin=7");
    expect(url).not.toContain("hasAIEvaluation");
  });

  it("enforces rule: never both hasAIEvaluation=false + aiScoreMin (omits hasAIEvaluation)", () => {
    render(<UpdatesContent />);
    const { onAIFilterChange } = capturedFiltersProps as {
      onAIFilterChange: (f: { hasEvaluation?: boolean; scoreMin?: number }) => void;
    };
    // Calling with scoreMin + hasEvaluation=false — hasAIEvaluation must be dropped
    onAIFilterChange({ hasEvaluation: false, scoreMin: 5 });

    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("aiScoreMin=5");
    expect(url).not.toContain("hasAIEvaluation");
  });

  it("sets both hasAIEvaluation=true and aiScoreMin when both explicitly true+present", () => {
    render(<UpdatesContent />);
    const { onAIFilterChange } = capturedFiltersProps as {
      onAIFilterChange: (f: { hasEvaluation?: boolean; scoreMin?: number }) => void;
    };
    onAIFilterChange({ hasEvaluation: true, scoreMin: 8 });

    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("aiScoreMin=8");
    expect(url).toContain("hasAIEvaluation=true");
  });

  it("removes both params when hasEvaluation=undefined and scoreMin=undefined", () => {
    (useSearchParams as vi.Mock).mockReturnValue(
      buildSearchParams({ hasAIEvaluation: "true", aiScoreMin: "5" })
    );
    render(<UpdatesContent />);
    const { onAIFilterChange } = capturedFiltersProps as {
      onAIFilterChange: (f: { hasEvaluation?: boolean; scoreMin?: number }) => void;
    };
    onAIFilterChange({ hasEvaluation: undefined, scoreMin: undefined });

    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("hasAIEvaluation");
    expect(url).not.toContain("aiScoreMin");
  });
});

/**
 * Regression coverage for the "infinite skeleton" the QA pipeline found on
 * PR #1992: the feed used to be gated on `!allUpdates || isUpdating`, but
 * `allUpdates` is always an array (aggregateProjectProfileData builds one), so
 * only `isUpdating` drove the skeleton — and a client updates request that
 * never settles never clears it. The server-rendered feed was also discarded
 * the moment the component hydrated, so real content vanished into that
 * skeleton with no error state, no retry and no timeout.
 */
describe("UpdatesContent — feed resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFiltersProps = {};
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue({ replace: vi.fn() });
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams());
    mockStores();
    mockProjectProfile();
  });

  it("keeps the server-rendered feed while the client updates query is still in flight", () => {
    mockProjectProfile({ allUpdates: [], isUpdating: true, hasUpdatesData: false });

    render(<UpdatesContent serverFeed={<div data-testid="server-feed">Server feed</div>} />);

    // The real content stays on screen instead of being replaced by a skeleton
    // that a hanging request would never clear.
    expect(screen.getByTestId("server-feed")).toBeInTheDocument();
    expect(screen.queryByTestId("updates-content-error")).not.toBeInTheDocument();
  });

  it("surfaces an error state with a retry when the updates query fails and there is no data", () => {
    const refetch = vi.fn();
    mockProjectProfile({ allUpdates: [], isUpdatesError: true, refetch });

    render(<UpdatesContent />);

    const error = screen.getByTestId("updates-content-error");
    expect(error).toBeInTheDocument();

    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the error affordance alongside the server feed rather than hiding either", () => {
    mockProjectProfile({ allUpdates: [], isUpdatesError: true, hasUpdatesData: false });

    render(<UpdatesContent serverFeed={<div data-testid="server-feed">Server feed</div>} />);

    // Content stays readable AND the failure is visible with a way to recover.
    expect(screen.getByTestId("server-feed")).toBeInTheDocument();
    expect(screen.getByTestId("updates-content-error")).toBeInTheDocument();
  });

  it("still surfaces the error when stale data is on screen, so a failed refresh is never silent", () => {
    // QA scenario A1: blocking the /updates request left the filters inert with
    // no message and no retry, because the error was suppressed whenever data
    // existed (including data seeded by the server prefetch).
    mockProjectProfile({ allUpdates: [{ uid: "1" }], isUpdatesError: true });

    render(<UpdatesContent />);

    expect(screen.getByTestId("updates-content-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
  });

  it("shows the interactive feed once the client query returns data", () => {
    mockProjectProfile({ allUpdates: [{ uid: "1" }], isUpdating: false });

    render(<UpdatesContent serverFeed={<div data-testid="server-feed">Server feed</div>} />);

    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    expect(screen.queryByTestId("server-feed")).not.toBeInTheDocument();
  });
});

/**
 * A filtered query can succeed with zero results. Gating the server feed on item
 * count rather than on the query having returned kept the UNFILTERED server feed
 * on screen in that case, so the user saw stale content instead of "no results".
 */
describe("UpdatesContent — successful empty filtered query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFiltersProps = {};
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue({ replace: vi.fn() });
    (useSearchParams as vi.Mock).mockReturnValue(buildSearchParams({ filter: "milestones" }));
    mockStores();
    mockProjectProfile();
  });

  it("drops the server feed once the filtered query returns, even with zero items", () => {
    mockProjectProfile({ allUpdates: [], isUpdating: false, hasUpdatesData: true });

    render(<UpdatesContent serverFeed={<div data-testid="server-feed">Server feed</div>} />);

    expect(screen.queryByTestId("server-feed")).not.toBeInTheDocument();
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
  });
});
