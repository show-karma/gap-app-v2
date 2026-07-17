import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import DonorResearchLayout from "@/app/nonprofit-research/layout";

const authState = {
  ready: true,
  authenticated: true,
  user: { id: "user-a" } as { id: string } | null,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => authState,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/nonprofit-research",
}));

// The shell's advisor-gating behavior has its own suite
// (DonorResearchShell.test.tsx) — here it must not swallow children.
vi.mock("@/src/features/donor-research/components/common/DonorResearchShell", () => ({
  DonorResearchShell: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { clearCache: vi.fn() },
}));

const reportsByUser: Record<string, string> = {
  "user-a": "Account A report",
  "user-b": "Account B report",
};

function AccountOwnedReport() {
  const report = useQuery({
    queryKey: ["donor-research", "reports"],
    queryFn: async () => reportsByUser[authState.user?.id ?? ""],
    enabled: authState.authenticated,
    staleTime: Infinity,
  });

  if (!authState.authenticated) return <p>Signed out</p>;
  return <p>{report.data ?? "Loading reports…"}</p>;
}

function TestRoot({ queryClient }: { queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DonorResearchLayout>
        <AccountOwnedReport />
      </DonorResearchLayout>
    </QueryClientProvider>
  );
}

describe("DonorResearchLayout account isolation", () => {
  beforeEach(() => {
    authState.ready = true;
    authState.authenticated = true;
    authState.user = { id: "user-a" };
  });

  it("renders children in the first pass on first visit without an account-refresh pause", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(<TestRoot queryClient={queryClient} />);

    expect(screen.getByText("Loading reports…")).toBeVisible();
    expect(screen.queryByText("Switching accounts…")).not.toBeInTheDocument();
  });

  it("serves the cached report synchronously when re-entering with the same account", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const first = render(<TestRoot queryClient={queryClient} />);
    expect(await screen.findByText("Account A report")).toBeVisible();
    first.unmount();

    render(<TestRoot queryClient={queryClient} />);

    expect(screen.getByText("Account A report")).toBeVisible();
    expect(screen.queryByText("Switching accounts…")).not.toBeInTheDocument();
  });

  it("removes the previous account's donor-research cache before rendering the next account", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const view = render(<TestRoot queryClient={queryClient} />);
    expect(await screen.findByText("Account A report")).toBeVisible();

    authState.authenticated = false;
    authState.user = null;
    view.rerender(<TestRoot queryClient={queryClient} />);
    expect(await screen.findByText("Signed out")).toBeVisible();

    authState.authenticated = true;
    authState.user = { id: "user-b" };
    view.rerender(<TestRoot queryClient={queryClient} />);

    await waitFor(() => expect(screen.getByText("Account B report")).toBeVisible());
    expect(screen.queryByText("Account A report")).not.toBeInTheDocument();
  });
});
