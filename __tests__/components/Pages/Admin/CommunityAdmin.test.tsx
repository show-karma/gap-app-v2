import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import CommunitiesToAdminPage from "@/components/Pages/Admin/CommunityAdmin";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useAuth } from "@/hooks/useAuth";
import { getCommunities } from "@/services/communities.service";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { useCommunitiesStore } from "@/store/communities";
import { useOwnerStore } from "@/store/index";

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

jest.mock("@/components/CommunityStats", () => ({
  __esModule: true,
  default: () => <div data-testid="community-stats" />,
}));

jest.mock("@/components/Dialogs/CommunityDialog", () => ({
  CommunityDialog: () => <div data-testid="community-dialog" />,
}));

jest.mock("@/components/Pages/Admin/AddAdminDialog", () => ({
  AddAdmin: () => <button type="button">Add Admin</button>,
}));

jest.mock("@/components/Pages/Admin/RemoveAdminDialog", () => ({
  RemoveAdmin: () => <button type="button">Remove Admin</button>,
}));

jest.mock("@/hooks/useAdminCommunities", () => ({
  useAdminCommunities: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/communities.service", () => ({
  getCommunities: jest.fn(),
}));

jest.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: jest.fn(),
}));

jest.mock("@/store", () => ({
  useOwnerStore: jest.fn(),
}));

jest.mock("@/store/communities", () => ({
  useCommunitiesStore: jest.fn(),
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseQuery = useQuery as unknown as jest.Mock;
const mockUseAdminCommunities = useAdminCommunities as unknown as jest.Mock;
const mockUseAuth = useAuth as unknown as jest.Mock;
const mockGetCommunities = getCommunities as unknown as jest.Mock;
const mockUsePermissionsQuery = usePermissionsQuery as unknown as jest.Mock;
const mockUseCommunitiesStore = useCommunitiesStore as unknown as jest.Mock;
const mockUseOwnerStore = useOwnerStore as unknown as jest.Mock;

describe("CommunityAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
        admins: [{ id: cachedCommunity.uid, admins: [] }],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<CommunitiesToAdminPage />);

    expect(await screen.findByText("Optimism Builders")).toBeInTheDocument();
    expect(mockGetCommunities).not.toHaveBeenCalled();
  });
});
