import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, ApplicationStatus, FundingProgram } from "@/types/whitelabel-entities";
import { ApplicationPageClient } from "../ApplicationPageClient";

const mockAccess = vi.fn();

vi.mock("@/src/features/applications/hooks/use-application-access", () => ({
  useApplicationAccess: () => mockAccess(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, authenticated: true }) }));
vi.mock("@/src/core/rbac", () => ({ useIsFundingPlatformAdmin: () => false }));
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({
    hasRoleOrHigher: () => false,
    isReviewer: false,
    can: () => false,
    isLoading: false,
  }),
}));
vi.mock("@/src/features/applications/hooks/use-application", () => ({
  useApplication: () => ({ application: undefined }),
}));
vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useApplicationIntegrations: () => ({ data: undefined }),
}));
vi.mock("@/services/fundingApplicationIntegrations.service", () => ({
  isIntegrationEnabled: () => false,
}));
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("../components/use-url-tab-state", () => ({ useUrlTabState: () => ["details", vi.fn()] }));
vi.mock("../components/ApplicationHeader", () => ({
  ApplicationHeader: ({ showEditButton }: { showEditButton: boolean }) =>
    showEditButton ? <a href="/edit">Edit</a> : null,
}));
vi.mock("../components/ApplicationSidebar", () => ({ ApplicationSidebar: () => null }));
vi.mock("@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView", () => ({
  ApplicationDataView: () => null,
}));

const application = {
  referenceNumber: "APP-1",
  programId: "1508",
  status: "pending",
  applicationData: {},
  updatedAt: "2026-11-10T00:00:00.000Z",
} as unknown as Application;

const PAST_DEADLINE = "2020-01-01T00:00:00.000Z";
const FUTURE_DEADLINE = "2999-01-01T00:00:00.000Z";

function renderPage({
  status = "pending",
  endsAt,
}: {
  status?: ApplicationStatus;
  endsAt?: string;
} = {}) {
  const program = endsAt ? ({ metadata: { endsAt } } as unknown as FundingProgram) : null;
  return render(
    <ApplicationPageClient
      communityId="filecoin"
      application={{ ...application, status }}
      program={program}
    />
  );
}

describe("ApplicationPageClient edit access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets an application team member edit", () => {
    mockAccess.mockReturnValue({ isApplicant: true });
    renderPage();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Dashboard/ })).toBeInTheDocument();
  });

  it("hides edit from viewers without applicant access", () => {
    mockAccess.mockReturnValue({ isApplicant: false });
    renderPage();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
  });

  describe("draft applications", () => {
    beforeEach(() => {
      mockAccess.mockReturnValue({ isApplicant: true });
    });

    it("lets the owner edit a draft before the deadline", () => {
      renderPage({ status: "draft", endsAt: FUTURE_DEADLINE });
      expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    });

    it("hides edit on a draft once the deadline has passed, like pending", () => {
      renderPage({ status: "draft", endsAt: PAST_DEADLINE });
      expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    });

    it("still allows editing a revision request after the deadline", () => {
      renderPage({ status: "revision_requested", endsAt: PAST_DEADLINE });
      expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    });
  });
});
