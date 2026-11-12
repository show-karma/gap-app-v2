import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/types/whitelabel-entities";
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

function renderPage() {
  return render(
    <ApplicationPageClient communityId="filecoin" application={application} program={null} />
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
});
