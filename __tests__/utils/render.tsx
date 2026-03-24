import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render, renderHook } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import {
  type PrivyBridgeValue,
  PRIVY_BRIDGE_DEFAULTS,
  PrivyBridgeProvider,
  usePrivyBridgeSetter,
} from "@/contexts/privy-bridge-context";

// ---------------------------------------------------------------------------
// Auth / wallet state that tests can inject through the provider tree.
// Fields are optional -- unset fields fall back to PRIVY_BRIDGE_DEFAULTS.
// ---------------------------------------------------------------------------
export interface TestAuthState extends Partial<PrivyBridgeValue> {}

interface TestProviderOptions {
  queryClient?: QueryClient;
  /** Configurable auth / wallet state injected via PrivyBridgeProvider. */
  authState?: TestAuthState;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helper that pushes test auth state into the PrivyBridge context.
// It lives *inside* PrivyBridgeProvider so it can call usePrivyBridgeSetter.
// ---------------------------------------------------------------------------
function AuthStateInjector({
  state,
  children,
}: {
  state: TestAuthState;
  children: ReactNode;
}) {
  const setBridge = usePrivyBridgeSetter();
  useEffect(() => {
    setBridge({ ...PRIVY_BRIDGE_DEFAULTS, ...state } as PrivyBridgeValue);
  }, [setBridge, state]);
  return <>{children}</>;
}

function TestProviders({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: TestProviderOptions;
}) {
  const qc = options.queryClient ?? createTestQueryClient();
  const authState = options.authState;

  let inner = children;
  if (authState) {
    // Wrap with PrivyBridgeProvider + injector so consumers of usePrivyBridge()
    // see the test-supplied values without any global vi.mock.
    inner = (
      <PrivyBridgeProvider>
        <AuthStateInjector state={authState}>{children}</AuthStateInjector>
      </PrivyBridgeProvider>
    );
  }

  return <QueryClientProvider client={qc}>{inner}</QueryClientProvider>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: TestProviderOptions & Omit<RenderOptions, "wrapper">
) {
  const { queryClient, authState, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders options={{ queryClient, authState }}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}

export function renderHookWithProviders<T>(hook: () => T, options?: TestProviderOptions) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  return {
    ...renderHook(hook, {
      wrapper: ({ children }) => (
        <TestProviders options={{ queryClient, authState: options?.authState }}>
          {children}
        </TestProviders>
      ),
    }),
    queryClient,
  };
}
