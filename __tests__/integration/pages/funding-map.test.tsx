import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FundingMapPage from "@/app/funding-map/page";

// Mocks are pre-registered in tests/bun-setup.ts
// Note: jest.clearAllMocks() is called automatically in bun-setup.ts afterEach
describe("FundingMapPage", () => {
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

  it("renders all FundingMap components on the page", () => {
    render(<FundingMapPage />);

    // The mocked components are rendered as divs with test IDs
    // This confirms all components are present in the page layout
    expect(screen.getByTestId("funding-map-list")).toBeInTheDocument();
    expect(screen.getByTestId("funding-map-search")).toBeInTheDocument();
    expect(screen.getByTestId("funding-map-sidebar")).toBeInTheDocument();
  });
});
