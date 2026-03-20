import { render, screen } from "@testing-library/react";
import { ApplicationPageClient } from "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/ApplicationPageClient";
import { useAuth } from "@/hooks/useAuth";
import { useIsFundingPlatformAdmin } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/src/core/rbac", () => ({
  useIsFundingPlatformAdmin: jest.fn(() => false),
}));

jest.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: jest.fn(() => ({
    hasRoleOrHigher: jest.fn(() => false),
    isReviewer: false,
    isLoading: false,
    can: jest.fn(() => false),
  })),
}));

jest.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock(
  "@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView",
  () => ({
    ApplicationDataView: () => <div data-testid="application-data-view" />,
  })
);

jest.mock("@/src/features/application-comments/components/PublicComments", () => ({
  PublicComments: () => <div data-testid="public-comments" />,
}));

const mockUseApplicationAccess = jest.fn(() => ({
  accessInfo: null,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  canView: false,
  canEdit: false,
  canReview: false,
  canAdminister: false,
  isOwner: false,
  accessRole: "NONE" as const,
}));
jest.mock("@/src/features/applications/hooks/use-application-access", () => ({
  useApplicationAccess: (...args: unknown[]) => mockUseApplicationAccess(...args),
}));

jest.mock("@/src/features/applications/components/ApplicationStatusHistory", () => ({
  ApplicationStatusHistory: () => <div data-testid="status-history" />,
}));

jest.mock(
  "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/components/MilestonesTab",
  () => ({
    MilestonesTab: () => <div data-testid="milestones-tab" />,
  })
);

const mockUseAuth = useAuth as unknown as jest.Mock;

const makeApplication = (overrides: Partial<Application> = {}): Application => ({
  id: "app-1",
  programId: "program-1",
  chainID: 10,
  applicantEmail: "test@example.com",
  applicationData: { question1: "answer1" },
  status: "pending",
  statusHistory: [],
  referenceNumber: "APP-NWK0FKKL-X5CZTJ",
  submissionIP: "127.0.0.1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ownerAddress: "0x1234567890123456789012345678901234567890",
  ...overrides,
});

const makeProgram = (overrides: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    uid: "program-1",
    name: "Test Program",
    metadata: { title: "Test Program" },
    ...overrides,
  }) as FundingProgram;

describe("ApplicationPageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      address: "0x1234567890123456789012345678901234567890",
      user: {
        id: "did:privy:user-1",
        linkedAccounts: [{ type: "wallet", address: "0x1234567890123456789012345678901234567890" }],
      },
      authenticated: true,
      ready: true,
    });
  });

  it("shows edit button when wallet user is the owner", () => {
    mockUseApplicationAccess.mockReturnValue({
      accessInfo: null, isLoading: false, error: null, refetch: jest.fn(),
      canView: true, canEdit: true, canReview: false, canAdminister: false,
      isOwner: true, accessRole: "APPLICANT" as const,
    });

    render(
      <ApplicationPageClient
        communityId="optimism"
        application={makeApplication({ status: "pending" })}
        program={makeProgram()}
      />
    );

    expect(screen.getByText("Edit Application")).toBeInTheDocument();
  });

  it("does not show edit button when wallet user is NOT the owner", () => {
    mockUseApplicationAccess.mockReturnValue({
      accessInfo: null, isLoading: false, error: null, refetch: jest.fn(),
      canView: true, canEdit: false, canReview: false, canAdminister: false,
      isOwner: false, accessRole: "GUEST" as const,
    });

    render(
      <ApplicationPageClient
        communityId="optimism"
        application={makeApplication({ status: "pending" })}
        program={makeProgram()}
      />
    );

    expect(screen.queryByText("Edit Application")).not.toBeInTheDocument();
  });

  describe("Farcaster user (no wallet address)", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        address: undefined,
        user: {
          id: "did:privy:farcaster-user-123",
          farcaster: {
            fid: 12345,
            username: "testfcuser",
            displayName: "Test FC User",
          },
          linkedAccounts: [{ type: "farcaster", fid: 12345 }],
        },
        authenticated: true,
        ready: true,
      });
    });

    it("should show edit button when Farcaster user is the owner (matched by userId)", () => {
      // Backend access check resolves ownership via multi-wallet matching
      mockUseApplicationAccess.mockReturnValue({
        accessInfo: null, isLoading: false, error: null, refetch: jest.fn(),
        canView: true, canEdit: true, canReview: false, canAdminister: false,
        isOwner: true, accessRole: "APPLICANT" as const,
      });

      render(
        <ApplicationPageClient
          communityId="optimism"
          application={makeApplication({
            ownerAddress: "",
            userId: "did:privy:farcaster-user-123",
            status: "pending",
          })}
          program={makeProgram()}
        />
      );

      expect(screen.getByText("Edit Application")).toBeInTheDocument();
    });

    it("should not show edit button when Farcaster userId does not match", () => {
      mockUseApplicationAccess.mockReturnValue({
        accessInfo: null, isLoading: false, error: null, refetch: jest.fn(),
        canView: true, canEdit: false, canReview: false, canAdminister: false,
        isOwner: false, accessRole: "GUEST" as const,
      });

      render(
        <ApplicationPageClient
          communityId="optimism"
          application={makeApplication({
            ownerAddress: "",
            userId: "did:privy:different-user",
            status: "pending",
          })}
          program={makeProgram()}
        />
      );

      expect(screen.queryByText("Edit Application")).not.toBeInTheDocument();
    });
  });
});
