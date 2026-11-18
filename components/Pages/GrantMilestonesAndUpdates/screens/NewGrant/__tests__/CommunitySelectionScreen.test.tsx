import { render, screen, waitFor } from "@testing-library/react";
import type { Community } from "@/types/v2/community";
import { CommunitySelectionScreen } from "../screens/CommunitySelectionScreen";

const mockGetCommunities = vi.fn();
const mockFormState = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  usePathname: () => "/project/my-project/funding/new",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services/communities.service", () => ({
  getCommunities: () => mockGetCommunities(),
}));

vi.mock("@/components/CommunitiesDropdown", () => ({
  CommunitiesDropdown: () => null,
}));

vi.mock("../index", () => ({
  SearchGrantProgram: ({ canAdd }: { canAdd: boolean }) => (
    <span>{canAdd ? "add new enabled" : "add new disabled"}</span>
  ),
}));
vi.mock("../StepBlock", () => ({
  StepBlock: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useDuplicateGrantCheck", () => ({
  useDuplicateGrantCheck: () => ({
    checkForDuplicateGrantInProject: vi.fn(),
    isCheckingGrantDuplicate: false,
    isGrantDuplicateInProject: false,
  }),
}));
vi.mock("@/hooks/useGrant", () => ({ useGrant: () => ({ updateGrant: vi.fn() }) }));
vi.mock("@/hooks/v2/useProjectGrants", () => ({ useProjectGrants: () => ({ grants: [] }) }));
vi.mock("@/store", () => ({
  useProjectStore: (selector: (state: { project: null }) => unknown) => selector({ project: null }),
}));
vi.mock("../store", () => ({
  useGrantFormStore: () => mockFormState(),
}));

const FILECOIN_UID = "0xFILECOIN";
const OPTIMISM_UID = "0xoptimism";

const createCommunity = (uid: string, overrides: Partial<Community> = {}): Community => ({
  uid: uid as `0x${string}`,
  chainID: 8453,
  details: { name: uid, slug: uid },
  ...overrides,
});

const selectCommunity = (community: string, flowType = "grant") =>
  mockFormState.mockReturnValue({
    setCurrentStep: vi.fn(),
    flowType,
    formData: { community },
    updateFormData: vi.fn(),
    communityNetworkId: 8453,
    setCommunityNetworkId: vi.fn(),
  });

describe("CommunitySelectionScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCommunities.mockResolvedValue([
      createCommunity(FILECOIN_UID, { disableCustomGrants: true }),
      createCommunity(OPTIMISM_UID),
    ]);
  });

  it("disables Add new when the selected community only allows existing programs", async () => {
    selectCommunity(FILECOIN_UID.toLowerCase());

    render(<CommunitySelectionScreen />);

    await waitFor(() => expect(screen.getByText("add new disabled")).toBeInTheDocument());
  });

  it("keeps Add new enabled for a community without the setting", async () => {
    selectCommunity(OPTIMISM_UID);

    render(<CommunitySelectionScreen />);

    await waitFor(() => expect(mockGetCommunities).toHaveBeenCalled());
    expect(screen.getByText("add new enabled")).toBeInTheDocument();
  });
});
