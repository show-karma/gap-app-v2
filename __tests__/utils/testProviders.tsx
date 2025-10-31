import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Test Providers Utility
 *
 * This file provides reusable provider wrappers for testing React components
 * that require context providers (React Query, etc.)
 */

/**
 * Creates a React Query provider for testing hooks and components
 *
 * @param options - Configuration options for the QueryClient
 * @returns A wrapper component for testing
 *
 * @example
 * ```tsx
 * const { result } = renderHook(() => useMyHook(), {
 *   wrapper: createQueryClientWrapper()
 * });
 * ```
 */
export function createQueryClientWrapper(options?: {
  disableRetry?: boolean;
  defaultStaleTime?: number;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: options?.disableRetry ? false : 2,
        retryDelay: 100, // Fast retries in tests
        staleTime: options?.defaultStaleTime ?? 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  Wrapper.displayName = "QueryClientWrapper";

  return Wrapper;
}

/**
 * Wraps a component with all necessary test providers
 *
 * @param ui - The component to wrap
 * @returns The wrapped component
 *
 * @example
 * ```tsx
 * render(withTestProviders(<MyComponent />));
 * ```
 */
export function withTestProviders(ui: React.ReactElement) {
  const QueryWrapper = createQueryClientWrapper();
  return <QueryWrapper>{ui}</QueryWrapper>;
}
