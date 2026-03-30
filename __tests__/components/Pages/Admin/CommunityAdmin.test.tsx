import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import CommunitiesToAdminPage from "@/components/Pages/Admin/CommunityAdmin";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useAuth } from "@/hooks/useAuth";
import { getCommunities } from "@/services/communities.service";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { useCommunitiesStore } from "@/store/communities";
import { useOwnerStore } from "@/store/index";

vi.mock("@tanstack/react-query", () => {
  const actual = vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock("@/components/CommunityStats", () => ({
  __esModule: true,
  default: () => <div data-testid="community-stats" />,
}));

vi.mock("@/components/Dialogs/CommunityDialog", () => ({
  CommunityDialog: () => <div data-testid="community-dialog" />,
}));

vi.mock("@/components/Pages/Admin/AddAdminDialog", () => ({
  AddAdmin: () => <button type="button">Add Admin</button>,
}));

vi.mock("@/components/Pages/Admin/RemoveAdminDialog", () => ({
  RemoveAdmin: () => <button type="button">Remove Admin</button>,
}));

vi.mock("@/hooks/useAdminCommunities", () => ({
  useAdminCommunities: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/communities.service", () => ({
  getCommunities: vi.fn(),
}));

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(),
}));

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(),
}));

vi.mock("@/store/communities", () => ({
  useCommunitiesStore: vi.fn(),
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockUseQuery = useQuery as unknown as vi.Mock;
const mockUseAdminCommunities = useAdminCommunities as unknown as vi.Mock;
const mockUseAuth = useAuth as unknown as vi.Mock;
const mockGetCommunities = getCommunities as unknown as vi.Mock;
const mockUsePermissionsQuery = usePermissionsQuery as unknown as vi.Mock;
const mockUseCommunitiesStore = useCommunitiesStore as unknown as vi.Mock;
const mockUseOwnerStore = useOwnerStore as unknown as vi.Mock;

describe("CommunityAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAdminCommunities.mockReturnValue({ communities: [], isLoading: false });
    mockUseAuth.mockReturnValue({
      authenticated: true,
      address: "0x1234567890123456789012345678901234567890",
    });

    mockUsePermissionsQuery.mockReturnValue({
      data: {
        roles: {
          roles: ["SUPER_ADMIN"],
        },
      },
      isLoading: false,
    });

    mockUseCommunitiesStore.mockReturnValue({
      communities: [],
      isLoading: false,
    });

    mockUseOwnerStore.mockImplementation((selector: (state: { isOwner: boolean }) => unknown) =>
      selector({ isOwner: false })
    );
  });

  it("renders communities from cached query data when returning to /admin", async () => {
    const cachedCommunity = {
      uid: "0x1111111111111111111111111111111111111111",
      chainID: 10,
      createdAt: "2025-01-01T00:00:00.000Z",
      details: {
        name: "Optimism Builders",
        slug: "optimism-builders",
        imageURL: "",
      },
    };

    mockUseQuery.mockReturnValue({
      data: {
        communities: [cachedCommunity],
        admins: [{ id: cachedCommunity.uid, admins: [], status: "ok" }],
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<CommunitiesToAdminPage />);

    expect(await screen.findByText("Optimism Builders")).toBeInTheDocument();
    expect(mockGetCommunities).not.toHaveBeenCalled();
  });
});
