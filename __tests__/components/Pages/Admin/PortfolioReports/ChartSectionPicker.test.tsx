import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChartSectionPicker } from "@/components/Pages/Admin/PortfolioReports/ChartSectionPicker";
import { useAutosyncedIndicators } from "@/hooks/useAutosyncedIndicators";

vi.mock("@/hooks/useAutosyncedIndicators");

const mockUseAutosyncedIndicators = vi.mocked(useAutosyncedIndicators);

const SYSTEM_INDICATORS = [
  {
    id: "ind-commits",
    name: "Commits",
    description: "",
    unitOfMeasure: "count",
    syncType: "auto" as const,
  },
  {
    id: "ind-tvl",
    name: "TVL",
    description: "",
    unitOfMeasure: "USD",
    syncType: "auto" as const,
  },
  {
    id: "ind-devs",
    name: "Active Developers",
    description: "",
    unitOfMeasure: "count",
    syncType: "auto" as const,
  },
];

function setupGroupedIndicators(loading = false) {
  mockUseAutosyncedIndicators.mockReturnValue({
    data: loading ? undefined : SYSTEM_INDICATORS,
    isLoading: loading,
  } as any);
}

describe("ChartSectionPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupGroupedIndicators();
  });

  it("renders empty state when no indicators are selected", () => {
    render(<ChartSectionPicker communityId="community-1" value={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/No indicators selected/i)).toBeInTheDocument();
  });

  it("renders one row per selected indicator", () => {
    render(
      <ChartSectionPicker
        communityId="community-1"
        value={["ind-commits", "ind-tvl"]}
        onChange={vi.fn()}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Commits")).toBeInTheDocument();
    expect(within(items[1]).getByText("TVL")).toBeInTheDocument();
  });

  it("removes an indicator when its close button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChartSectionPicker
        communityId="community-1"
        value={["ind-commits", "ind-tvl"]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /remove commits/i }));

    expect(onChange).toHaveBeenCalledWith(["ind-tvl"]);
  });

  it("opens the dialog and lets users add new indicators in catalog order", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChartSectionPicker communityId="community-1" value={[]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /add indicators/i }));

    expect(screen.getByText(/System indicators/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /TVL/i }));
    await user.click(screen.getByRole("checkbox", { name: /Commits/i }));

    await user.click(screen.getByRole("button", { name: /save selection/i }));

    // Catalog order is Commits, TVL — both were checked, so save emits them
    // in the canonical catalog order (Commits before TVL).
    expect(onChange).toHaveBeenCalledWith(["ind-commits", "ind-tvl"]);
  });

  it("preserves admin-defined order when editing an existing selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChartSectionPicker
        communityId="community-1"
        // Selection order is intentionally NOT the catalog order
        value={["ind-tvl", "ind-commits"]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /edit selection/i }));
    // Add a third indicator from the catalog
    await user.click(screen.getByRole("checkbox", { name: /Active Developers/i }));
    await user.click(screen.getByRole("button", { name: /save selection/i }));

    // Original order (TVL, Commits) is kept; newly added items are appended.
    expect(onChange).toHaveBeenCalledWith(["ind-tvl", "ind-commits", "ind-devs"]);
  });

  it("shows a warning when more than 10 indicators are selected", () => {
    const elevenIds = Array.from({ length: 11 }, (_, i) => `ind-${i}`);
    mockUseAutosyncedIndicators.mockReturnValue({
      data: elevenIds.map((id) => ({
        id,
        name: id,
        description: "",
        unitOfMeasure: "count",
        syncType: "auto" as const,
      })),
      isLoading: false,
    } as any);

    render(<ChartSectionPicker communityId="community-1" value={elevenIds} onChange={vi.fn()} />);

    expect(screen.getByText(/11 indicators will make the report larger/i)).toBeInTheDocument();
  });
});
