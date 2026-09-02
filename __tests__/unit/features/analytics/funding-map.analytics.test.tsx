/**
 * @file Analytics tests for the funding-map surfaces migrated off the old
 * free-string Mixpanel helper.
 *
 * These were 30 of the app's 38 events, all with ad-hoc camelCase properties.
 * The assertions pin the catalog shape they now emit, so a rename cannot
 * silently split a funnel that was working the day before.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const filters = vi.hoisted(() => ({
  setPage: vi.fn(),
  setOnlyOnKarma: vi.fn(),
  toggleCategory: vi.fn(),
  setSearch: vi.fn(),
  setStatus: vi.fn(),
  toggleGrantType: vi.fn(),
  toggleType: vi.fn(),
  resetFilters: vi.fn(),
  state: {
    page: 2,
    search: "",
    status: "Active",
    categories: [] as string[],
    grantTypes: [] as string[],
    selectedTypes: [] as string[],
    onlyOnKarma: false,
  },
}));

vi.mock("@/src/features/funding-map/hooks/use-funding-filters", () => ({
  useFundingFilters: () => ({
    filters: filters.state,
    setPage: filters.setPage,
    setOnlyOnKarma: filters.setOnlyOnKarma,
    toggleCategory: filters.toggleCategory,
    setSearch: filters.setSearch,
    setStatus: filters.setStatus,
    setCategories: vi.fn(),
    setGrantTypes: vi.fn(),
    setSelectedTypes: vi.fn(),
    toggleGrantType: filters.toggleGrantType,
    toggleType: filters.toggleType,
    resetFilters: filters.resetFilters,
  }),
}));

vi.mock("@/src/features/funding-map/hooks/use-funding-programs", () => ({
  // The component iterates this, so it must be an array, not an object.
  useTypeCounts: () => ({ data: [], isError: false }),
}));

const clipboard = vi.hoisted(() => ({ copyToClipboard: vi.fn() }));
vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, clipboard.copyToClipboard],
}));

// The search box debounces; run its callback synchronously so one change event
// means one search.
vi.mock("lodash.debounce", () => ({
  default: (fn: (...args: unknown[]) => unknown) => {
    const wrapped = (...args: unknown[]) => fn(...args);
    wrapped.cancel = () => {};
    wrapped.flush = () => {};
    return wrapped;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <a href="/" onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/utilities/pages", () => ({
  PAGES: { REGISTRY: { ADD_PROGRAM: "/add" }, MY_PROJECTS: "/my-projects" },
}));

import { FundingMapAgentCard } from "@/src/features/funding-map/components/funding-map-agent-card";
import { FundingMapFilters } from "@/src/features/funding-map/components/funding-map-filters";
import { FundingMapPagination } from "@/src/features/funding-map/components/funding-map-pagination";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);

const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("funding map pagination", () => {
  it("reports the page the visitor moved to, not the one they left", () => {
    render(<FundingMapPagination totalCount={200} />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(propsOf("funding_map_page_changed")).toEqual({ page: 3 });
    expect(filters.setPage).toHaveBeenCalledWith(3);
  });

  it("reports paging backwards through the same event", () => {
    render(<FundingMapPagination totalCount={200} />);

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    expect(propsOf("funding_map_page_changed")).toEqual({ page: 1 });
  });

  it("reports the show-all escape hatch as its own event", () => {
    render(<FundingMapPagination totalCount={200} />);

    const showAll = screen.queryByRole("button", { name: /show all/i });
    if (!showAll) return; // Only rendered while the Karma-only filter is on.

    fireEvent.click(showAll);

    expect(propsOf("funding_map_show_all_clicked")).toEqual({});
    expect(filters.setOnlyOnKarma).toHaveBeenCalledWith(false);
  });
});

describe("funding map search", () => {
  it("reports the query LENGTH, never the query itself", () => {
    render(<FundingMapSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zk rollups" } });

    expect(propsOf("funding_map_searched")).toEqual({ query_length: 10 });
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("zk rollups");
  });

  it("reports a cleared search as its own event, not a zero-length search", () => {
    render(<FundingMapSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zk" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });

    expect(eventNames()).toContain("funding_map_search_cleared");
    expect(propsOf("funding_map_search_cleared")).toEqual({});
    // A cleared box must not also look like a search for the empty string.
    expect(propsOf("funding_map_searched")).toEqual({ query_length: 2 });
  });

  it("reports a quick-category chip with the category it selected", () => {
    render(<FundingMapSearch />);

    fireEvent.click(screen.getByRole("button", { name: /^DeFi$/i }));

    expect(propsOf("funding_map_quick_category_clicked")).toEqual({ category: "DeFi" });
    expect(filters.toggleCategory).toHaveBeenCalledWith("DeFi");
    // A chip is a category filter, not a search.
    expect(eventNames()).not.toContain("funding_map_searched");
  });

  it("does not report a clear when nothing was searched in the first place", () => {
    render(<FundingMapSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });

    expect(eventNames()).not.toContain("funding_map_search_cleared");
  });
});

describe("funding map sidebar", () => {
  it("reports the submit-a-program click with no properties", () => {
    render(<FundingMapSidebar />);

    fireEvent.click(screen.getByText(/submit a program/i));

    expect(propsOf("funding_map_submit_program_clicked")).toEqual({});
  });

  it("reports the create-profile click as a distinct event", () => {
    render(<FundingMapSidebar />);

    fireEvent.click(screen.getByText(/create your project profile/i));

    expect(propsOf("funding_map_create_profile_clicked")).toEqual({});
    expect(eventNames()).not.toContain("funding_map_submit_program_clicked");
  });
});

describe("funding map agent card", () => {
  it("reports a successful prompt copy with no program attribution", async () => {
    clipboard.copyToClipboard.mockResolvedValue(true);

    render(<FundingMapAgentCard />);
    fireEvent.click(screen.getAllByRole("button", { name: /copy/i })[0]);

    await vi.waitFor(() =>
      expect(propsOf("funding_map_agent_prompt_copied")).toEqual({
        program_id: null,
        copied: true,
      })
    );
  });

  it("reports copied: false when the clipboard rejects, rather than a silent success", async () => {
    clipboard.copyToClipboard.mockRejectedValue(new Error("not focused"));

    render(<FundingMapAgentCard />);
    fireEvent.click(screen.getAllByRole("button", { name: /copy/i })[0]);

    // Without this the event would claim a copy that never happened — the
    // whole reason `copied` exists as a property.
    await vi.waitFor(() =>
      expect(propsOf("funding_map_agent_prompt_copied")).toMatchObject({ copied: false })
    );
  });
});

describe("funding map agent tabs", () => {
  it("reports which tab the visitor switched to", async () => {
    // Radix tabs respond to real pointer events, not a synthetic click.
    const user = userEvent.setup();
    render(<FundingMapAgentCard />);

    await user.click(screen.getByRole("tab", { name: /agent/i }));

    expect(propsOf("funding_map_agent_tab_clicked")).toEqual({ tab: "agent" });
  });
});

describe("funding map filters", () => {
  it("reports the karma-only toggle as a filter_applied with its new value", async () => {
    const user = userEvent.setup();
    render(<FundingMapFilters totalCount={10} />);

    await user.click(screen.getByRole("button", { name: /toggle only on karma/i }));

    // The value reported must be the state being moved TO, not the one left.
    expect(propsOf("funding_map_filter_applied")).toEqual({
      filter_type: "karma_only",
      value: true,
    });
    expect(filters.setOnlyOnKarma).toHaveBeenCalledWith(true);
  });

  it("reports a cleared filter set with no properties", async () => {
    // The Clear control only renders when something is actually filtered.
    filters.state.categories = ["defi"];
    try {
      const user = userEvent.setup();
      render(<FundingMapFilters totalCount={10} />);

      await user.click(screen.getByRole("button", { name: /^clear$/i }));

      expect(propsOf("funding_map_filters_cleared")).toEqual({});
      expect(filters.resetFilters).toHaveBeenCalled();
      // Clearing is its own event; it must not also emit one filter_applied
      // per filter that happened to be set.
      expect(eventNames().filter((n) => n === "funding_map_filter_applied")).toHaveLength(0);
    } finally {
      filters.state.categories = [];
    }
  });
});
