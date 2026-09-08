import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import TokenLayout from "@/app/t/[tenant]/(bare)/nonprofit-research/layout";
import AdvisorLayout from "@/app/t/[tenant]/(chrome)/nonprofit-research/(advisor)/layout";
import GatedFullscreenLayout from "@/app/t/[tenant]/(chrome)/nonprofit-research/(gated-fullscreen)/layout";
import PublicLayout from "@/app/t/[tenant]/(chrome)/nonprofit-research/(public)/layout";

const authState = {
  ready: true,
  authenticated: true,
  login: vi.fn(),
  user: { id: "user-a" } as { id: string } | null,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => authState,
  useLoadPrivy: () => vi.fn(),
}));

vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: ({ isLoading, title }: { isLoading?: boolean; title?: string }) =>
    isLoading ? (
      <p>Checking access…</p>
    ) : (
      <>
        <p>{title}</p>
        <button onClick={authState.login} type="button">
          Sign in
        </button>
      </>
    ),
}));

// Which posture a route gets is the route group it sits in, not a
// `usePathname()` test inside the layout — that hook was the
// CLIENT_HOOK_DYNAMIC read that stopped the section from prerendering. So
// these suites render the real route layouts and assert the gate each one
// declares. The account-isolation suite runs on `(advisor)`, which is gated;
// the section index ("/nonprofit-research") is not gated by its layout,
// because its page owns the gate so the public FAQ content can be
// server-rendered (E4, DEV-595).

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

type RouteLayout = (props: { children: ReactNode }) => ReactNode;

function TestRoot({
  queryClient,
  Layout = AdvisorLayout,
}: {
  queryClient: QueryClient;
  Layout?: RouteLayout;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <AccountOwnedReport />
      </Layout>
    </QueryClientProvider>
  );
}

describe("DonorResearchLayout account isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(await screen.findByText("Sign in to access nonprofit research")).toBeVisible();
    expect(screen.queryByText("Signed out")).not.toBeInTheDocument();

    authState.authenticated = true;
    authState.user = { id: "user-b" };
    view.rerender(<TestRoot queryClient={queryClient} />);

    await waitFor(() => expect(screen.getByText("Account B report")).toBeVisible());
    expect(screen.queryByText("Account A report")).not.toBeInTheDocument();
  });

  it("does not mount protected content while signed out and opens sign in", async () => {
    authState.authenticated = false;
    authState.user = null;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();

    render(<TestRoot queryClient={queryClient} />);

    expect(screen.getByText("Sign in to access nonprofit research")).toBeVisible();
    expect(screen.queryByText("Signed out")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(authState.login).toHaveBeenCalledOnce();
  });
});

// Onboarding renders without the advisor shell, but "no shell" must not mean
// "no auth gate" — otherwise its advisor query 401s into the error boundary and
// the visitor sees a second, differently-worded sign-in screen.
describe("DonorResearchLayout sign-in gate coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.ready = true;
    authState.authenticated = false;
    authState.user = null;
  });

  it.each([
    ["the advisor group", AdvisorLayout],
    ["onboarding", GatedFullscreenLayout],
  ])("gates %s with the same sign-in screen", (_label, Layout) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<TestRoot queryClient={queryClient} Layout={Layout} />);

    expect(screen.getByText("Sign in to access nonprofit research")).toBeVisible();
    expect(screen.queryByText("Signed out")).not.toBeInTheDocument();
  });

  it("leaves the section index to its page — the page renders the gate plus public content", () => {
    // The index page (ResearchIndexExperience) shows the same sign-in gate
    // for anonymous visitors; the layout just stops swallowing the page's
    // server-rendered FAQ content. Covered by ResearchIndexExperience tests.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<TestRoot queryClient={queryClient} Layout={PublicLayout} />);

    expect(screen.getByText("Signed out")).toBeVisible();
    expect(screen.queryByText("Sign in to access nonprofit research")).not.toBeInTheDocument();
  });

  // One layout now serves both token routes — the donor share view and the
  // diligence response page — so one case covers what two pathnames used to.
  it("leaves the token routes anonymous — the token is the credential", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<TestRoot queryClient={queryClient} Layout={TokenLayout} />);

    expect(screen.getByText("Signed out")).toBeVisible();
    expect(screen.queryByText("Sign in to access nonprofit research")).not.toBeInTheDocument();
  });
});
