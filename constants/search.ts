/**
 * Search Feature Constants
 *
 * Centralized configuration for project search functionality.
 * These constants control behavior like debouncing, minimum query length, and result limits.
 */

export const SEARCH_CONSTANTS = {
  /** Minimum number of characters required before triggering a search */
  MIN_QUERY_LENGTH: 3,

  /** Debounce delay in milliseconds for search input */
  DEBOUNCE_DELAY_MS: 500,

  /** Maximum number of search results to fetch */
  RESULT_LIMIT: 10,

  /** Stale time for search results cache in milliseconds (30 seconds) */
  STALE_TIME_MS: 30 * 1000,

  /** Garbage collection time for search results cache in milliseconds (5 minutes) */
  GC_TIME_MS: 5 * 60 * 1000,
} as const;
