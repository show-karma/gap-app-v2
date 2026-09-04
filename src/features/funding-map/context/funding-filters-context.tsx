"use client";

import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";
import { DEFAULT_FUNDING_MAP_API_PARAMS } from "../constants/query-keys";
import type { FundingFilters } from "../hooks/use-funding-filters";
import type { FetchFundingProgramsParams } from "../types/funding-program";

/**
 * The seam between the funding map's URL state and the list that renders from it.
 *
 * `/funding-map` is sitemap-crawlable, so the program list has to be in the
 * prerendered HTML and DEV-612 forbids a Suspense boundary above it. But the
 * build named the list itself as a URL reader:
 *
 *   Route "/t/[tenant]/funding-map": `useSearchParams()` in a Client Component outside of `<Suspense>`
 *     at useFundingFilters (src/features/funding-map/hooks/use-funding-filters.ts:77:40)
 *     at FundingMapList (src/features/funding-map/components/funding-map-list.tsx:48:76)
 *
 * nuqs reads `useSearchParams()`, which goes through Next's
 * `useDynamicSearchParams` and aborts a prerender unconditionally — no sample
 * makes it static.
 *
 * So the list stops reading the URL. It reads this context, which starts at the
 * same default the server prefetched, and the controls — which live behind a
 * leaf boundary, because a search box is not crawlable content — own the nuqs
 * reads and push the effective params back down. Before hydration the list
 * renders the default page, which is what a crawler should index; after it, the
 * URL takes over.
 */

interface FundingFiltersState {
  apiParams: FetchFundingProgramsParams;
  filters: FundingFilters | null;
}

interface FundingFiltersContextValue extends FundingFiltersState {
  publish: (next: FundingFiltersState) => void;
  /**
   * Opens a program's dialog by writing `?programId=`. Published by the leaf,
   * because only the leaf may touch the URL. A no-op before hydration, which
   * costs nothing: without JS there is no click to handle.
   */
  openProgram: (id: string) => void;
  publishOpenProgram: (fn: (id: string) => void) => void;
}

const DEFAULT_STATE: FundingFiltersState = {
  apiParams: DEFAULT_FUNDING_MAP_API_PARAMS,
  filters: null,
};

const FundingFiltersContext = createContext<FundingFiltersContextValue>({
  ...DEFAULT_STATE,
  publish: () => {},
  openProgram: () => {},
  publishOpenProgram: () => {},
});

export function FundingFiltersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FundingFiltersState>(DEFAULT_STATE);
  const [openProgram, setOpenProgram] = useState<(id: string) => void>(() => () => {});

  const publishOpenProgram = useCallback((fn: (id: string) => void) => {
    setOpenProgram(() => fn);
  }, []);

  const value = useMemo<FundingFiltersContextValue>(
    () => ({ ...state, publish: setState, openProgram, publishOpenProgram }),
    [state, openProgram, publishOpenProgram]
  );

  return <FundingFiltersContext.Provider value={value}>{children}</FundingFiltersContext.Provider>;
}

/** For readers that must not touch the URL — the list. */
export function useFundingFiltersValue(): FundingFiltersState & {
  openProgram: (id: string) => void;
} {
  const { apiParams, filters, openProgram } = use(FundingFiltersContext);
  return { apiParams, filters, openProgram };
}

/**
 * Reads the URL and publishes it. Renders nothing, so the leaf `<Suspense>`
 * around it covers no content at all.
 */
export function useFundingFiltersPublisher() {
  const { publish, publishOpenProgram } = use(FundingFiltersContext);
  return { publish, publishOpenProgram };
}
