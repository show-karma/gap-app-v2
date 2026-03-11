import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { useFundingFilters } from "@/src/features/funding-map/hooks/use-funding-filters";

// SWC transforms @/ aliases to relative paths at compile time, so we must mock
// the actual file paths for the mocks to intercept the component's internal imports.
jest.mock("../../../src/features/funding-map/components/funding-map-filters", () => ({
  FundingMapFilters: jest.fn(() => <div data-testid="funding-map-filters" />),
}));

jest.mock("../../../src/features/funding-map/components/funding-map-pagination", () => ({
  FundingMapPagination: jest.fn(() => <div data-testid="funding-map-pagination" />),
}));

jest.mock("../../../src/features/funding-map/components/funding-program-details-dialog", () => ({
  FundingProgramDetailsDialog: jest.fn(() => <div data-testid="funding-program-details-dialog" />),
}));

jest.mock("../../../src/features/funding-map/hooks/use-funding-programs", () => ({
  useFundingPrograms: jest.fn(() => ({
    data: { programs: [], count: 0 },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useFundingProgramByCompositeId: jest.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useTypeCounts: jest.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

const defaultFilters = {
  apiParams: {},
  programId: "",
  setProgramId: jest.fn(),
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

jest.mock("../../../src/features/funding-map/hooks/use-funding-filters", () => ({
  useFundingFilters: jest.fn(() => ({
    apiParams: {},
    programId: "",
    setProgramId: jest.fn(),
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

const mockUseFundingFilters = useFundingFilters as jest.Mock;

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
