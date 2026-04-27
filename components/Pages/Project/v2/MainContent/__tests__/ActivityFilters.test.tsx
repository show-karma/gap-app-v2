import { fireEvent, render, screen, within } from "@testing-library/react";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";
import { ActivityFilters, type ActivityFilterType } from "../ActivityFilters";

// ─── Shared mock for Radix Popover ────────────────────────────────────────────
// Renders content inline so we can assert on it without portal issues.
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover-root" data-open={String(!!open)}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// ─── Shared mock for Radix Slider ─────────────────────────────────────────────
// Renders two native <input type="range"> elements so we can fire events
// against them without needing a full DOM pointer-events implementation.
vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    value,
    onValueChange,
    onValueCommit,
    thumbLabels,
    min = 0,
    max = 10,
    step = 1,
  }: {
    value?: number[];
    onValueChange?: (v: number[]) => void;
    onValueCommit?: (v: number[]) => void;
    thumbLabels?: string[];
    min?: number;
    max?: number;
    step?: number;
  }) => {
    const vals = value ?? [min, max];
    return (
      <div data-testid="slider-root">
        {vals.map((v, i) => (
          <input
            key={thumbLabels?.[i] ?? i}
            type="range"
            aria-label={thumbLabels?.[i]}
            min={min}
            max={max}
            step={step}
            value={v}
            onChange={(e) => {
              const next = [...vals];
              next[i] = Number(e.target.value);
              onValueChange?.(next);
            }}
            onPointerUp={(e) => {
              const next = [...vals];
              next[i] = Number((e.target as HTMLInputElement).value);
              onValueCommit?.(next);
            }}
          />
        ))}
      </div>
    );
  },
}));

describe("ActivityFilters - Milestone Status Dropdown Visibility", () => {
  const defaultProps = {
    activeFilters: [] as ActivityFilterType[],
    onFilterToggle: vi.fn(),
    counts: { funding: 2, milestones: 3, updates: 1, endorsements: 1 } as Partial<
      Record<ActivityFilterType, number>
    >,
    milestoneStatusFilter: "all" as MilestoneStatusFilter,
    onMilestoneStatusChange: vi.fn(),
  };

  it("hides milestone status dropdown when no filters are active (All)", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={[]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("shows milestone status dropdown when milestones filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["milestones"]} />);

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("shows milestone status dropdown when milestones filter is active alongside others", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["milestones", "funding"]} />);

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("hides milestone status dropdown when only funding filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["funding"]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when only endorsements filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["endorsements"]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when only updates filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["updates"]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when milestoneStatusFilter prop is undefined", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        milestoneStatusFilter={undefined}
        onMilestoneStatusChange={undefined}
      />
    );

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when onMilestoneStatusChange is undefined", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={undefined}
      />
    );

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });
});

describe("ActivityFilters - Milestone Status Dropdown Options", () => {
  it("renders the milestone status trigger with correct value", () => {
    render(
      <ActivityFilters
        activeFilters={["milestones"]}
        onFilterToggle={vi.fn()}
        counts={{ milestones: 3 }}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    const trigger = screen.getByTestId("milestone-status-filter");
    expect(trigger).toBeInTheDocument();
    // The trigger should display the current value text
    expect(trigger).toHaveTextContent("All statuses");
  });
});

// ─── Helpers shared by new suites ─────────────────────────────────────────────

function subtractDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const baseProps = {
  activeFilters: [] as ActivityFilterType[],
  onFilterToggle: vi.fn(),
};

function renderFilters(overrides: Partial<Parameters<typeof ActivityFilters>[0]> = {}) {
  return render(<ActivityFilters {...baseProps} {...overrides} />);
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

describe("ActivityFilters — DateRangePicker label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "All time" trigger label when no dateFrom/dateTo', () => {
    renderFilters();
    expect(
      screen.getByRole("button", { name: /date range filter: all time/i })
    ).toBeInTheDocument();
  });

  it('renders "Last 7 days" label when dateFrom matches 7-day preset', () => {
    renderFilters({ dateFrom: subtractDays(7) });
    expect(
      screen.getByRole("button", { name: /date range filter: last 7 days/i })
    ).toBeInTheDocument();
  });

  it('renders "Last 30 days" label when dateFrom matches 30-day preset', () => {
    renderFilters({ dateFrom: subtractDays(30) });
    expect(
      screen.getByRole("button", { name: /date range filter: last 30 days/i })
    ).toBeInTheDocument();
  });

  it('renders "Last 90 days" label when dateFrom matches 90-day preset', () => {
    renderFilters({ dateFrom: subtractDays(90) });
    expect(
      screen.getByRole("button", { name: /date range filter: last 90 days/i })
    ).toBeInTheDocument();
  });

  it("shows Clear button only when a date range is active", () => {
    renderFilters({ dateFrom: subtractDays(7) });
    expect(screen.getByRole("button", { name: /clear date filter/i })).toBeInTheDocument();
  });

  it("does NOT show Clear button when no dates set", () => {
    renderFilters();
    expect(screen.queryByRole("button", { name: /clear date filter/i })).not.toBeInTheDocument();
  });
});

