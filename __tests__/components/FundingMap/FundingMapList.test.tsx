import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { useFundingFilters } from "@/src/features/funding-map/hooks/use-funding-filters";

vi.mock("@/src/features/funding-map/components/funding-map-filters", () => ({
  FundingMapFilters: vi.fn(() => <div data-testid="funding-map-filters" />),
}));

vi.mock("@/src/features/funding-map/components/funding-map-pagination", () => ({
  FundingMapPagination: vi.fn(() => <div data-testid="funding-map-pagination" />),
}));

vi.mock("@/src/features/funding-map/components/funding-program-details-dialog", () => ({
  FundingProgramDetailsDialog: vi.fn(() => <div data-testid="funding-program-details-dialog" />),
}));

vi.mock("@/src/features/funding-map/hooks/use-funding-programs", () => ({
  useFundingPrograms: vi.fn(() => ({
    data: { programs: [], count: 0 },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useFundingProgramByCompositeId: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useTypeCounts: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

const defaultFilters = {
  apiParams: {},
  programId: "",
  setProgramId: vi.fn(),
  filters: {
    page: 1,
    search: "",
    status: "Active",
    categories: [],
    ecosystems: [],
    networks: [],
    grantTypes: [],
    onlyOnKarma: false,
    organizationFilter: null,
    selectedTypes: [],
  },
};

vi.mock("@/src/features/funding-map/hooks/use-funding-filters", () => ({
  useFundingFilters: vi.fn(() => ({
    apiParams: {},
    programId: "",
    setProgramId: vi.fn(),
    filters: {
      page: 1,
      search: "",
      status: "Active",
      categories: [],
      ecosystems: [],
      networks: [],
      grantTypes: [],
      onlyOnKarma: false,
      organizationFilter: null,
      selectedTypes: [],
    },
  })),
}));

const mockUseFundingFilters = useFundingFilters as vi.Mock;

describe("FundingMapList empty state", () => {
  afterEach(() => {
    mockUseFundingFilters.mockReset();
    mockUseFundingFilters.mockReturnValue(defaultFilters);
  });

  it("shows 'no programs available' message when filters are at defaults", () => {
    render(<FundingMapList />);

    expect(
      screen.getByText("There are no funding programs available at the moment.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Try adjusting your filters to find more programs.")
    ).not.toBeInTheDocument();
  });

  it("shows 'try adjusting your filters' when onlyOnKarma is toggled on", () => {
    // Use mockReturnValue (not Once) because React may call hooks multiple times per render
    mockUseFundingFilters.mockReturnValue({
      ...defaultFilters,
      filters: {
        ...defaultFilters.filters,
        onlyOnKarma: true,
      },
    });

    render(<FundingMapList />);

    expect(
      screen.getByText("Try adjusting your filters to find more programs.")
    ).toBeInTheDocument();
  });
});
