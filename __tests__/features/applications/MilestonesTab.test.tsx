/**
 * Orchestrator tests for MilestonesTab.
 *
 * The tab merges off-chain (`applicationData`) and on-chain
 * (`useProjectGrantMilestones`) milestones into a single sorted, deduped
 * list. These tests verify the orchestrator's contract directly — the
 * row components are mocked to lightweight stand-ins so we can assert
 * what gets rendered, in what order, and with what props, without
 * pulling in Privy / wagmi / SDK.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import type { Application, MilestoneStatusEntry } from "@/types/whitelabel-entities";

const mockUseProjectGrantMilestones = vi.fn();
const mockUseApplicationInvoiceConfig = vi.fn();

vi.mock("@/hooks/useProjectGrantMilestones", () => ({
  useProjectGrantMilestones: (...args: unknown[]) => mockUseProjectGrantMilestones(...args),
}));

vi.mock("@/src/features/applications/hooks/use-application-invoice-config", () => ({
  useApplicationInvoiceConfig: (...args: unknown[]) => mockUseApplicationInvoiceConfig(...args),
}));

vi.mock("@/src/features/applications/components/OffChainMilestoneRow", () => ({
  OffChainMilestoneRow: ({
    milestone,
    fieldLabel,
  }: {
    milestone: { title: string; milestoneUID?: string };
    fieldLabel: string;
  }) => (
    <div
      data-testid="off-chain-row"
      data-field-label={fieldLabel}
      data-uid={milestone.milestoneUID ?? ""}
    >
      {milestone.title}
    </div>
  ),
}));

vi.mock("@/src/features/applications/components/OnChainMilestoneRow", () => ({
  OnChainMilestoneRow: ({ milestone }: { milestone: { uid: string; title: string } }) => (
    <div data-testid="on-chain-row" data-uid={milestone.uid}>
      {milestone.title}
    </div>
  ),
}));

import { MilestonesTab } from "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/components/MilestonesTab";

const REF = "REF-MS-1";
const PROJECT_UID = "0xproject1";
const PROGRAM_ID = "program-1";
const GRANT_UID = "0xgrant1";

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    referenceNumber: REF,
    programId: PROGRAM_ID,
    projectUID: PROJECT_UID,
    status: "approved",
    applicationData: {},
    statusHistory: [],
    milestoneStatuses: [],
    ...overrides,
  } as Application;
}

function makeStatusEntry(overrides: Partial<MilestoneStatusEntry> = {}): MilestoneStatusEntry {
  return {
    milestoneUID: "0xms-default",
    currentStatus: "pending",
    grantUID: GRANT_UID,
    chainID: 10,
    ...overrides,
  } as MilestoneStatusEntry;
}

function makeOnChain(
  overrides: Partial<GrantMilestoneWithCompletion> = {}
): GrantMilestoneWithCompletion {
  return {
    uid: "0xms-onchain-default",
    chainId: 10,
    title: "On-chain milestone",
    description: "",
    dueDate: "2025-09-01",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseApplicationInvoiceConfig.mockReturnValue({ data: null, isLoading: false });
  mockUseProjectGrantMilestones.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe("MilestonesTab — merge orchestrator", () => {
  it("should_render_empty_state_when_no_offchain_fields_and_no_onchain_milestones", () => {
    render(<MilestonesTab application={makeApplication()} isOwner={false} />);

    expect(screen.getByText(/No milestones defined for this application/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId(/-row$/)).toHaveLength(0);
  });

  it("should_render_offchain_only_when_projectUID_or_programId_missing_and_offchain_present", () => {
    // Hook gating: when projectUID is missing, useProjectGrantMilestones is
    // called but returns no data (the hook itself is enabled-gated).
    const application = makeApplication({
      projectUID: undefined,
      applicationData: {
        projectMilestones: [
          {
            title: "Beta launch",
            description: "ship beta",
            dueDate: "2025-08-01",
          },
          {
            title: "GA launch",
            description: "ship GA",
            dueDate: "2025-12-01",
          },
        ],
      },
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const rows = screen.getAllByTestId("off-chain-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Beta launch");
    expect(rows[1]).toHaveTextContent("GA launch");
    expect(screen.queryByTestId("on-chain-row")).not.toBeInTheDocument();
  });

  it("should_render_onchain_only_when_no_offchain_milestone_field", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        project: { uid: PROJECT_UID, chainID: 10, owner: "0x", details: { title: "T" } },
        grant: { uid: GRANT_UID } as never,
        grantMilestones: [
          makeOnChain({ uid: "0xon1", title: "On-chain only", dueDate: "2025-07-01" }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MilestonesTab application={makeApplication()} isOwner={true} />);

    const onChainRows = screen.getAllByTestId("on-chain-row");
    expect(onChainRows).toHaveLength(1);
    expect(onChainRows[0]).toHaveTextContent("On-chain only");
    expect(screen.queryByTestId("off-chain-row")).not.toBeInTheDocument();
  });

  it("should_merge_non_overlapping_offchain_and_onchain_milestones_in_a_single_list", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        project: { uid: PROJECT_UID, chainID: 10, owner: "0x", details: { title: "T" } },
        grant: { uid: GRANT_UID } as never,
        grantMilestones: [
          makeOnChain({ uid: "0xon1", title: "Pure on-chain", dueDate: "2025-07-01" }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const application = makeApplication({
      applicationData: {
        projectMilestones: [
          {
            title: "Form milestone",
            description: "",
            dueDate: "2025-08-01",
          },
        ],
      },
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    expect(screen.getAllByTestId("off-chain-row")).toHaveLength(1);
    expect(screen.getAllByTestId("on-chain-row")).toHaveLength(1);
  });

  it("should_drop_onchain_duplicate_when_offchain_milestone_carries_the_same_milestoneUID", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        project: { uid: PROJECT_UID, chainID: 10, owner: "0x", details: { title: "T" } },
        grant: { uid: GRANT_UID } as never,
        grantMilestones: [
          makeOnChain({ uid: "0xshared", title: "Renamed on-chain", dueDate: "2025-08-01" }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const application = makeApplication({
      applicationData: {
        projectMilestones: [
          {
            title: "Original off-chain title",
            description: "",
            dueDate: "2025-08-01",
            // UID match wins even when titles differ — covers the case where
            // a milestone was renamed off-chain after on-chain mint.
            milestoneUID: "0xshared",
          },
        ],
      },
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    expect(screen.getAllByTestId("off-chain-row")).toHaveLength(1);
    expect(screen.queryByTestId("on-chain-row")).not.toBeInTheDocument();
  });

  it("should_drop_onchain_duplicate_when_offchain_lacks_uid_but_normalized_titles_match", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        project: { uid: PROJECT_UID, chainID: 10, owner: "0x", details: { title: "T" } },
        grant: { uid: GRANT_UID } as never,
        grantMilestones: [
          makeOnChain({ uid: "0xon1", title: "Phase 1: MVP", dueDate: "2025-08-01" }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const application = makeApplication({
      applicationData: {
        projectMilestones: [
          {
            title: "  phase 1: MVP  ",
            description: "",
            dueDate: "2025-08-01",
            // No milestoneUID yet — the dedup falls back to normalized title.
          },
        ],
      },
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    expect(screen.getAllByTestId("off-chain-row")).toHaveLength(1);
    expect(screen.queryByTestId("on-chain-row")).not.toBeInTheDocument();
  });

  it("should_sort_completed_or_verified_rows_below_pending_then_due_date_ascending", () => {
    const completedStatus = makeStatusEntry({
      milestoneUID: "0xdone",
      currentStatus: "completed",
      completed: { uid: "c1", attester: "0xa", reason: "done", createdAt: "2025-01-01" } as never,
    });

    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        project: { uid: PROJECT_UID, chainID: 10, owner: "0x", details: { title: "T" } },
        grant: { uid: GRANT_UID } as never,
        grantMilestones: [
          // Pending, late due date — should come second among pendings.
          makeOnChain({ uid: "0xon-late", title: "On-chain late", dueDate: "2025-12-01" }),
          // Verified — should sink to bottom.
          makeOnChain({
            uid: "0xon-verified",
            title: "On-chain verified",
            dueDate: "2025-06-01",
            status: "verified",
            verificationDetails: {
              description: "ok",
              verifiedAt: "2025-07-01",
              verifiedBy: "0xrev",
            },
          }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const application = makeApplication({
      milestoneStatuses: [completedStatus],
      applicationData: {
        projectMilestones: [
          // Off-chain pending, earliest due — should come first.
          { title: "Off-chain early", description: "", dueDate: "2025-05-01" },
          // Off-chain completed — should sink with the on-chain verified.
          {
            title: "Off-chain completed",
            description: "",
            dueDate: "2025-04-01",
            milestoneUID: "0xdone",
          },
        ],
      },
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const allRows = screen.getAllByTestId(/-row$/);
    const titlesInOrder = allRows.map((el) => el.textContent);

    // Pending tier first (asc by due date), then completed/verified tier
    // (also asc by due date, but pushed to the bottom).
    expect(titlesInOrder).toEqual([
      "Off-chain early", // 2025-05 pending
      "On-chain late", // 2025-12 pending
      "Off-chain completed", // 2025-04 completed (sinks)
      "On-chain verified", // 2025-06 verified (sinks)
    ]);
  });

  it("should_render_loading_skeleton_when_onchain_query_is_loading_and_no_items_yet", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<MilestonesTab application={makeApplication()} isOwner={false} />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/-row$/)).toHaveLength(0);
  });

  it("should_render_error_with_retry_when_onchain_query_fails_and_no_items_yet", () => {
    const refetch = vi.fn();
    mockUseProjectGrantMilestones.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("indexer down"),
      refetch,
    });

    render(<MilestonesTab application={makeApplication()} isOwner={false} />);

    const retry = screen.getByRole("button", { name: /retry/i });
    expect(retry).toBeInTheDocument();
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("should_skip_onchain_rows_when_grant_uid_is_unresolved", () => {
    // Edge case: hook returned milestones but no `grant` entry. We can't
    // build an attestation without a grantUID, so the orchestrator must
    // not render those rows.
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        project: { uid: PROJECT_UID, chainID: 10, owner: "0x", details: { title: "T" } },
        grant: undefined,
        grantMilestones: [makeOnChain({ uid: "0xon1", title: "Orphan on-chain" })],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const application = makeApplication({
      applicationData: {
        projectMilestones: [{ title: "Off-chain", description: "", dueDate: "2025-08-01" }],
      },
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    expect(screen.getAllByTestId("off-chain-row")).toHaveLength(1);
    expect(screen.queryByTestId("on-chain-row")).not.toBeInTheDocument();
  });
});
