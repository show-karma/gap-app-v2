/**
 * @file Emit-site coverage for `grant_added_completed` / `grant_added_failed`.
 *
 * Catalog:
 *   `grant_added_completed { project_id, grant_id, community_id, program_id, milestones_count }`
 *   `grant_added_failed    { error_code, project_id, community_id }`
 *
 * Per R2 this single-submit flow has no `_started` leg, so the two terminal
 * legs carry the whole program-conversion funnel. The properties that matter
 * and are easy to get wrong:
 *   - `milestones_count` must be the number of milestones actually attested,
 *     not a boolean or the form-row count;
 *   - `community_id` / `program_id` are nullable and must be an explicit
 *     `null` rather than `""` when absent — an empty string reads as a real
 *     (blank) community when grouping;
 *   - the completed leg fires only after the grant is observed with indexed
 *     details, so an attestation that never indexes must report nothing.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockTrack,
  mockAttest,
  mockSetupChainAndWallet,
  mockGetProjectGrants,
  mockShowSuccess,
  mockShowError,
  mockStoreState,
} = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockAttest: vi.fn(),
  mockSetupChainAndWallet: vi.fn(),
  mockGetProjectGrants: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockStoreState: { current: null as unknown },
}));

const PROJECT_UID = "0xproject";
const GRANT_UID = "0xgrant";
const COMMUNITY_UID = "0xcommunity";

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  Grant: class {
    uid = GRANT_UID;
    chainID = 10;
    recipient = "0xrecipient";
    details: unknown = null;
    milestones: unknown[] = [];
    attest = mockAttest;
  },
  GrantDetails: class {},
  Milestone: class {},
  nullRef: "0x0",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/project/proj/grants/new",
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ connector: {}, chain: { id: 10 } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), refetchQueries: vi.fn() }),
}));

vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, address: "0xabc", isConnected: true }),
}));
vi.mock("@/hooks/useGap", () => ({ useGap: () => ({ gap: {} }) }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    smartWalletAddress: "0xsmart",
  }),
}));
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: vi.fn(),
  }),
}));
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({ refetch: vi.fn().mockResolvedValue({ data: [] }) }),
}));
vi.mock("@/services/project-grants.service", () => ({
  getProjectGrants: (...args: unknown[]) => mockGetProjectGrants(...args),
}));
vi.mock("@/store", () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({ project: { uid: PROJECT_UID, chainID: 10, details: { slug: "proj" } } }),
}));

vi.mock("@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/store", () => ({
  useGrantFormStore: () => mockStoreState.current,
}));

vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/utilities/indexer", () => ({ INDEXER: { ATTESTATION_LISTENER: () => "/listener" } }));
vi.mock("@/utilities/pages", () => ({
  PAGES: { PROJECT: { SCREENS: { SELECTED_SCREEN: () => "/x", ALL_GRANTS: () => "/x" } } },
}));
vi.mock("@/utilities/queryKeys", () => ({ QUERY_KEYS: { PROJECT: () => ["project"] } }));
vi.mock("@/utilities/sanitize", () => ({ sanitizeObject: (o: unknown) => o }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/Milestone", () => ({
  Milestone: () => <div data-testid="milestone-row" />,
}));
vi.mock("@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/StepBlock", () => ({
  StepBlock: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/screens/buttons/CancelButton",
  () => ({ CancelButton: () => <button type="button">Cancel</button> })
);
vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/screens/buttons/NextButton",
  () => ({
    NextButton: ({
      onClick,
      disabled,
      text,
    }: {
      onClick: () => void;
      disabled: boolean;
      text: string;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {text}
      </button>
    ),
  })
);

import { MilestonesScreen } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/screens/MilestonesScreen";

const milestoneRow = (title: string) => ({
  isValid: true,
  data: { title, description: "d", endsAt: 1_900_000_000 },
});

function buildStore(overrides: Record<string, unknown> = {}) {
  return {
    setCurrentStep: vi.fn(),
    flowType: "grant",
    formData: {
      title: "A grant",
      description: "desc",
      community: COMMUNITY_UID,
      programId: "prog-1",
      questions: [],
      selectedTrackIds: [],
    },
    milestonesForms: [milestoneRow("M1"), milestoneRow("M2")],
    createMilestone: vi.fn(),
    saveMilestone: vi.fn(),
    clearMilestonesForms: vi.fn(),
    setFormPriorities: vi.fn(),
    updateFormData: vi.fn(),
    resetFormData: vi.fn(),
    setFlowType: vi.fn(),
    communityNetworkId: 10,
    ...overrides,
  };
}

const eventsNamed = (name: string) => mockTrack.mock.calls.filter(([n]) => n === name);

async function submit() {
  const user = userEvent.setup();
  render(<MilestonesScreen />);
  const button = screen.getByRole("button", { name: /create grant/i });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

// The poll waits for the grant to come back with indexed details.
const indexTheGrant = () =>
  mockGetProjectGrants.mockResolvedValue([{ uid: GRANT_UID, details: { title: "A grant" } }]);

beforeEach(() => {
  vi.clearAllMocks();
  mockStoreState.current = buildStore();
  mockAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  mockSetupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { findSchema: vi.fn(() => ({ uid: "schema" })) },
  });
  indexTheGrant();
});

describe("MilestonesScreen analytics", () => {
  it("emits grant_added_completed with exactly the catalog properties", async () => {
    await submit();

    await waitFor(() => expect(eventsNamed("grant_added_completed")).toHaveLength(1), {
      timeout: 4000,
    });
    const [, props] = eventsNamed("grant_added_completed")[0];
    expect(Object.keys(props as object).sort()).toEqual([
      "community_id",
      "grant_id",
      "milestones_count",
      "program_id",
      "project_id",
    ]);
    expect(props).toMatchObject({
      project_id: PROJECT_UID,
      grant_id: GRANT_UID,
      community_id: COMMUNITY_UID,
      program_id: "prog-1",
    });
  });

  it("counts the milestones actually attested", async () => {
    await submit();

    await waitFor(() => expect(eventsNamed("grant_added_completed")).toHaveLength(1), {
      timeout: 4000,
    });
    const { milestones_count } = eventsNamed("grant_added_completed")[0][1] as {
      milestones_count: number;
    };
    expect(milestones_count).toBe(2);
    expect(typeof milestones_count).toBe("number");
  });

  it("reports milestones_count 0 for a grant added with no milestones", async () => {
    mockStoreState.current = buildStore({ milestonesForms: [] });

    await submit();

    await waitFor(() => expect(eventsNamed("grant_added_completed")).toHaveLength(1), {
      timeout: 4000,
    });
    expect(eventsNamed("grant_added_completed")[0][1]).toMatchObject({ milestones_count: 0 });
  });

  it("sends community_id / program_id as null, never an empty string, when absent", async () => {
    mockStoreState.current = buildStore({
      formData: {
        title: "A grant",
        description: "desc",
        community: "",
        programId: undefined,
        questions: [],
        selectedTrackIds: [],
      },
    });

    await submit();

    await waitFor(() => expect(eventsNamed("grant_added_completed")).toHaveLength(1), {
      timeout: 4000,
    });
    const props = eventsNamed("grant_added_completed")[0][1] as Record<string, unknown>;
    // "" would group as a real, blank community in Mixpanel; null does not.
    expect(props.community_id).toBeNull();
    expect(props.program_id).toBeNull();
  });

  it("emits grant_added_failed with a machine code, never the raw message", async () => {
    mockAttest.mockRejectedValue(new Error("user rejected the request"));

    await submit();

    await waitFor(() => expect(eventsNamed("grant_added_failed")).toHaveLength(1), {
      timeout: 4000,
    });
    const [, props] = eventsNamed("grant_added_failed")[0];
    expect(Object.keys(props as object).sort()).toEqual([
      "community_id",
      "error_code",
      "project_id",
    ]);
    expect(JSON.stringify(props)).not.toContain("user rejected the request");
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await submit();

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockAttest).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does not report a completion when the grant never indexes its details", async () => {
    // Grant comes back, but without GrantDetails processed.
    mockGetProjectGrants.mockResolvedValue([{ uid: GRANT_UID, details: undefined }]);

    await submit();

    await waitFor(() => expect(mockAttest).toHaveBeenCalled(), { timeout: 4000 });
    expect(eventsNamed("grant_added_completed")).toHaveLength(0);
  });

  it("emits no _started leg for this single-submit flow (R2)", async () => {
    await submit();

    await waitFor(() => expect(eventsNamed("grant_added_completed")).toHaveLength(1), {
      timeout: 4000,
    });
    const started = mockTrack.mock.calls
      .map(([name]) => name as string)
      .filter((name) => name.endsWith("_started"));
    expect(started).toEqual([]);
  });
});