describe("ActivityFilters — DateRangePicker popover content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("popover always renders preset buttons and custom range inputs", () => {
    renderFilters();
    const content = screen.getByTestId("popover-content");
    expect(within(content).getByRole("button", { name: /last 7 days/i })).toBeInTheDocument();
    expect(within(content).getByRole("button", { name: /last 30 days/i })).toBeInTheDocument();
    expect(within(content).getByRole("button", { name: /last 90 days/i })).toBeInTheDocument();
    expect(within(content).getByRole("button", { name: /^all time$/i })).toBeInTheDocument();
    expect(within(content).getByLabelText(/^from$/i)).toBeInTheDocument();
    expect(within(content).getByLabelText(/^to$/i)).toBeInTheDocument();
  });

  it("Apply button is disabled when both from and to are empty", () => {
    renderFilters();
    const content = screen.getByTestId("popover-content");
    expect(within(content).getByRole("button", { name: /apply/i })).toBeDisabled();
  });
});

describe("ActivityFilters — DateRangePicker preset callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking 'Last 7 days' calls onDateRangeChange(7-day ISO, undefined)", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ onDateRangeChange });

    const content = screen.getByTestId("popover-content");
    fireEvent.click(within(content).getByRole("button", { name: /last 7 days/i }));

    expect(onDateRangeChange).toHaveBeenCalledTimes(1);
    const [from, to] = onDateRangeChange.mock.calls[0];
    expect(from).toBe(subtractDays(7));
    expect(to).toBeUndefined();
  });

  it("clicking 'Last 30 days' calls onDateRangeChange(30-day ISO, undefined)", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ onDateRangeChange });

    const content = screen.getByTestId("popover-content");
    fireEvent.click(within(content).getByRole("button", { name: /last 30 days/i }));

    const [from, to] = onDateRangeChange.mock.calls[0];
    expect(from).toBe(subtractDays(30));
    expect(to).toBeUndefined();
  });

  it("clicking 'Last 90 days' calls onDateRangeChange(90-day ISO, undefined)", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ onDateRangeChange });

    const content = screen.getByTestId("popover-content");
    fireEvent.click(within(content).getByRole("button", { name: /last 90 days/i }));

    const [from, to] = onDateRangeChange.mock.calls[0];
    expect(from).toBe(subtractDays(90));
    expect(to).toBeUndefined();
  });

  it("clicking 'All time' calls onDateRangeChange(undefined, undefined)", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ dateFrom: subtractDays(7), onDateRangeChange });

    const content = screen.getByTestId("popover-content");
    fireEvent.click(within(content).getByRole("button", { name: /^all time$/i }));

    expect(onDateRangeChange).toHaveBeenCalledWith(undefined, undefined);
  });

  it("clicking Clear button calls onDateRangeChange(undefined, undefined)", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ dateFrom: subtractDays(7), onDateRangeChange });

    fireEvent.click(screen.getByRole("button", { name: /clear date filter/i }));

    expect(onDateRangeChange).toHaveBeenCalledWith(undefined, undefined);
  });
});

