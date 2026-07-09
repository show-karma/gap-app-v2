import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import CommunitiesToAdminPage from "@/components/Pages/Admin/CommunityAdmin";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useAuth } from "@/hooks/useAuth";
import { getCommunities } from "@/services/communities.service";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { useCommunitiesStore } from "@/store/communities";
import { useOwnerStore } from "@/store/index";

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
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

vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: ({ title, cta }: { title?: string; cta?: { label: string } }) => (
    <div data-testid="access-denied">
      <span>{title}</span>
      {cta ? <span data-testid="access-denied-cta">{cta.label}</span> : null}
    </div>
  ),
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
      ready: true,
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

    // Honor the Zustand selector calling convention since CommunityAdmin
    // converted to atomic selectors (v5 reference-equality stability).
    mockUseCommunitiesStore.mockImplementation(
      (selector?: (state: { communities: unknown[]; isLoading: boolean }) => unknown) => {
        const state = { communities: [], isLoading: false };
        return typeof selector === "function" ? selector(state) : state;
      }
    );

    mockUseOwnerStore.mockImplementation(
      (selector: (state: { isOwner: boolean; isOwnerLoading: boolean }) => unknown) =>
        selector({ isOwner: false, isOwnerLoading: false })
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

  it("renders an explicit AccessDenied with sign-in CTA for guests once Privy is ready (#1213)", () => {
    mockUseAuth.mockReturnValue({
      ready: true,
      authenticated: false,
      address: undefined,
    });
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });

    render(<CommunitiesToAdminPage />);

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.getByTestId("access-denied-cta")).toBeInTheDocument();
    // Never the blank NOT_ADMIN fall-through for a signed-out visitor.
    expect(screen.queryByText("You are not an admin of any community.")).not.toBeInTheDocument();
  });

  it("does not show AccessDenied while Privy is still initializing", () => {
    mockUseAuth.mockReturnValue({ ready: false, authenticated: false, address: undefined });
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });

    render(<CommunitiesToAdminPage />);

    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });
});
