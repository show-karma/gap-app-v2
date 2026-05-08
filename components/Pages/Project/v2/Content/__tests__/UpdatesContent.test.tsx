import { render, screen } from "@testing-library/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useOwnerStore, useProjectStore } from "@/store";
import type { ActivityFilterType } from "@/types/v2/project-profile.types";
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

function mockStores({ isOwner = false, isProjectAdmin = false } = {}) {
  (useOwnerStore as unknown as vi.Mock).mockImplementation((sel) => sel({ isOwner }));
  (useProjectStore as unknown as vi.Mock).mockImplementation((sel) => sel({ isProjectAdmin }));
}

function mockProjectProfile(overrides: Record<string, unknown> = {}) {
  (useProjectProfile as vi.Mock).mockReturnValue({
    allUpdates: [],
    milestonesCount: 0,
    completedCount: 0,
    isUpdating: false,
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