describe("ActivityFilters — DateRangePicker custom range", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("typing from/to and clicking Apply calls onDateRangeChange(from, to)", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ onDateRangeChange });

    const content = screen.getByTestId("popover-content");
    fireEvent.change(within(content).getByLabelText(/^from$/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(within(content).getByLabelText(/^to$/i), {
      target: { value: "2024-01-31" },
    });
    fireEvent.click(within(content).getByRole("button", { name: /apply/i }));

    expect(onDateRangeChange).toHaveBeenCalledWith("2024-01-01", "2024-01-31");
  });

  it("when from > to, values are swapped before callback fires", () => {
    const onDateRangeChange = vi.fn();
    renderFilters({ onDateRangeChange });

    const content = screen.getByTestId("popover-content");
    // Intentionally reversed: later date entered as "from"
    fireEvent.change(within(content).getByLabelText(/^from$/i), {
      target: { value: "2024-03-31" },
    });
    fireEvent.change(within(content).getByLabelText(/^to$/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.click(within(content).getByRole("button", { name: /apply/i }));

    // Expect alphabetically/chronologically correct order
    expect(onDateRangeChange).toHaveBeenCalledWith("2024-01-01", "2024-03-31");
  });

  it("Apply is enabled when only from is set", () => {
    renderFilters();
    const content = screen.getByTestId("popover-content");
    fireEvent.change(within(content).getByLabelText(/^from$/i), {
      target: { value: "2024-01-01" },
    });
    expect(within(content).getByRole("button", { name: /apply/i })).not.toBeDisabled();
  });
});

// ─── AI Evaluation sub-filter visibility ─────────────────────────────────────

describe("ActivityFilters — AI Evaluation filter visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is NOT rendered when 'milestones' is not in activeFilters", () => {
    renderFilters({
      activeFilters: ["funding"],
      milestoneStatusFilter: "completed",
      onMilestoneStatusChange: vi.fn(),
    });
    expect(screen.queryByRole("group", { name: /ai evaluation/i })).not.toBeInTheDocument();
  });

  it("IS rendered when milestoneStatusFilter is 'all'", () => {
    renderFilters({
      activeFilters: ["milestones"],
      milestoneStatusFilter: "all",
      onMilestoneStatusChange: vi.fn(),
    });
    expect(screen.queryByRole("group", { name: /ai evaluation/i })).toBeInTheDocument();
  });

  it("is NOT rendered when milestoneStatusFilter is 'pending'", () => {
    renderFilters({
      activeFilters: ["milestones"],
      milestoneStatusFilter: "pending",
      onMilestoneStatusChange: vi.fn(),
    });
    expect(screen.queryByRole("group", { name: /ai evaluation/i })).not.toBeInTheDocument();
  });

  it("IS rendered when milestones active AND status is 'completed'", () => {
    renderFilters({
      activeFilters: ["milestones"],
      milestoneStatusFilter: "completed",
      onMilestoneStatusChange: vi.fn(),
    });
    // The AIEvaluationFilter renders a <fieldset> with legend "AI Evaluation".
    // Use getByRole('group') which maps to <fieldset> to avoid ambiguity with
    // the "Has AI evaluation" label that also matches /ai evaluation/i.
    expect(screen.getByRole("group", { name: /ai evaluation/i })).toBeInTheDocument();
  });

  it("IS rendered when milestones active AND status is 'verified'", () => {
    renderFilters({
      activeFilters: ["milestones"],
      milestoneStatusFilter: "verified",
      onMilestoneStatusChange: vi.fn(),
    });
    expect(screen.getByRole("group", { name: /ai evaluation/i })).toBeInTheDocument();
  });
});

// ─── AI Evaluation sub-filter interactions ────────────────────────────────────

