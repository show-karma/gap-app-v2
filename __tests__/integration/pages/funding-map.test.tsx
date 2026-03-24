import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import FundingMapPage from "@/app/funding-map/page";
import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";

vi.mock("@/src/features/funding-map/components/funding-map-list", () => ({
  FundingMapList: vi.fn(() => <div data-testid="funding-map-list" />),
}));

vi.mock("@/src/features/funding-map/components/funding-map-search", () => ({
  FundingMapSearch: vi.fn(() => <div data-testid="funding-map-search" />),
}));

vi.mock("@/src/features/funding-map/components/funding-map-sidebar", () => ({
  FundingMapSidebar: vi.fn(() => <div data-testid="funding-map-sidebar" />),
}));

describe("FundingMapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the FundingMapList component", () => {
    render(<FundingMapPage />);

    expect(screen.getByTestId("funding-map-list")).toBeInTheDocument();
  });

  it("renders the FundingMapSearch component", () => {
    render(<FundingMapPage />);

    expect(screen.getByTestId("funding-map-search")).toBeInTheDocument();
  });

  it("renders the FundingMapSidebar component", () => {
    render(<FundingMapPage />);

    expect(screen.getByTestId("funding-map-sidebar")).toBeInTheDocument();
  });

  it("calls all the FundingMap components", () => {
    render(<FundingMapPage />);

    expect(FundingMapList).toHaveBeenCalled();
    expect(FundingMapSearch).toHaveBeenCalled();
    expect(FundingMapSidebar).toHaveBeenCalled();
  });
});
