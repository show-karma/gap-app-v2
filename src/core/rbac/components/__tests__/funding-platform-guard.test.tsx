import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FundingPlatformGuard } from "../funding-platform-guard";

// DEV-496: a denied non-reviewer handed a /manage link is redirected to the
// public application page instead of seeing the "Access Denied" box.

const { replace, permission } = vi.hoisted(() => ({
  replace: vi.fn(),
  permission: {
    current: {
      isLoading: false,
      isGuestDueToError: false,
      isReviewer: false,
      hasRoleOrHigher: (_role: string) => false,
    } as {
      isLoading: boolean;
      isGuestDueToError: boolean;
      isReviewer: boolean;
      hasRoleOrHigher: (role: string) => boolean;
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => permission.current,
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

function setPermission(overrides: Partial<typeof permission.current>) {
  permission.current = { ...permission.current, ...overrides };
}

describe("FundingPlatformGuard", () => {
  beforeEach(() => {
    replace.mockClear();
    setPermission({
      isLoading: false,
      isGuestDueToError: false,
      isReviewer: false,
      hasRoleOrHigher: () => false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders children for a reviewer and never redirects", () => {
    setPermission({ isReviewer: true });
    render(
      <FundingPlatformGuard onDeniedRedirectTo="/community/filecoin/applications/REF-1">
        <div data-testid="workspace" />
      </FundingPlatformGuard>
    );
    expect(screen.getByTestId("workspace")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a denied applicant to the public page and shows a spinner, not the denial box", () => {
    render(
      <FundingPlatformGuard onDeniedRedirectTo="/community/filecoin/applications/REF-1">
        <div data-testid="workspace" />
      </FundingPlatformGuard>
    );
    expect(replace).toHaveBeenCalledWith("/community/filecoin/applications/REF-1");
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("does not redirect on a failed permission lookup (isGuestDueToError) — shows the denial box", () => {
    setPermission({ isGuestDueToError: true });
    render(
      <FundingPlatformGuard onDeniedRedirectTo="/community/filecoin/applications/REF-1">
        <div data-testid="workspace" />
      </FundingPlatformGuard>
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("shows the denial box (no redirect) when no redirect target is provided", () => {
    render(
      <FundingPlatformGuard>
        <div data-testid="workspace" />
      </FundingPlatformGuard>
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("shows a spinner while permissions load and does not redirect yet", () => {
    setPermission({ isLoading: true });
    render(
      <FundingPlatformGuard onDeniedRedirectTo="/community/filecoin/applications/REF-1">
        <div data-testid="workspace" />
      </FundingPlatformGuard>
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("waits on a spinner (no denial box) while a denied user's redirect target resolves", () => {
    render(
      <FundingPlatformGuard redirectResolving>
        <div data-testid="workspace" />
      </FundingPlatformGuard>
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
  });
});
