/**
 * The edit affordance must disappear once a milestone leaves PENDING, because
 * the SDK's `Milestone.edit()` rejects anything past that state
 * (Sentry GAP-FRONTEND-202).
 *
 * `GrantMilestoneSimpleOptionsMenu` reaches `MilestoneCard` through
 * `next/dynamic`, so the mock below resolves the *real* menu whenever it sees
 * that component's signature (a `canEdit` prop) and a neutral stub otherwise.
 * That keeps the assertion honest: it checks the pencil is absent from the DOM
 * rather than trusting a hand-written stand-in.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { GrantMilestoneSimpleOptionsMenu } from "@/components/Milestone/GrantMilestoneSimpleOptionsMenu";
import { MilestoneCard } from "@/components/Shared/ActivityCard/MilestoneCard";
import type { Verification } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

const render = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Two of the card's static imports reach the SDK's ethers-backed GAP client,
// which can't be constructed under jsdom. Neither renders for a `grant`
// milestone (the wrapper is activity/update-only, the other is attribution
// display), so stubbing them keeps the edit-gate assertion intact.
vi.mock("@/components/Shared/ActivityCard/ActivityActionsWrapper", () => ({
  ActivityActionsWrapper: () => <div data-testid="activity-actions" />,
}));

vi.mock("@/components/EthereumAddressToProfileName", () => ({
  __esModule: true,
  default: ({ address }: any) => <span>{address}</span>,
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Component = (props: any) =>
      "canEdit" in props ? (
        <div data-testid="options-menu">
          <GrantMilestoneSimpleOptionsMenu {...props} />
        </div>
      ) : (
        <div data-testid="dynamic-stub" />
      );
    Component.displayName = "DynamicComponent";
    return Component;
  },
}));

vi.mock("@/hooks/useMilestone", () => ({
  useMilestone: () => ({
    isDeleting: false,
    multiGrantDelete: vi.fn(),
    multiGrantUndoCompletion: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMilestoneActions", () => ({
  useMilestoneActions: () => ({
    isCompleting: false,
    handleCompleting: vi.fn(),
    isEditing: false,
    handleEditing: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMilestoneImpactAnswers", () => ({
  useMilestoneImpactAnswers: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: () => ({ refetch: vi.fn() }),
}));

vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  useGrantInvoiceRequired: () => ({ data: null }),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: any) => selector({ project: { uid: "project-1" } }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "project-1" }),
}));

vi.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: () => <button type="button" data-testid="delete-button" />,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: () => <span />,
  PaperClipIcon: () => <span />,
  PencilSquareIcon: () => <span data-testid="pencil-icon" />,
  ShareIcon: () => <span />,
  TrashIcon: () => <span />,
}));

const buildGrantMilestone = (overrides: Partial<UnifiedMilestone> = {}): UnifiedMilestone =>
  ({
    uid: "0xac1805",
    type: "grant",
    title: "Build MVP",
    description: "Build the minimum viable product",
    completed: false,
    createdAt: "2026-05-01T00:00:00Z",
    chainID: 10,
    refUID: "0xgrant",
    source: {
      type: "grant",
      grantMilestone: {
        milestone: {
          uid: "0xac1805",
          chainID: 10,
          title: "Build MVP",
          verified: [],
        },
        grant: { uid: "0xgrant", chainID: 10 },
      },
    },
    ...overrides,
  }) as unknown as UnifiedMilestone;

// Scoped to the options menu on purpose: a completed card also renders a
// pencil for editing the *completion* narrative, which goes through the SDK's
// `editCompletion()` and is legitimately still available here.
const optionsMenuPencil = () =>
  within(screen.getByTestId("options-menu")).queryByTestId("pencil-icon");

describe("MilestoneCard edit affordance", () => {
  it("shows the pencil for a pending milestone the wallet may edit", () => {
    render(<MilestoneCard milestone={buildGrantMilestone()} isAuthorized={true} canEdit={true} />);

    expect(optionsMenuPencil()).toBeInTheDocument();
  });

  it("hides the pencil once the milestone is completed", () => {
    render(
      <MilestoneCard
        milestone={buildGrantMilestone({ completed: true })}
        isAuthorized={true}
        canEdit={true}
      />
    );

    expect(optionsMenuPencil()).not.toBeInTheDocument();
    // Delete stays available — only the edit path is gated on lifecycle state.
    expect(
      within(screen.getByTestId("options-menu")).getByTestId("delete-button")
    ).toBeInTheDocument();
  });

  it("hides the pencil for a verified milestone", () => {
    const verification: Verification = {
      uid: "0xverified",
      attester: "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6",
      createdAt: "2026-05-03T00:00:00Z",
    };
    const verified = buildGrantMilestone();
    const grantMilestone = verified.source.grantMilestone;
    if (grantMilestone) grantMilestone.milestone.verified = [verification];

    render(<MilestoneCard milestone={verified} isAuthorized={true} canEdit={true} />);

    expect(optionsMenuPencil()).not.toBeInTheDocument();
  });
});
