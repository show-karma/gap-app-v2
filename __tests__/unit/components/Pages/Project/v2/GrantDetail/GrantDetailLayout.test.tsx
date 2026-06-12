import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GrantDetailLayout } from "@/components/Pages/Project/v2/GrantDetail/GrantDetailLayout";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "proj-1", grantUid: "0xgrant" }),
  usePathname: () => "/project/proj-1/funding/0xgrant",
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGrant = {
  uid: "0xgrant",
  data: { communityUID: "0xcommunity" },
  details: { title: "My Grant" },
};

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn((selector: any) =>
    selector({
      grant: mockGrant,
      setGrant: vi.fn(),
      loading: false,
      setLoading: vi.fn(),
    })
  ),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector: any) =>
    selector({ project: { uid: "proj-1", details: { slug: "proj-1" } } })
  ),
}));

vi.mock("@/hooks/useProject", () => ({
  useProject: () => ({
    project: { uid: "proj-1", details: { slug: "proj-1" } },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({
    grants: [mockGrant],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: vi.fn(() => ({ isAuthorized: false, isLoading: false })),
}));

// Mock the action controls so we can assert on their presence/absence cheaply.
vi.mock("@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton", () => ({
  GrantCompleteButton: () => <div data-testid="grant-complete-button" />,
}));
vi.mock("@/components/Pages/GrantMilestonesAndUpdates/GrantDelete", () => ({
  GrantDelete: () => <div data-testid="grant-delete" />,
}));
vi.mock("@/components/Pages/GrantMilestonesAndUpdates/GrantLinkExternalAddressButton", () => ({
  GrantLinkExternalAddressButton: () => <div data-testid="grant-link-external" />,
}));

const mockUseProjectAuthorization = vi.mocked(useProjectAuthorization);

describe("GrantDetailLayout authorization gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: false });
  });

  it("resolves authorization with the grant's communityUID", () => {
    render(
      <GrantDetailLayout>
        <div>child</div>
      </GrantDetailLayout>
    );
    expect(mockUseProjectAuthorization).toHaveBeenCalledWith("0xcommunity");
  });

  it("renders fixed-size skeletons (not controls, not denial) while authorization is undecided", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: true });

    render(
      <GrantDetailLayout>
        <div>child</div>
      </GrantDetailLayout>
    );

    expect(screen.getByTestId("grant-edit-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("grant-actions-skeleton")).toBeInTheDocument();
    // Controls must NOT appear while loading.
    expect(screen.queryByTestId("grant-complete-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grant-delete")).not.toBeInTheDocument();
    // Page chrome is never blocked.
    expect(screen.getByText("My Grant")).toBeInTheDocument();
  });

  it("renders the controls once authorization resolves authorized", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });

    render(
      <GrantDetailLayout>
        <div>child</div>
      </GrantDetailLayout>
    );

    expect(screen.getByTestId("grant-complete-button")).toBeInTheDocument();
    expect(screen.getByTestId("grant-delete")).toBeInTheDocument();
    expect(screen.queryByTestId("grant-edit-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grant-actions-skeleton")).not.toBeInTheDocument();
  });

  it("renders no controls and no skeletons for resolved-denied users", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: false });

    render(
      <GrantDetailLayout>
        <div>child</div>
      </GrantDetailLayout>
    );

    expect(screen.queryByTestId("grant-complete-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grant-delete")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grant-edit-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grant-actions-skeleton")).not.toBeInTheDocument();
    // But the page content still renders.
    expect(screen.getByTestId("grant-detail-content")).toBeInTheDocument();
  });
});
