/**
 * Projects Explorer Constants
 * Configuration for the /projects page functionality
 */
export const PROJECTS_EXPLORER_CONSTANTS = {
  /** Maximum results to fetch */
  RESULT_LIMIT: 50,

  /** Debounce delay for search input in milliseconds */
  DEBOUNCE_DELAY_MS: 300,

  /** Minimum characters before triggering search */
  MIN_SEARCH_LENGTH: 3,

  /** Stale time for cache in milliseconds (1 minute) */
  STALE_TIME_MS: 60 * 1000,

  /** Items per row on different breakpoints */
  GRID_COLUMNS: {
    SM: 1,
    MD: 2,
    LG: 3,
    XL: 4,
  },
} as const;
