/**
 * @file Emit-site coverage for `milestone_completed`.
 *
 * Catalog: `{ milestone_id, grant_id, days_vs_due_date, has_proof }`.
 *
 * `days_vs_due_date` is the property most worth pinning: the catalog defines
 * **negative as "completed before the due date"**, and the emit site computes
 * `round((now - endsAt) / day)`. A sign flip there is completely silent — every
 * chart still renders, the grantee-health funnel just inverts. `null` (no due
 * date) must also stay distinct from `0` (completed exactly on the due date).
 *
 * `has_proof` is derived from the deliverables array and must be a boolean, not
 * a count.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockTrack,
  mockComplete,
  mockSetupChainAndWallet,
  mockProjectById,
  mockRefetchGrants,
  mockShowSuccess,
} = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockComplete: vi.fn(),
  mockSetupChainAndWallet: vi.fn(),
  mockProjectById: vi.fn(),
  mockRefetchGrants: vi.fn(),
  mockShowSuccess: vi.fn(),
}));

const MILESTONE_UID = "0xmilestone";
const GRANT_UID = "0xgrant";
const PROJECT_UID = "0xproject";
const DAY_SECONDS = 24 * 60 * 60;

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/project/proj",
}));
vi.mock("wagmi", () => ({ useAccount: () => ({ address: "0xabc", chain: { id: 10 } }) }));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
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
    showError: vi.fn(),
    dismiss: vi.fn(),
    setIsStepper: vi.fn(),
  }),
}));
vi.mock("@/hooks/useMilestoneImpactAnswers", () => ({
  MILESTONE_IMPACT_QUERY_KEY: "milestone-impact",
  useMilestoneImpactAnswers: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({ grants: [], refetch: mockRefetchGrants }),
}));
vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  useGrantInvoiceRequired: () => ({
    isInvoiceRequired: false,
    isLoading: false,
    data: null,
  }),
}));
vi.mock("@/src/features/payout-disbursement/services/payout-disbursement.service", () => ({
  submitGranteeInvoice: vi.fn(),
}));
vi.mock("@/store", () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({ project: { uid: PROJECT_UID, details: { slug: "proj" } } }),
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
vi.mock("@/utilities/share/text", () => ({ SHARE_TEXTS: { MILESTONE_COMPLETE: () => "shared" } }));
vi.mock("@/utilities/sanitize", () => ({ sanitizeObject: (o: unknown) => o }));
vi.mock("@/utilities/milestoneImpactAnswers", () => ({
  deleteMilestoneImpactAnswers: vi.fn(),
  sendMilestoneImpactAnswers: vi.fn(),
}));
vi.mock("@/utilities/queryKeys", () => ({ createProjectQueryPredicate: () => () => false }));
vi.mock("@/utilities/hasAnyDirtyField", () => ({ hasAnyDirtyField: () => true }));

vi.mock("@/components/Forms/Outputs/OutputsSection", () => ({
  OutputsSection: () => <div data-testid="outputs-section" />,
}));
vi.mock("@/components/Utilities/FileUpload", () => ({ FileUpload: () => <div /> }));
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

import { MilestoneUpdateForm } from "@/components/Forms/MilestoneUpdate";

const nowSeconds = () => Math.floor(Date.now() / 1000);

const makeMilestone = (endsAt?: number) =>
  ({
    uid: MILESTONE_UID,
    refUID: GRANT_UID,
    chainID: 10,
    endsAt,
    title: "A milestone",
  }) as never;

const completedEvents = () =>
  mockTrack.mock.calls.filter(([name]) => name === "milestone_completed");

function renderForm(milestone: ReturnType<typeof makeMilestone>, previousData?: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MilestoneUpdateForm
        milestone={milestone}
        isEditing={false}
        previousData={previousData as never}
      />
    </QueryClientProvider>
  );
}

async function submit(milestone: ReturnType<typeof makeMilestone>, previousData?: unknown) {
  const user = userEvent.setup();
  renderForm(milestone, previousData);

  await user.clear(screen.getByPlaceholderText("0-100"));
  await user.type(screen.getByPlaceholderText("0-100"), "100");

  const button = screen.getByRole("button", { name: /mark as complete/i });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSetupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { fetch: { projectById: mockProjectById } },
  });
  mockComplete.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  mockProjectById.mockResolvedValue({
    grants: [
      {
        uid: GRANT_UID,
        milestones: [{ uid: MILESTONE_UID, chainID: 10, complete: mockComplete }],
      },
    ],
  });
  // The poll looks for the milestone marked completed on the refetched grants.
  mockRefetchGrants.mockResolvedValue({
    data: [{ uid: GRANT_UID, milestones: [{ uid: MILESTONE_UID, completed: true }] }],
  });
});

describe("MilestoneUpdateForm analytics", () => {
  it("emits milestone_completed with exactly the catalog properties", async () => {
    await submit(makeMilestone(nowSeconds() + 10 * DAY_SECONDS));

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    const [, props] = completedEvents()[0];
    expect(Object.keys(props as object).sort()).toEqual([
      "days_vs_due_date",
      "grant_id",
      "has_proof",
      "milestone_id",
    ]);
    expect(props).toMatchObject({ milestone_id: MILESTONE_UID, grant_id: GRANT_UID });
  });

  it("reports days_vs_due_date NEGATIVE when completed before the due date", async () => {
    // Due in 10 days, completed now.
    await submit(makeMilestone(nowSeconds() + 10 * DAY_SECONDS));

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    const { days_vs_due_date } = completedEvents()[0][1] as { days_vs_due_date: number };
    expect(days_vs_due_date).toBe(-10);
    // Explicit: the catalog says negative means early. A sign flip here is
    // invisible in every chart it feeds.
    expect(days_vs_due_date).toBeLessThan(0);
  });

  it("reports days_vs_due_date POSITIVE when completed after the due date", async () => {
    await submit(makeMilestone(nowSeconds() - 5 * DAY_SECONDS));

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    const { days_vs_due_date } = completedEvents()[0][1] as { days_vs_due_date: number };
    expect(days_vs_due_date).toBe(5);
  });

  it("reports days_vs_due_date null (not 0) when the milestone has no due date", async () => {
    await submit(makeMilestone(undefined));

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    const { days_vs_due_date } = completedEvents()[0][1] as { days_vs_due_date: number | null };
    expect(days_vs_due_date).toBeNull();
    // 0 is a real value here — "completed exactly on the due date" — so null
    // and 0 must never collapse into each other.
    expect(days_vs_due_date).not.toBe(0);
  });

  it("reports has_proof false when no deliverables are attached", async () => {
    await submit(makeMilestone(nowSeconds() + DAY_SECONDS));

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    expect(completedEvents()[0][1]).toMatchObject({ has_proof: false });
  });

  it("reports has_proof as a boolean true (not a count) when deliverables exist", async () => {
    await submit(makeMilestone(nowSeconds() + DAY_SECONDS), {
      deliverables: [
        { name: "Report", proof: "https://example.com/a", description: "" },
        { name: "Demo", proof: "https://example.com/b", description: "" },
      ],
    });

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    const { has_proof } = completedEvents()[0][1] as { has_proof: unknown };
    expect(has_proof).toBe(true);
    expect(typeof has_proof).toBe("boolean");
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await submit(makeMilestone(nowSeconds() + DAY_SECONDS));

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockComplete).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does not report a completion when the milestone never indexes as completed", async () => {
    mockRefetchGrants.mockResolvedValue({
      data: [{ uid: GRANT_UID, milestones: [{ uid: MILESTONE_UID, completed: false }] }],
    });

    await submit(makeMilestone(nowSeconds() + DAY_SECONDS));

    await waitFor(() => expect(mockComplete).toHaveBeenCalled(), { timeout: 4000 });
    expect(completedEvents()).toHaveLength(0);
  });

  it("never puts the completion narrative on the event", async () => {
    await submit(makeMilestone(nowSeconds() + DAY_SECONDS));

    await waitFor(() => expect(completedEvents()).toHaveLength(1), { timeout: 4000 });
    expect(JSON.stringify(completedEvents()[0])).not.toContain("0xabc");
  });
});
