import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ProjectOptionsMenu } from "@/components/Pages/Project/ProjectOptionsMenu";
import { Role } from "@/src/core/rbac/types";

const mockAuthState = {
  authenticated: false,
};

const mockProjectStoreState = {
  project: {
    uid: "0xproject",
    chainID: 10,
  },
  isProjectAdmin: false,
  isProjectOwner: false,
  refreshProject: vi.fn(),
};

const mockOwnerStoreState = {
  isOwner: false,
};

const mockPermissionsState = {
  isLoading: false,
  roles: [] as Role[],
};

const mockCommunityAdminState = {
  isCommunityAdmin: false,
};

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const MockDynamicComponent = () => null;
    MockDynamicComponent.displayName = "MockDynamicComponent";
    return MockDynamicComponent;
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "karma" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, chain: undefined }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/hooks/useContactInfo", () => ({
  useContactInfo: () => ({ data: [] }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ switchChainAsync: vi.fn() }),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: vi.fn(),
  }),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  useIsCommunityAdmin: () => mockCommunityAdminState.isCommunityAdmin,
}));

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: () => ({
    data: { roles: { roles: mockPermissionsState.roles } },
    isLoading: mockPermissionsState.isLoading,
  }),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector?: (state: typeof mockProjectStoreState) => unknown) =>
    selector ? selector(mockProjectStoreState) : mockProjectStoreState,
  useOwnerStore: (selector?: (state: typeof mockOwnerStoreState) => unknown) =>
    selector ? selector(mockOwnerStoreState) : mockOwnerStoreState,
}));

vi.mock("@/store/modals/projectEdit", () => ({
  useProjectEditModalStore: () => ({
    openProjectEditModal: vi.fn(),
  }),
}));

vi.mock("@/store/modals/merge", () => ({
  useMergeModalStore: () => ({
    openMergeModal: vi.fn(),
  }),
}));

vi.mock("@/store/modals/genie", () => ({
  useGrantGenieModalStore: () => ({
    openGrantGenieModal: vi.fn(),
  }),
}));

vi.mock("@/store/modals/transferOwnership", () => ({
  useTransferOwnershipModalStore: () => ({
    openTransferOwnershipModal: vi.fn(),
  }),
}));

vi.mock("@/store/modals/adminTransferOwnership", () => ({
  useAdminTransferOwnershipModalStore: () => ({
    openAdminTransferOwnershipModal: vi.fn(),
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock("@/components/Icons", () => ({
  GithubIcon: () => <span>GitHub</span>,
}));

vi.mock("@/src/features/chain-payout-address", () => ({
  SetChainPayoutAddressModal: () => null,
}));

vi.mock("@/utilities/sdk", () => ({
  deleteProject: vi.fn(),
  getProjectById: vi.fn(),
}));

vi.mock("@/components/Pages/Project/LinkContractAddressButton", () => ({
  LinkContractAddressButton: () => null,
}));

vi.mock("@/components/Pages/Project/LinkDivviWalletButton", () => ({
  LinkDivviWalletButton: () => null,
}));

vi.mock("@/components/Pages/Project/LinkGithubRepoButton", () => ({
  LinkGithubRepoButton: () => null,
}));

vi.mock("@/components/Pages/Project/LinkOSOProfileButton", () => ({
  LinkOSOProfileButton: () => null,
}));

describe("ProjectOptionsMenu", () => {
  beforeEach(() => {
    mockAuthState.authenticated = false;
    mockProjectStoreState.isProjectAdmin = false;
    mockProjectStoreState.isProjectOwner = false;
    mockOwnerStoreState.isOwner = false;
    mockPermissionsState.isLoading = false;
    mockPermissionsState.roles = [];
    mockCommunityAdminState.isCommunityAdmin = false;
    vi.clearAllMocks();
  });

  it("does not render the project settings button for logged out users", () => {
    render(<ProjectOptionsMenu />);

    expect(screen.queryByTestId("project-options-menu")).not.toBeInTheDocument();
  });

  it("does not render the project settings button for authenticated users without admin access", () => {
    mockAuthState.authenticated = true;

    render(<ProjectOptionsMenu />);

    expect(screen.queryByTestId("project-options-menu")).not.toBeInTheDocument();
  });

  it("renders the project settings button for project admins", () => {
    mockAuthState.authenticated = true;
    mockProjectStoreState.isProjectAdmin = true;

    render(<ProjectOptionsMenu />);

    expect(screen.getByTestId("project-options-menu")).toBeInTheDocument();
    expect(screen.getByText("Project Settings")).toBeInTheDocument();
  });

  it("renders the project settings button for super admins", () => {
    mockAuthState.authenticated = true;
    mockPermissionsState.roles = [Role.SUPER_ADMIN];

    render(<ProjectOptionsMenu />);

    expect(screen.getByTestId("project-options-menu")).toBeInTheDocument();
  });

  it("renders the project settings button for community admins", () => {
    mockAuthState.authenticated = true;
    mockCommunityAdminState.isCommunityAdmin = true;

    render(<ProjectOptionsMenu />);

    expect(screen.getByTestId("project-options-menu")).toBeInTheDocument();
  });
});
