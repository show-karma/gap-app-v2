import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import AdminNonprofitResearchLayout from "../layout";

/**
 * REGRESSION: the staff gate read only `{ isStaff, isLoading }` from
 * `useStaff()`. Because that hook reports `isStaff: false` for BOTH "denied"
 * and "could not be decided", a permissions fetch that failed — upstream
 * 503/504, or the client's own 15s deadline firing — rendered the denial copy.
 * A real SUPER_ADMIN was told to go ask an admin for access they already held,
 * with no error shown and nothing to retry.
 *
 * The gate must therefore branch on `isError` BEFORE `!isStaff`.
 */

const staffState = {
  isStaff: false,
  isLoading: false,
  isError: false,
};

vi.mock("@/src/core/rbac/hooks/use-staff-bridge", () => ({
  useStaff: () => staffState,
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const authState = { ready: true, authenticated: true };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

// PermissionCheckError is deliberately NOT mocked — the point of the error
// branch is that the user gets something they can act on, so the real component
// (and its retry control) is what these tests assert against.

vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: ({ title }: { title: string }) => <div>{title}</div>,
}));

function renderGate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminNonprofitResearchLayout>{<div>admin content</div>}</AdminNonprofitResearchLayout>
    </QueryClientProvider>
  );
}

describe("AdminNonprofitResearchLayout staff gate", () => {
  beforeEach(() => {
    staffState.isStaff = false;
    staffState.isLoading = false;
    staffState.isError = false;
    authState.ready = true;
    authState.authenticated = true;
  });

  it("renders a retryable error, not the denial, when the permissions check could not be decided", () => {
    staffState.isError = true;

    renderGate();

    expect(screen.getByText(/couldn't verify your access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
    expect(screen.queryByText("Staff access required")).not.toBeInTheDocument();
  });

  it("still denies a genuinely non-staff viewer", () => {
    renderGate();

    expect(screen.getByText("Staff access required")).toBeInTheDocument();
  });

  it("renders children for a resolved staff member", () => {
    staffState.isStaff = true;

    renderGate();

    expect(screen.getByText("admin content")).toBeInTheDocument();
  });
});