describe("ActivityFilters — AI Evaluation filter interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Props that put the AI filter in a visible state
  const aiVisibleProps = {
    activeFilters: ["milestones"] as ActivityFilterType[],
    milestoneStatusFilter: "completed" as MilestoneStatusFilter,
    onMilestoneStatusChange: vi.fn(),
  };

  it("sliders are hidden when toggle is off (no hasAIEvaluation, no aiScoreMin/Max)", () => {
    renderFilters({ ...aiVisibleProps });
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("toggling on calls onAIFilterChange({ hasEvaluation: true, scoreMin: undefined, scoreMax: undefined })", () => {
    const onAIFilterChange = vi.fn();
    renderFilters({ ...aiVisibleProps, onAIFilterChange });

    fireEvent.click(screen.getByRole("checkbox", { name: /has ai evaluation/i }));

    expect(onAIFilterChange).toHaveBeenCalledWith({
      hasEvaluation: true,
      scoreMin: undefined,
      scoreMax: undefined,
    });
  });

  it("two slider thumbs are visible when hasAIEvaluation is true", () => {
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true });
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("two slider thumbs are visible when aiScoreMin > 0", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 5 });
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("two slider thumbs are visible when aiScoreMax < 10", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMax: 8 });
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("min thumb has aria-label 'Minimum score'", () => {
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true });
    expect(screen.getByRole("slider", { name: "Minimum score" })).toBeInTheDocument();
  });

  it("max thumb has aria-label 'Maximum score'", () => {
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true });
    expect(screen.getByRole("slider", { name: "Maximum score" })).toBeInTheDocument();
  });

  it("committing min thumb calls onAIFilterChange with scoreMin set", () => {
    const onAIFilterChange = vi.fn();
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true, onAIFilterChange });

    const minSlider = screen.getByRole("slider", { name: "Minimum score" });
    fireEvent.change(minSlider, { target: { value: "3" } });
    fireEvent.pointerUp(minSlider, { target: { value: "3" } });

    expect(onAIFilterChange).toHaveBeenCalledWith({
      hasEvaluation: undefined,
      scoreMin: 3,
      scoreMax: undefined,
    });
  });

  it("committing max thumb calls onAIFilterChange with scoreMax set", () => {
    const onAIFilterChange = vi.fn();
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true, onAIFilterChange });

    const maxSlider = screen.getByRole("slider", { name: "Maximum score" });
    fireEvent.change(maxSlider, { target: { value: "8" } });
    fireEvent.pointerUp(maxSlider, { target: { value: "8" } });

    expect(onAIFilterChange).toHaveBeenCalledWith({
      hasEvaluation: undefined,
      scoreMin: undefined,
      scoreMax: 8,
    });
  });

  it("committing both min=5 and max=8 calls onAIFilterChange with both set", () => {
    const onAIFilterChange = vi.fn();
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true, aiScoreMin: 5, onAIFilterChange });

    const maxSlider = screen.getByRole("slider", { name: "Maximum score" });
    fireEvent.change(maxSlider, { target: { value: "8" } });
    fireEvent.pointerUp(maxSlider, { target: { value: "8" } });

    expect(onAIFilterChange).toHaveBeenCalledWith({
      hasEvaluation: undefined,
      scoreMin: 5,
      scoreMax: 8,
    });
  });

  it("dragging slider without releasing does NOT commit (no refetch while dragging)", () => {
    const onAIFilterChange = vi.fn();
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true, onAIFilterChange });

    fireEvent.change(screen.getByRole("slider", { name: "Minimum score" }), {
      target: { value: "7" },
    });

    expect(onAIFilterChange).not.toHaveBeenCalled();
  });

  it("toggling off clears hasEvaluation, scoreMin, AND scoreMax", () => {
    const onAIFilterChange = vi.fn();
    renderFilters({
      ...aiVisibleProps,
      hasAIEvaluation: true,
      aiScoreMin: 3,
      aiScoreMax: 8,
      onAIFilterChange,
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /has ai evaluation/i }));

    expect(onAIFilterChange).toHaveBeenCalledWith({
      hasEvaluation: undefined,
      scoreMin: undefined,
      scoreMax: undefined,
    });
  });

  it("default range [0, 10] shows 'Any' label", () => {
    renderFilters({ ...aiVisibleProps, hasAIEvaluation: true });
    expect(screen.getByText("Any")).toBeInTheDocument();
    expect(screen.queryByText(/≥/)).not.toBeInTheDocument();
    expect(screen.queryByText(/≤/)).not.toBeInTheDocument();
  });

  it("non-default range shows '≥ min — ≤ max' label", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 3, aiScoreMax: 8 });
    expect(screen.getByText(/≥\s*3/)).toBeInTheDocument();
    expect(screen.getByText(/≤\s*8/)).toBeInTheDocument();
  });

  it("min chip is green when min >= 8", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 8, aiScoreMax: 10 });
    const minBadge = screen.getByText(/≥\s*8/);
    expect(minBadge).toHaveClass("text-green-600");
  });

  it("min chip is yellow when min is 5–7", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 6, aiScoreMax: 9 });
    const minBadge = screen.getByText(/≥\s*6/);
    expect(minBadge).toHaveClass("text-yellow-600");
  });

  it("min chip is red when min is 1–4", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 3, aiScoreMax: 7 });
    const minBadge = screen.getByText(/≥\s*3/);
    expect(minBadge).toHaveClass("text-red-600");
  });

  it("max chip is green when max >= 8", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 5, aiScoreMax: 9 });
    const maxBadge = screen.getByText(/≤\s*9/);
    expect(maxBadge).toHaveClass("text-green-600");
  });

  it("max chip is yellow when max is 5–7", () => {
    renderFilters({ ...aiVisibleProps, aiScoreMin: 2, aiScoreMax: 7 });
    const maxBadge = screen.getByText(/≤\s*7/);
    expect(maxBadge).toHaveClass("text-yellow-600");
  });
});
