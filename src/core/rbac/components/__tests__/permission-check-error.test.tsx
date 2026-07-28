import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { permissionsKeys } from "../../hooks/use-permissions";
import { PermissionCheckError } from "../permission-check-error";

// This is the terminal state every RBAC-gated surface falls back to when the
// permissions lookup fails. Its whole reason to exist is that the viewer gets
// (a) an explanation that something broke rather than a denial, and (b) a
// control that actually re-runs the check. Both are asserted here directly so
// callers only have to prove they route `isError` to this component.

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe("PermissionCheckError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("announces the failure rather than presenting it as a denial", () => {
    renderWithClient(<PermissionCheckError />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/couldn't verify your access/i)).toBeInTheDocument();
    // No denial vocabulary: the viewer must not be told they lack a role.
    expect(screen.queryByText(/access required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
  });

  it("defaults the subject to the generic page wording", () => {
    renderWithClient(<PermissionCheckError />);

    expect(screen.getByText(/can't show this page safely/i)).toBeInTheDocument();
  });

  it("renders the caller's subject mid-sentence", () => {
    renderWithClient(<PermissionCheckError subject="this report" />);

    expect(screen.getByText(/can't show this report safely/i)).toBeInTheDocument();
  });

  it("refetches the permissions query instead of reloading the page", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithClient(<PermissionCheckError />);
    const refetchQueries = vi.spyOn(queryClient, "refetchQueries").mockResolvedValue(undefined);

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetchQueries).toHaveBeenCalledWith({ queryKey: permissionsKeys.all });
  });

  it("keeps the retry control enabled while nothing is in flight", () => {
    renderWithClient(<PermissionCheckError />);

    const retry = screen.getByRole("button", { name: /try again/i });
    expect(retry).toBeEnabled();
    expect(retry).toHaveAttribute("aria-busy", "false");
  });
});
