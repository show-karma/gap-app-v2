import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FundingPlatformGuard } from "../components/funding-platform-guard";

const noGrantee = {
  isResolving: false,
  isGrantee: false,
  isError: false,
  redirect: { kind: "dashboard", url: "/dashboard" },
};

const h = vi.hoisted(() => ({
  perm: undefined as unknown,
  grantee: undefined as unknown,
  granteeArgs: undefined as unknown,
}));

vi.mock("../context/permission-context", () => ({
  usePermissionContext: () => h.perm,
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "test-community", programId: "prog-1" }),
}));

vi.mock("../hooks/use-grantee-application-access", () => ({
  useGranteeApplicationAccess: (args: unknown) => {
    h.granteeArgs = args;
    return h.grantee;
  },
}));

vi.mock("../components/grantee-redirect-notice", () => ({
  GranteeRedirectNotice: ({ redirect }: { redirect: { kind: string; url: string } }) => (
    <div data-testid="grantee-notice" data-url={redirect.url} data-kind={redirect.kind} />
  ),
}));

const setPermission = (
  over: Partial<{ isLoading: boolean; hasRole: boolean; isReviewer: boolean }>
) => {
  const { isLoading = false, hasRole = false, isReviewer = false } = over;
  h.perm = {
    isLoading,
    isReviewer,
    hasRoleOrHigher: () => hasRole,
  };
};

const renderGuard = () =>
  render(
    <FundingPlatformGuard>
      <div data-testid="children" />
    </FundingPlatformGuard>
  );

describe("FundingPlatformGuard", () => {
  beforeEach(() => {
    h.grantee = noGrantee;
    h.granteeArgs = undefined;
  });

  it("renders children for an authorized reviewer and runs no grantee lookup", () => {
    setPermission({ hasRole: true });
    renderGuard();

    expect(screen.getByTestId("children")).toBeInTheDocument();
    // The applicant lookup never mounts for authorized users.
    expect(h.granteeArgs).toBeUndefined();
  });

  it("shows a spinner while permissions are loading", () => {
    setPermission({ isLoading: true });
    const { container } = renderGuard();

    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("scopes the applicant lookup to the route's community and program", () => {
    setPermission({});
    renderGuard();

    expect(h.granteeArgs).toMatchObject({
      enabled: true,
      communityId: "test-community",
      programId: "prog-1",
    });
  });

  it("shows a spinner while the applicant lookup is still resolving (no denial flash)", () => {
    setPermission({});
    h.grantee = { ...noGrantee, isResolving: true };
    const { container } = renderGuard();

    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grantee-notice")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects a denied applicant to their application", () => {
    setPermission({});
    h.grantee = {
      ...noGrantee,
      isGrantee: true,
      redirect: { kind: "application", url: "/community/test-community/applications/REF-9" },
    };
    renderGuard();

    const notice = screen.getByTestId("grantee-notice");
    expect(notice).toHaveAttribute("data-url", "/community/test-community/applications/REF-9");
    expect(notice).toHaveAttribute("data-kind", "application");
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
  });

  it("sends a multi-application applicant to the dashboard", () => {
    setPermission({});
    h.grantee = {
      ...noGrantee,
      isGrantee: true,
      redirect: { kind: "dashboard", url: "/dashboard" },
    };
    renderGuard();

    const notice = screen.getByTestId("grantee-notice");
    expect(notice).toHaveAttribute("data-url", "/dashboard");
    expect(notice).toHaveAttribute("data-kind", "dashboard");
  });

  it("shows the generic denial when the user is not an applicant", () => {
    setPermission({});
    renderGuard();

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByTestId("grantee-notice")).not.toBeInTheDocument();
  });

  it("falls back to the generic denial when the applicant lookup errored", () => {
    setPermission({});
    h.grantee = { ...noGrantee, isGrantee: true, isError: true };
    renderGuard();

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByTestId("grantee-notice")).not.toBeInTheDocument();
  });
});
