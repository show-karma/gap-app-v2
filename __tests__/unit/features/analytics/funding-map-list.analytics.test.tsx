/**
 * @file Analytics tests for the funding-map list surface.
 *
 * Kept out of `funding-map.analytics.test.tsx` deliberately: the list imports
 * the pagination and filter components that file renders directly, so mocking
 * them at module level there would replace the very components its own tests
 * exercise.
 *
 * The three events here are the ones that describe the health of the map
 * rather than a click on it:
 *   - `funding_map_viewed` once per mount,
 *   - `funding_map_empty_results` when a query legitimately finds nothing,
 *   - `funding_map_load_error` when the request itself failed.
 *
 * Empty and errored must never collapse into each other: "nobody matched your
 * filters" and "the API is down" look identical on a chart that counts only
 * one of them.
 */

import { render } from "@testing-library/react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const filters = vi.hoisted(() => ({
  setProgramId: vi.fn(),
  state: {
    page: 1,
    search: "",
    status: "",
    categories: [] as string[],
    grantTypes: [] as string[],
    selectedTypes: [] as string[],
    onlyOnKarma: false,
  },
}));

const programs = vi.hoisted(() => ({
  result: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown },
}));

// The list reads the context, not the hook — that split is the frame fix for
// `/funding-map` (`funding-map-list.tsx:48` -> `use-funding-filters.ts:77`
// aborted the prerender). The raw-hook mock below is still live: it feeds
// `FundingMapUrlState`, the leaf that reads the URL and publishes into this
// context, which the list renders and this suite does not stub.
vi.mock("@/src/features/funding-map/context/funding-filters-context", () => ({
  useFundingFiltersValue: () => ({
    apiParams: {},
    filters: filters.state,
    openProgram: () => {},
  }),
  useFundingFiltersPublisher: () => ({
    publish: () => {},
    publishOpenProgram: () => {},
  }),
}));

vi.mock("@/src/features/funding-map/hooks/use-funding-filters", () => ({
  useFundingFilters: () => ({
    apiParams: {},
    filters: filters.state,
    programId: "",
    setProgramId: filters.setProgramId,
  }),
}));

vi.mock("@/src/features/funding-map/hooks/use-funding-programs", () => ({
  useFundingPrograms: () => programs.result,
  useFundingProgramByCompositeId: () => ({ data: undefined, isLoading: false }),
}));

// Child surfaces are exercised by their own suites; here they only need to not
// pull the rest of the feature into the module graph.
vi.mock("@/src/features/funding-map/components/funding-map-card", () => ({
  FundingMapCard: () => <div data-testid="card" />,
}));
vi.mock("@/src/features/funding-map/components/funding-map-card-skeleton", () => ({
  FundingMapCardSkeleton: () => <div />,
}));
vi.mock("@/src/features/funding-map/components/funding-map-filters", () => ({
  FundingMapFilters: () => <div />,
}));
vi.mock("@/src/features/funding-map/components/funding-map-pagination", () => ({
  FundingMapPagination: () => <div />,
}));
vi.mock("@/src/features/funding-map/components/funding-program-details-dialog", () => ({
  FundingProgramDetailsDialog: () => <div />,
}));
vi.mock("@/utilities/pages", () => ({ PAGES: { REGISTRY: { ADD_PROGRAM: "/add" } } }));

import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);
const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  filters.state.search = "";
  filters.state.categories = [];
  programs.result = {
    data: { programs: [{ programId: "p1" }], totalCount: 1 },
    isLoading: false,
    isError: false,
    error: null,
  };
});

describe("funding map list", () => {
  it("reports funding_map_viewed once per mount", () => {
    render(<FundingMapList />);

    expect(eventNames().filter((n) => n === "funding_map_viewed")).toHaveLength(1);
    expect(propsOf("funding_map_viewed")).toMatchObject({ results_count: null });
  });

  it("reports empty results with the query length, never the query", () => {
    filters.state.search = "nonexistent grant";
    programs.result = {
      data: { programs: [], totalCount: 0 },
      isLoading: false,
      isError: false,
      error: null,
    };

    render(<FundingMapList />);

    expect(propsOf("funding_map_empty_results")).toEqual({
      has_filters: true,
      query_length: 17,
    });
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("nonexistent grant");
  });

  it("does not report empty results while the request is still loading", () => {
    programs.result = { data: undefined, isLoading: true, isError: false, error: null };

    render(<FundingMapList />);

    // An in-flight request is not an empty result; counting it would make the
    // empty-result rate a function of network latency.
    expect(eventNames()).not.toContain("funding_map_empty_results");
  });

  it("reports a load error instead of an empty result when the request fails", () => {
    const error = new Error("upstream down");
    error.name = "AxiosError";
    programs.result = { data: undefined, isLoading: false, isError: true, error };

    render(<FundingMapList />);

    expect(propsOf("funding_map_load_error")).toEqual({ error_code: "AxiosError" });
    // The two must stay distinguishable: "no matches" and "the API is down"
    // are the same shape on any chart that only counts one of them.
    expect(eventNames()).not.toContain("funding_map_empty_results");
  });

  it("carries a machine error_code on load failure, never the message", () => {
    const error = new Error("connect ECONNREFUSED 10.0.0.1:443");
    error.name = "AxiosError";
    programs.result = { data: undefined, isLoading: false, isError: true, error };

    render(<FundingMapList />);

    expect(JSON.stringify(propsOf("funding_map_load_error"))).not.toContain("ECONNREFUSED");
  });
});
