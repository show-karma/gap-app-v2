import { beforeAll, describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Local mock for FundingMapList which has its own unit tests
// NOT mocked globally in bun-setup.ts to preserve unit test isolation
jest.mock("@/src/features/funding-map/components/funding-map-list", () => ({
  FundingMapList: () => <div data-testid="funding-map-list">Funding Map List</div>,
}));

// Dynamic import to ensure mocks are applied before module loads
const getPage = async () => {
  const { default: FundingMapPage } = await import("@/app/funding-map/page");
  return FundingMapPage;
};

let FundingMapPage: Awaited<ReturnType<typeof getPage>>;

beforeAll(async () => {
  FundingMapPage = await getPage();
});

// Other mocks are pre-registered in tests/bun-setup.ts:
// - FundingMapSearch, FundingMapSidebar
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
