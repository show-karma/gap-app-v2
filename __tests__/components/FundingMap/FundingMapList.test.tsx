import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";

jest.mock("@/src/features/funding-map/components/funding-map-filters", () => ({
  FundingMapFilters: jest.fn(() => <div data-testid="funding-map-filters" />),
}));

jest.mock("@/src/features/funding-map/components/funding-map-pagination", () => ({
  FundingMapPagination: jest.fn(() => <div data-testid="funding-map-pagination" />),
}));

jest.mock("@/src/features/funding-map/components/funding-program-details-dialog", () => ({
  FundingProgramDetailsDialog: jest.fn(() => <div data-testid="funding-program-details-dialog" />),
}));

jest.mock("@/src/features/funding-map/hooks/use-funding-programs", () => ({
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
}));

jest.mock("@/src/features/funding-map/hooks/use-funding-filters", () => ({
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
      onlyOnKarma: true, // new default
      organizationFilter: null,
    },
  })),
}));

describe("FundingMapList empty state", () => {
  it("shows 'no programs available' message when filters are at defaults", () => {
    render(<FundingMapList />);

    expect(
      screen.getByText("There are no funding programs available at the moment.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Try adjusting your filters to find more programs.")
    ).not.toBeInTheDocument();
  });

  it("shows 'try adjusting your filters' when onlyOnKarma is toggled off", async () => {
    const { useFundingFilters } = await import(
      "@/src/features/funding-map/hooks/use-funding-filters"
    );
    (useFundingFilters as unknown as jest.Mock).mockReturnValueOnce({
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
      },
    });

    render(<FundingMapList />);

    expect(
      screen.getByText("Try adjusting your filters to find more programs.")
    ).toBeInTheDocument();
  });
});
