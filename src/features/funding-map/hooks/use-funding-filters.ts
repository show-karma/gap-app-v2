"use client";

import {
  createParser,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs";
import { useCallback, useMemo } from "react";
import { FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import type { FetchFundingProgramsParams } from "../types/funding-program";

/**
 * Encode special characters for URL storage
 * Newlines and other control characters aren't preserved in URL params by default
 */
function encodeForUrl(str: string): string {
  return encodeURIComponent(str);
}

/**
 * Decode URL-encoded string back to original
 */
function decodeFromUrl(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// Custom parser for comma-separated arrays
const parseAsCommaSeparatedArray = createParser({
  parse: (value: string) => (value ? value.split(",").filter(Boolean) : []),
  serialize: (value: string[]) => (value.length ? value.join(",") : ""),
});

/**
 * Parsed organization filter value
 */
export interface OrganizationFilterValue {
  type: "community" | "organization";
  id: string;
}

/**
 * Interface for the filter state
 */
export interface FundingFilters {
  page: number;
  search: string;
  status: string;
  categories: string[];
  ecosystems: string[];
  networks: string[];
  grantTypes: string[];
  onlyOnKarma: boolean;
  /** Organization filter - stores type:id format */
  organizationFilter: OrganizationFilterValue | null;
}

/**
 * Hook to manage funding map filter state via URL query params
 * Uses nuqs for URL state management
 */
export function useFundingFilters() {
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({ throttleMs: 300, clearOnDefault: true })
  );

  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("Active").withOptions({ clearOnDefault: true })
  );

  const [categories, setCategories] = useQueryState(
    "categories",
    parseAsCommaSeparatedArray.withDefault([]).withOptions({ clearOnDefault: true })
  );

  const [ecosystems, setEcosystems] = useQueryState(
    "ecosystems",
    parseAsCommaSeparatedArray.withDefault([]).withOptions({ clearOnDefault: true })
  );

  const [networks, setNetworks] = useQueryState(
    "networks",
    parseAsCommaSeparatedArray.withDefault([]).withOptions({ clearOnDefault: true })
  );

  const [grantTypes, setGrantTypes] = useQueryState(
    "grantTypes",
    parseAsCommaSeparatedArray.withDefault([]).withOptions({ clearOnDefault: true })
  );

  const [onlyOnKarma, setOnlyOnKarma] = useQueryState(
    "onlyOnKarma",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );

  // Organization filter - stores as "community:uid" or "organization:name"
  const [organizationFilterRaw, setOrganizationFilterRaw] = useQueryState(
    "org",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );

  // Program ID for opening the details dialog - format: "programId_chainId"
  const [programId, setProgramId] = useQueryState(
    "programId",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );

  // Parse organization filter value
  // The ID is URL-encoded to preserve special characters like newlines
  const organizationFilter = useMemo<OrganizationFilterValue | null>(() => {
    if (!organizationFilterRaw) return null;
    const [type, ...idParts] = organizationFilterRaw.split(":");
    const encodedId = idParts.join(":"); // Handle IDs that might contain colons
    if ((type === "community" || type === "organization") && encodedId) {
      // Decode the ID to get original value with special characters
      return { type, id: decodeFromUrl(encodedId) };
    }
    return null;
  }, [organizationFilterRaw]);

  // Helper to set organization filter
  // Encodes the ID to preserve special characters like newlines in URL
  const setOrganizationFilter = useCallback(
    (value: OrganizationFilterValue | null) => {
      // Encode the ID to preserve newlines and other special characters
      const serialized = value ? `${value.type}:${encodeForUrl(value.id)}` : "";
      setOrganizationFilterRaw(serialized);
      if (page !== 1) {
        setPage(1);
      }
    },
    [setOrganizationFilterRaw, page, setPage]
  );

  // Combine all filters into a single object
  const filters = useMemo<FundingFilters>(
    () => ({
      page,
      search,
      status,
      categories,
      ecosystems,
      networks,
      grantTypes,
      onlyOnKarma,
      organizationFilter,
    }),
    [
      page,
      search,
      status,
      categories,
      ecosystems,
      networks,
      grantTypes,
      onlyOnKarma,
      organizationFilter,
    ]
  );

  // Convert to API params format
  const apiParams = useMemo<FetchFundingProgramsParams>(
    () => ({
      page,
      pageSize: FUNDING_MAP_PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      categories: categories.length ? categories : undefined,
      ecosystems: ecosystems.length ? ecosystems : undefined,
      networks: networks.length ? networks : undefined,
      grantTypes: grantTypes.length ? grantTypes : undefined,
      onlyOnKarma: onlyOnKarma || undefined,
      communityUid: organizationFilter?.type === "community" ? organizationFilter.id : undefined,
      organization: organizationFilter?.type === "organization" ? organizationFilter.id : undefined,
    }),
    [
      page,
      search,
      status,
      categories,
      ecosystems,
      networks,
      grantTypes,
      onlyOnKarma,
      organizationFilter,
    ]
  );

  // Reset page to 1 when filters change
  const updateFilterAndResetPage = useCallback(
    <T>(setter: (value: T) => void, value: T) => {
      setter(value);
      if (page !== 1) {
        setPage(1);
      }
    },
    [page, setPage]
  );

  // Toggle a value in an array filter
  const toggleArrayFilter = useCallback(
    (currentValues: string[], setter: (value: string[]) => void, value: string) => {
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      updateFilterAndResetPage(setter, newValues);
    },
    [updateFilterAndResetPage]
  );

  // Reset all filters to defaults (keeps current page)
  const resetFilters = useCallback(() => {
    setSearch("");
    setStatus("Active");
    setCategories([]);
    setEcosystems([]);
    setNetworks([]);
    setGrantTypes([]);
    setOnlyOnKarma(false);
    setOrganizationFilterRaw("");
  }, [
    setSearch,
    setStatus,
    setCategories,
    setEcosystems,
    setNetworks,
    setGrantTypes,
    setOnlyOnKarma,
    setOrganizationFilterRaw,
  ]);

  return {
    // Current filter values
    filters,
    apiParams,

    // Individual setters
    setPage,
    setSearch: (value: string) => updateFilterAndResetPage(setSearch, value),
    setStatus: (value: string) => updateFilterAndResetPage(setStatus, value),
    setCategories: (value: string[]) => updateFilterAndResetPage(setCategories, value),
    setEcosystems: (value: string[]) => updateFilterAndResetPage(setEcosystems, value),
    setNetworks: (value: string[]) => updateFilterAndResetPage(setNetworks, value),
    setGrantTypes: (value: string[]) => updateFilterAndResetPage(setGrantTypes, value),
    setOnlyOnKarma: (value: boolean) => updateFilterAndResetPage(setOnlyOnKarma, value),
    setOrganizationFilter,

    // Toggle helpers for array filters
    toggleCategory: (value: string) => toggleArrayFilter(categories, setCategories, value),
    toggleEcosystem: (value: string) => toggleArrayFilter(ecosystems, setEcosystems, value),
    toggleNetwork: (value: string) => toggleArrayFilter(networks, setNetworks, value),
    toggleGrantType: (value: string) => toggleArrayFilter(grantTypes, setGrantTypes, value),

    // Reset all
    resetFilters,

    // Program ID for dialog (format: programId_chainId)
    programId,
    setProgramId,
  };
}
