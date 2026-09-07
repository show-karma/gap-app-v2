import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";

import { FundingMapUrlState } from "@/src/features/funding-map/components/funding-map-url-state";
import {
  FundingFiltersProvider,
  useFundingFiltersValue,
} from "@/src/features/funding-map/context/funding-filters-context";

vi.mock("../../../../src/features/funding-map/components/funding-program-details-dialog", () => ({
  FundingProgramDetailsDialog: () => <div data-testid="dialog" />,
}));

vi.mock("../../../../src/features/funding-map/hooks/use-funding-programs", () => ({
  useFundingProgramByCompositeId: () => ({ data: null, isLoading: false, isFetched: false }),
}));

// nuqs is an external dep, so the suite-wide next/navigation mock never reaches
// it: it reads Next's real router contexts, which are provided here.
function AppRouter({ children }: { children: ReactNode }) {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    hmrRefresh: vi.fn(),
  };
  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value="/funding-map">
        <SearchParamsContext.Provider value={new URLSearchParams()}>
          {children}
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

const renders = vi.fn();

function ContextReader() {
  const { apiParams } = useFundingFiltersValue();
  renders(apiParams);
  if (renders.mock.calls.length > 200) {
    throw new Error(`render loop: ${renders.mock.calls.length} renders`);
  }
  return <span data-testid="page">{apiParams.page}</span>;
}

describe("FundingMapUrlState", () => {
  it("publishes the URL filters into the context without a re-render loop", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppRouter>
        <FundingFiltersProvider>
          <ContextReader />
          <FundingMapUrlState />
        </FundingFiltersProvider>
      </AppRouter>
    );

    const loopErrors = consoleError.mock.calls.filter((call) =>
      call.some((arg) => String(arg).includes("Maximum update depth"))
    );
    consoleError.mockRestore();

    expect(loopErrors).toHaveLength(0);
    expect(renders.mock.calls.length).toBeLessThan(10);
  });
});
