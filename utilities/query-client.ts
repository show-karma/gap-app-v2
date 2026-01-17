/**
 * Centralized QueryClient instance for the application
 *
 * This module exports the shared QueryClient instance used throughout the app.
 * Having a dedicated module for the queryClient:
 * - Reduces coupling between components and providers
 * - Allows hooks to access queryClient without importing from UI components
 * - Makes testing easier by allowing mock injection
 */
import { QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

/**
 * Shared QueryClient instance
 * Used by all React Query hooks and for manual cache operations
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
});
