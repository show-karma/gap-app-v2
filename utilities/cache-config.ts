/**
 * Centralized cache timing configuration for React Query
 *
 * This file contains all cache timing constants used across the application.
 * Centralizing these values makes it easier to tune caching behavior and
 * maintain consistency across related queries.
 */

/**
 * Cache timing for admin/permission checks
 * These values balance responsiveness with API call reduction
 */
export const ADMIN_CACHE_CONFIG = {
  /** Time before data is considered stale (5 minutes) */
  staleTime: 1000 * 60 * 5,
  /** Time before garbage collection removes unused data (10 minutes) */
  gcTime: 1000 * 60 * 10,
} as const;

/**
 * Cache timing for contract owner checks
 * Longer duration since contract ownership changes rarely
 */
export const CONTRACT_OWNER_CACHE_CONFIG = {
  /** Time before data is considered stale (10 minutes) */
  staleTime: 1000 * 60 * 10,
  /** Time before garbage collection removes unused data (10 minutes) */
  gcTime: 1000 * 60 * 10,
} as const;

/**
 * Cache timing for staff authorization checks
 * Very long duration since staff status rarely changes
 */
export const STAFF_CACHE_CONFIG = {
  /** Time before data is considered stale (24 hours) */
  staleTime: 1000 * 60 * 60 * 24,
  /** Time before garbage collection removes unused data (24 hours) */
  gcTime: 1000 * 60 * 60 * 24,
} as const;
