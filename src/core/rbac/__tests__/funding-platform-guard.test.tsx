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
  application: undefined as { referenceNumber?: string } | undefined,
  isLoadingApplication: false,
  fundingArg: undefined as unknown,
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
  useParams: () => ({
    communityId: "test-community",
    programId: "prog-1",
    projectId: "project-uid-1",
  }),
}));

vi.mock("@/hooks/useFundingApplicationByProjectUID", () => ({
  useFundingApplicationByProjectUID: (projectUID: string) => {
    h.fundingArg = projectUID;
    return { application: h.application, isLoading: h.isLoadingApplication };
  },
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
  over: Partial<{
    isLoading: boolean;
    hasRole: boolean;
    isReviewer: boolean;
    isProjectOwner: boolean;
  }>
) => {
  const { isLoading = false, hasRole = false, isReviewer = false, isProjectOwner = false } = over;
  h.perm = {
    isLoading,
    isReviewer,
    isProjectOwner,
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
    h.application = undefined;
    h.isLoadingApplication = false;
    h.fundingArg = undefined;
    h.grantee = noGrantee;
    h.granteeArgs = undefined;
  });

  it("renders children for an authorized reviewer and runs no grantee lookups", () => {
    setPermission({ hasRole: true });
    renderGuard();

    expect(screen.getByTestId("children")).toBeInTheDocument();
    expect(h.fundingArg).toBeUndefined(); // project lookup never mounted
    expect(h.granteeArgs).toBeUndefined(); // applicant fallback never mounted
  });

  it("shows a spinner while permissions are loading", () => {
    setPermission({ isLoading: true });
    const { container } = renderGuard();

    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  describe("project owner (precise path)", () => {
    it("shows a spinner while the owner's application is still resolving (no denial flash)", () => {
      setPermission({ isProjectOwner: true });
      h.isLoadingApplication = true;
      const { container } = renderGuard();

      expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
      expect(screen.queryByTestId("grantee-notice")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeTruthy();
    });

    it("redirects a denied project owner to their resolved application", () => {
      setPermission({ isProjectOwner: true });
      h.application = { referenceNumber: "REF-1" };
      renderGuard();

      const notice = screen.getByTestId("grantee-notice");
      expect(notice).toHaveAttribute("data-url", "/community/test-community/applications/REF-1");
      expect(notice).toHaveAttribute("data-kind", "application");
      // Scoped to the route's project; applicant fallback never mounted.
      expect(h.fundingArg).toBe("project-uid-1");
      expect(h.granteeArgs).toBeUndefined();
    });

    it("falls back to the dashboard when the owner's application can't be resolved", () => {
      setPermission({ isProjectOwner: true });
      h.application = undefined;
      renderGuard();

      const notice = screen.getByTestId("grantee-notice");
      expect(notice).toHaveAttribute("data-url", "/dashboard");
      expect(notice).toHaveAttribute("data-kind", "dashboard");
    });
  });

  describe("applicant fallback (no project ownership)", () => {
    it("enables the fallback lookup and disables the project lookup for a denied non-owner", () => {
      setPermission({ isProjectOwner: false });
      renderGuard();

      expect(h.fundingArg).toBeUndefined(); // project lookup never mounted
      expect(h.granteeArgs).toMatchObject({
        enabled: true,
        communityId: "test-community",
        programId: "prog-1",
      });
    });

    it("shows a spinner while the fallback lookup is still resolving", () => {
      setPermission({ isProjectOwner: false });
      h.grantee = { ...noGrantee, isResolving: true };
      const { container } = renderGuard();

      expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeTruthy();
    });

    it("redirects a program/community applicant to their application", () => {
      setPermission({ isProjectOwner: false });
      h.grantee = {
        ...noGrantee,
        isGrantee: true,
        redirect: { kind: "application", url: "/community/test-community/applications/REF-9" },
      };
      renderGuard();

      const notice = screen.getByTestId("grantee-notice");
      expect(notice).toHaveAttribute("data-url", "/community/test-community/applications/REF-9");
      expect(notice).toHaveAttribute("data-kind", "application");
    });

    it("sends a multi-application applicant to the dashboard", () => {
      setPermission({ isProjectOwner: false });
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

    it("shows the generic denial when the user is neither owner nor applicant", () => {
      setPermission({ isProjectOwner: false });
      renderGuard();

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByTestId("grantee-notice")).not.toBeInTheDocument();
    });

    it("falls back to the generic denial when the fallback lookup errored", () => {
      setPermission({ isProjectOwner: false });
      h.grantee = { ...noGrantee, isGrantee: true, isError: true };
      renderGuard();

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByTestId("grantee-notice")).not.toBeInTheDocument();
    });
  });
});
