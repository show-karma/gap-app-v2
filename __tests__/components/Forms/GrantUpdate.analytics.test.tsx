/**
 * @file Emit-site coverage for `grant_update_posted`.
 *
 * Catalog: `grant_update_posted { grant_id, community_id }`.
 *
 * Per R2 this is a single-submit form, so there is deliberately no `_started`
 * leg — the tests below assert that too, because adding one later should be a
 * catalog decision rather than something that appears by accident.
 *
 * `community_id` is nullable and is read from `grant.data.communityUID`. A
 * grant with no community must send an explicit `null`: dropping the key
 * instead would make the property absent in Mixpanel, which is not the same
 * thing as "no community" when segmenting the program-conversion funnel.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockTrack,
  mockAttest,
  mockSetupChainAndWallet,
  mockGetProjectGrants,
  mockShowSuccess,
  mockShowError,
} = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockAttest: vi.fn(),
  mockSetupChainAndWallet: vi.fn(),
  mockGetProjectGrants: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
}));

const GRANT_UID = "0xgrant";
const UPDATE_UID = "0xnewupdate";
const COMMUNITY_UID = "0xcommunity";

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GrantUpdate: class {
    uid = UPDATE_UID;
    chainID = 10;
    attest = mockAttest;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/project/proj",
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabc", chain: { id: 10 } }),
}));

vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({ setupChainAndWallet: mockSetupChainAndWallet }),
}));
vi.mock("@/hooks/useGap", () => ({ useGap: () => ({ gap: {} }) }));
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    updateStep: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: vi.fn(),
    setIsStepper: vi.fn(),
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
    selector({ project: { uid: "0xproject", details: { slug: "proj" } } }),
}));
vi.mock("@/store/grant", () => ({
  useGrantStore: (selector: (s: unknown) => unknown) => selector({ setGrant: vi.fn() }),
}));
vi.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: () => ({ openShareDialog: vi.fn() }),
}));
vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/utilities/indexer", () => ({
  INDEXER: { ATTESTATION_LISTENER: () => "/listener" },
}));
vi.mock("@/utilities/pages", () => ({
  PAGES: { PROJECT: { SCREENS: { SELECTED_SCREEN: () => "/project/proj/x" } } },
}));
// `@/utilities/messages` is intentionally NOT mocked: the zod schema reads
// nested message constants at module load, and a partial mock turns that into
// an import-time TypeError rather than a test failure.
vi.mock("@/utilities/share/text", () => ({ SHARE_TEXTS: { GRANT_UPDATE: () => "shared" } }));
vi.mock("@/utilities/sanitize", () => ({ sanitizeObject: (o: unknown) => o }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ onChange }: { onChange: (v: string) => void }) => (
    <textarea aria-label="description" onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

import { GrantUpdateForm } from "@/components/Forms/GrantUpdate";

const grantWithCommunity = {
  uid: GRANT_UID,
  chainID: 10,
  data: { communityUID: COMMUNITY_UID },
  details: { title: "A grant" },
} as never;

const grantWithoutCommunity = {
  uid: GRANT_UID,
  chainID: 10,
  data: {},
  details: { title: "A grant" },
} as never;

const postedEvents = () => mockTrack.mock.calls.filter(([name]) => name === "grant_update_posted");

function renderForm(grant: typeof grantWithCommunity) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GrantUpdateForm grant={grant} />
    </QueryClientProvider>
  );
}

async function submit(grant: typeof grantWithCommunity) {
  const user = userEvent.setup();
  renderForm(grant);

  await user.type(screen.getByPlaceholderText("Ex: Backend dev work complete"), "Update title");
  await user.type(screen.getByLabelText("description"), "Some meaningful progress detail");
  // Required by `updateSchema`: an empty completion percentage fails validation
  // and `handleSubmit` never calls onSubmit, so the form would silently do nothing.
  await user.type(screen.getByPlaceholderText("0-100"), "50");
  // The submit button is additionally gated on proof-of-work being present
  // (or the "no proof" checkbox), independently of schema validity.
  await user.type(
    screen.getByPlaceholderText(
      "Add links to charts, videos, dashboards etc. that evaluators can verify your work"
    ),
    "https://example.com/proof"
  );

  const button = screen.getByRole("button", { name: /post update/i });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

// The poll looks for the new update on the refetched grant.
const indexTheUpdate = () =>
  mockGetProjectGrants.mockResolvedValue([{ uid: GRANT_UID, updates: [{ uid: UPDATE_UID }] }]);

beforeEach(() => {
  vi.clearAllMocks();
  mockAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  mockSetupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { findSchema: vi.fn(() => ({ uid: "schema-1" })) },
  });
  indexTheUpdate();
});

describe("GrantUpdateForm analytics", () => {
  it("emits grant_update_posted with the grant and community once indexed", async () => {
    await submit(grantWithCommunity);

    await waitFor(() => expect(postedEvents()).toHaveLength(1), { timeout: 3000 });
    expect(postedEvents()[0]).toEqual([
      "grant_update_posted",
      { grant_id: GRANT_UID, community_id: COMMUNITY_UID },
    ]);
  });

  it("sends community_id: null rather than omitting it when the grant has no community", async () => {
    await submit(grantWithoutCommunity);

    await waitFor(() => expect(postedEvents()).toHaveLength(1), { timeout: 3000 });
    const [, props] = postedEvents()[0];
    expect(props).toHaveProperty("community_id", null);
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await submit(grantWithCommunity);

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockAttest).not.toHaveBeenCalled();
    expect(postedEvents()).toHaveLength(0);
  });

  it("does not report a post when the update never indexes", async () => {
    // Attestation succeeds but the update never appears on the refetched grant,
    // so the component polls on (1000 attempts, 1.5s apart) well past the end
    // of this test. A DIFFERENT grant uid is used here deliberately: `beforeEach`
    // restores the indexed mock for the next test, and an orphaned poll still
    // looking for GRANT_UID would find it and emit a second
    // `grant_update_posted` inside whichever test happened to be running.
    // Looking for a grant the restored mock never returns keeps it inert.
    const ORPHAN_GRANT_UID = "0xgrant-never-indexed";
    const orphanGrant = { ...(grantWithCommunity as object), uid: ORPHAN_GRANT_UID } as never;
    mockGetProjectGrants.mockResolvedValue([{ uid: ORPHAN_GRANT_UID, updates: [] }]);

    await submit(orphanGrant);

    await waitFor(() => expect(mockAttest).toHaveBeenCalled());
    expect(postedEvents()).toHaveLength(0);
  });

  it("emits no _started leg for this single-submit form (R2)", async () => {
    await submit(grantWithCommunity);

    await waitFor(() => expect(postedEvents()).toHaveLength(1), { timeout: 3000 });
    const startedNames = mockTrack.mock.calls
      .map(([name]) => name as string)
      .filter((name) => name.endsWith("_started"));
    expect(startedNames).toEqual([]);
  });

  it("never puts the update text on the event", async () => {
    await submit(grantWithCommunity);

    await waitFor(() => expect(postedEvents()).toHaveLength(1), { timeout: 3000 });
    const serialised = JSON.stringify(postedEvents()[0]);
    expect(serialised).not.toContain("Some meaningful progress detail");
    expect(serialised).not.toContain("Update title");
  });
});
