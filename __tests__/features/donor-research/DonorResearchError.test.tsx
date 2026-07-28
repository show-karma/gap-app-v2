import { render, screen } from "@testing-library/react";
import { DonorResearchError } from "@/src/features/donor-research/components/common/DonorResearchError";

const authState = { authenticated: false, login: vi.fn() };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

const errorManagerMock = vi.fn();
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: (...args: unknown[]) => errorManagerMock(...args),
}));

// The gate's own rendering is AccessDenied's concern; here we only assert
// which screen the boundary chooses.
vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: ({ title, message }: { title?: string; message?: string }) => (
    <div>
      <p>{title}</p>
      <p>{message}</p>
    </div>
  ),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({ roles: { roles: [] }, isLoading: false }),
}));

describe("DonorResearchError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.authenticated = false;
  });

  // The section must present one signed-out screen, whether the visitor
  // arrived anonymous (layout gate) or their session expired mid-flow and a
  // query threw a 401 into this boundary.
  it("renders the section's shared sign-in gate for auth failures", () => {
    render(
      <DonorResearchError
        error={new Error("Authorization header with JWT is required")}
        reset={vi.fn()}
      />
    );

    expect(screen.getByText("Sign in to access nonprofit research")).toBeVisible();
    expect(
      screen.getByText(
        "Sign in to create research reports, build donor profiles, interact with donors and nonprofits."
      )
    ).toBeVisible();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("does not alert on the signed-out path", () => {
    render(<DonorResearchError error={new Error("Unauthenticated")} reset={vi.fn()} />);

    expect(errorManagerMock).not.toHaveBeenCalled();
  });

  it("re-renders the segment once the visitor signs in", () => {
    const reset = vi.fn();
    authState.authenticated = true;

    render(<DonorResearchError error={new Error("401 unauthorized")} reset={reset} />);

    expect(reset).toHaveBeenCalledOnce();
  });

  it("keeps the retry screen for non-auth failures", () => {
    render(<DonorResearchError error={new Error("Network request failed")} reset={vi.fn()} />);

    expect(screen.getByText("Something went wrong")).toBeVisible();
    expect(screen.getByRole("button", { name: /try again/i })).toBeVisible();
    expect(screen.queryByText("Sign in to access nonprofit research")).not.toBeInTheDocument();
    expect(errorManagerMock).toHaveBeenCalled();
  });
});
