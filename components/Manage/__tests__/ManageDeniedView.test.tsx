import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageDeniedView } from "../ManageDeniedView";

const h = vi.hoisted(() => ({
  grantee: undefined as unknown,
  granteeArgs: undefined as unknown,
  accessDeniedProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "filecoin", programId: "101119" }),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false }),
}));

vi.mock("@/hooks/useAccessDeniedMessages", () => ({
  useAccessDeniedMessages: () => ({ data: { applicantMessage: null } }),
}));

vi.mock("@/src/core/rbac/hooks/use-grantee-application-access", () => ({
  useGranteeApplicationAccess: (args: unknown) => {
    h.granteeArgs = args;
    return h.grantee;
  },
}));

// Capture the props AccessDenied receives so we can assert the complementary
// applicant action is passed (and the denial message is never replaced).
vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: (props: Record<string, unknown>) => {
    h.accessDeniedProps = props;
    const secondary = props.secondaryAction as { label?: string; href?: string } | undefined;
    return (
      <div data-testid="access-denied" data-community={props.communitySlug as string}>
        {secondary ? (
          <a data-testid="applicant-cta" href={secondary.href}>
            {secondary.label}
          </a>
        ) : null}
      </div>
    );
  },
}));

const noGrantee = {
  isResolving: false,
  isGrantee: false,
  isError: false,
  redirect: { kind: "dashboard", url: "/dashboard" },
};

const renderView = () =>
  render(<ManageDeniedView communityId="filecoin" communityName="Filecoin" />);

describe("ManageDeniedView", () => {
  beforeEach(() => {
    h.grantee = noGrantee;
    h.granteeArgs = undefined;
    h.accessDeniedProps = undefined;
  });

  it("scopes the applicant lookup to the route's community and program", () => {
    renderView();
    expect(h.granteeArgs).toMatchObject({
      enabled: true,
      communityId: "filecoin",
      programId: "101119",
    });
  });

  it("always renders the community denial (never replaced)", () => {
    renderView();
    expect(screen.getByTestId("access-denied")).toHaveAttribute("data-community", "filecoin");
  });

  it("adds a complementary application link for an applicant", () => {
    h.grantee = {
      ...noGrantee,
      isGrantee: true,
      redirect: { kind: "application", url: "/community/filecoin/applications/REF-1" },
    };
    renderView();

    // Denial still present...
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    // ...plus the complementary applicant CTA.
    const cta = screen.getByTestId("applicant-cta");
    expect(cta).toHaveAttribute("href", "/community/filecoin/applications/REF-1");
    expect(cta).toHaveTextContent("View your application");
  });

  it("labels the CTA for the dashboard when the applicant has multiple applications", () => {
    h.grantee = {
      ...noGrantee,
      isGrantee: true,
      redirect: { kind: "dashboard", url: "/dashboard" },
    };
    renderView();
    expect(screen.getByTestId("applicant-cta")).toHaveTextContent("Go to your dashboard");
  });

  it("adds no complementary action when the user is not an applicant", () => {
    renderView();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("applicant-cta")).not.toBeInTheDocument();
    expect(h.accessDeniedProps?.secondaryAction).toBeUndefined();
  });

  it("adds no complementary action when the lookup errored", () => {
    h.grantee = { ...noGrantee, isGrantee: true, isError: true };
    renderView();
    expect(screen.queryByTestId("applicant-cta")).not.toBeInTheDocument();
  });
});
