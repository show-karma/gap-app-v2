import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FundingMapPage from "@/app/t/[tenant]/(chrome)/funding-map/page";
import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";
import { fundingProgramsService } from "@/src/features/funding-map/services/funding-programs.service";

vi.mock("@/src/features/funding-map/components/funding-map-list", () => ({
  FundingMapList: vi.fn(() => <div data-testid="funding-map-list" />),
}));

vi.mock("@/src/features/funding-map/components/funding-map-search", () => ({
  FundingMapSearch: vi.fn(() => <div data-testid="funding-map-search" />),
}));

vi.mock("@/src/features/funding-map/components/funding-map-sidebar", () => ({
  FundingMapSidebar: vi.fn(() => <div data-testid="funding-map-sidebar" />),
}));

// The page prefetches the default program list server-side; keep the test
// hermetic. `prefetchQuery` swallows rejections, so a failure here would only
// skip hydration, but a resolved value exercises the real dehydrate path.
vi.mock("@/src/features/funding-map/services/funding-programs.service", () => ({
  fundingProgramsService: {
    getAll: vi.fn().mockResolvedValue({ programs: [], count: 0, totalPages: 0 }),
  },
}));

// FundingMapPage is an async server component: invoke it and render the
// resolved element (the RSC testing pattern for async pages). The
// HydrationBoundary it renders needs a client-side QueryClient, which the
// app's root providers supply in production.
async function renderPage() {
  const queryClient = new QueryClient();
  const page = await FundingMapPage();
  render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);
}

describe("FundingMapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the FundingMapList component", async () => {
    await renderPage();

    expect(screen.getByTestId("funding-map-list")).toBeInTheDocument();
  });

  it("renders the FundingMapSearch component", async () => {
    await renderPage();

    expect(screen.getByTestId("funding-map-search")).toBeInTheDocument();
  });

  it("renders the FundingMapSidebar component", async () => {
    await renderPage();

    expect(screen.getByTestId("funding-map-sidebar")).toBeInTheDocument();
  });

  it("calls all the FundingMap components", async () => {
    await renderPage();

    expect(FundingMapList).toHaveBeenCalled();
    expect(FundingMapSearch).toHaveBeenCalled();
    expect(FundingMapSidebar).toHaveBeenCalled();
  });

  it("prefetches the default program list for hydration", async () => {
    await renderPage();

    expect(fundingProgramsService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, status: "Active" })
    );
  });
});
