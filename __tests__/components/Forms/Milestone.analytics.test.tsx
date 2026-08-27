/**
 * @file Emit-site coverage for `milestone_created` in the grant milestone form.
 *
 * Catalog: `{ grant_id, project_id, has_due_date }`.
 *
 * This is the grant-scoped sibling of the roadmap path already covered in
 * `UnifiedMilestoneScreen.analytics.test.tsx`. Here `grant_id` must be the
 * grant the milestone was attested against (never null, unlike the roadmap
 * path), and the event must fire only once the milestone is observed on the
 * refetched grant — an attestation that never indexes must report nothing.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockTrack, mockAttest, mockSetupChainAndWallet, mockRefetchGrants, mockShowSuccess } =
  vi.hoisted(() => ({
    mockTrack: vi.fn(),
    mockAttest: vi.fn(),
    mockSetupChainAndWallet: vi.fn(),
    mockRefetchGrants: vi.fn(),
    mockShowSuccess: vi.fn(),
  }));

const GRANT_UID = "0xgrant";
const PROJECT_UID = "0xproject";
const MILESTONE_UID = "0xmilestone";

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  Milestone: class {
    uid = MILESTONE_UID;
    chainID = 10;
    attest = mockAttest;
  },
}));

vi.mock("@headlessui/react", () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Popover: Object.assign(Passthrough, { Button: Passthrough, Panel: Passthrough }),
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("wagmi", () => ({ useAccount: () => ({ address: "0xabc", chain: { id: 10 } }) }));

vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    smartWalletAddress: "0xsmart",
  }),
}));
vi.mock("@/hooks/useGap", () => ({ useGap: () => ({ gap: {} }) }));
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    updateStep: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: vi.fn(),
    dismiss: vi.fn(),
    setIsStepper: vi.fn(),
  }),
}));
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({ refetch: mockRefetchGrants }),
}));
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  useIsCommunityAdmin: () => ({ isCommunityAdmin: false }),
}));
vi.mock("@/store", () => ({
  useOwnerStore: (selector: (s: unknown) => unknown) => selector({ isOwner: true }),
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({ project: { uid: PROJECT_UID, details: { slug: "proj" } } }),
}));

vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/utilities/indexer", () => ({ INDEXER: { ATTESTATION_LISTENER: () => "/listener" } }));
vi.mock("@/utilities/pages", () => ({
  PAGES: { PROJECT: { SCREENS: { SELECTED_SCREEN: () => "/x" } } },
}));
vi.mock("@/utilities/sanitize", () => ({ sanitizeObject: (o: unknown) => o }));
vi.mock("@/utilities/formatDate", () => ({ formatDate: () => "01 Jan 2030" }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ onChange }: { onChange: (v: string) => void }) => (
    <textarea aria-label="description" onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/Utilities/DatePicker", () => ({
  DatePicker: ({ onSelect, placeholder }: { onSelect: (d: Date) => void; placeholder: string }) => (
    <button
      type="button"
      aria-label={placeholder}
      onClick={() => onSelect(new Date("2030-01-01T00:00:00Z"))}
    >
      {placeholder}
    </button>
  ),
}));
vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

import { MilestoneForm } from "@/components/Forms/Milestone";

const grant = { uid: GRANT_UID, chainID: 10, milestones: [] } as never;

const createdEvents = () => mockTrack.mock.calls.filter(([name]) => name === "milestone_created");

async function submit() {
  const user = userEvent.setup();
  render(<MilestoneForm grant={grant} />);

  await user.type(screen.getByPlaceholderText("Ex: Finalize requirements"), "A milestone title");
  // `dates.endsAt` is required by the schema, so the form cannot submit without
  // it. Two pickers render: [0] is the optional start date, [1] is the end date.
  fireEvent.click(screen.getAllByRole("button", { name: /pick a date/i })[1]);

  const button = screen.getByRole("button", { name: /create milestone/i });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

const indexTheMilestone = () =>
  mockRefetchGrants.mockResolvedValue({
    data: [{ uid: GRANT_UID, milestones: [{ uid: MILESTONE_UID }] }],
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  mockSetupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { findSchema: vi.fn(() => ({ uid: "schema" })) },
  });
  indexTheMilestone();
});

describe("MilestoneForm analytics", () => {
  it("emits milestone_created with exactly the catalog properties", async () => {
    await submit();

    await waitFor(() => expect(createdEvents()).toHaveLength(1), { timeout: 4000 });
    const [, props] = createdEvents()[0];
    expect(Object.keys(props as object).sort()).toEqual(["grant_id", "has_due_date", "project_id"]);
  });

  it("attributes the milestone to its grant and project", async () => {
    await submit();

    await waitFor(() => expect(createdEvents()).toHaveLength(1), { timeout: 4000 });
    // Unlike the roadmap path (grant_id: null), a grant milestone must always
    // carry the grant it belongs to.
    expect(createdEvents()[0][1]).toMatchObject({
      grant_id: GRANT_UID,
      project_id: PROJECT_UID,
    });
  });

  it("reports has_due_date as a boolean", async () => {
    await submit();

    await waitFor(() => expect(createdEvents()).toHaveLength(1), { timeout: 4000 });
    const { has_due_date } = createdEvents()[0][1] as { has_due_date: unknown };
    expect(typeof has_due_date).toBe("boolean");
    // The schema makes `dates.endsAt` mandatory on this form, so this leg can
    // only ever be true here; the false case lives on the roadmap path.
    expect(has_due_date).toBe(true);
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await submit();

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockAttest).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does not report a creation when the milestone never indexes", async () => {
    mockRefetchGrants.mockResolvedValue({ data: [{ uid: GRANT_UID, milestones: [] }] });

    await submit();

    await waitFor(() => expect(mockAttest).toHaveBeenCalled(), { timeout: 4000 });
    expect(createdEvents()).toHaveLength(0);
  });

  it("never puts the milestone title or recipient address on the event", async () => {
    await submit();

    await waitFor(() => expect(createdEvents()).toHaveLength(1), { timeout: 4000 });
    const serialised = JSON.stringify(createdEvents()[0]);
    expect(serialised).not.toContain("A milestone title");
    expect(serialised).not.toContain("0xsmart");
  });
});
