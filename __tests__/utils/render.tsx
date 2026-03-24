import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

interface TestProviderOptions {
  queryClient?: QueryClient;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function TestProviders({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: TestProviderOptions;
}) {
  const qc = options.queryClient ?? createTestQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: TestProviderOptions & Omit<RenderOptions, "wrapper">
) {
  const { queryClient, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => <TestProviders options={{ queryClient }}>{children}</TestProviders>,
    ...renderOptions,
  });
}

export function renderHookWithProviders<T>(hook: () => T, options?: TestProviderOptions) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  return {
    ...renderHook(hook, {
      wrapper: ({ children }) => (
        <TestProviders options={{ queryClient }}>{children}</TestProviders>
      ),
    }),
    queryClient,
  };
}
