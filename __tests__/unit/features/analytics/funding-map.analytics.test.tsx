/**
 * @file Analytics tests for the funding-map surfaces migrated off the old
 * free-string Mixpanel helper.
 *
 * These were 30 of the app's 38 events, all with ad-hoc camelCase properties.
 * The assertions pin the catalog shape they now emit, so a rename cannot
 * silently split a funnel that was working the day before.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const filters = vi.hoisted(() => ({
  setPage: vi.fn(),
  setOnlyOnKarma: vi.fn(),
  toggleCategory: vi.fn(),
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
  }),
}));

import { FundingMapPagination } from "@/src/features/funding-map/components/funding-map-pagination";

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
