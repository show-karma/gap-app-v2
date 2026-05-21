/**
 * Tests for MilestonesTab.
 *
 * The tab is a thin consumer: the indexer publishes a pre-merged,
 * pre-deduped, pre-sorted `application.milestoneStatuses[]` and the tab
 * just iterates, routing each entry to OffChainMilestoneRow (source:
 * "application") or OnChainMilestoneRow (source: "project"). The
 * client-side merge / dedup / sort / loading / error branches that
 * used to live here are gone — those concerns are owned by the indexer
 * now, and the older tests that exercised them have been removed.
 *
 * Row components are mocked to lightweight stand-ins so the test
 * doesn't need Privy / wagmi / SDK / Next router context.
 */

import { render, screen } from "@testing-library/react";
import type { Application, MilestoneStatusEntry } from "@/types/whitelabel-entities";

const mockUseApplicationInvoiceConfig = vi.fn();

vi.mock("@/src/features/applications/hooks/use-application-invoice-config", () => ({
  useApplicationInvoiceConfig: (...args: unknown[]) => mockUseApplicationInvoiceConfig(...args),
}));

vi.mock("@/src/features/applications/components/OffChainMilestoneRow", () => ({
  OffChainMilestoneRow: ({
    entry,
    existingInvoice,
  }: {
    entry: MilestoneStatusEntry;
    existingInvoice?: { invoiceFileKey: string | null };
  }) => (
    <div
      data-testid="off-chain-row"
      data-uid={entry.milestoneUID ?? ""}
      data-field-label={entry.fieldLabel ?? ""}
      data-existing-invoice-key={existingInvoice?.invoiceFileKey ?? ""}
    >
      {entry.title}
    </div>
  ),
}));

vi.mock("@/src/features/applications/components/OnChainMilestoneRow", () => ({
  OnChainMilestoneRow: ({
    entry,
    projectUid,
  }: {
    entry: MilestoneStatusEntry;
    projectUid: string;
  }) => (
    <div
      data-testid="on-chain-row"
      data-uid={entry.milestoneUID ?? ""}
      data-project-uid={projectUid}
    >
      {entry.title}
    </div>
  ),
}));

import { MilestonesTab } from "@/src/features/applications/components/MilestonesTab";

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

function makeEntry(overrides: Partial<MilestoneStatusEntry> = {}): MilestoneStatusEntry {
  return {
    source: "application",
    milestoneUID: "0xms-default",
    currentStatus: "pending",
    grantUID: GRANT_UID,
    chainID: 10,
    title: "Default milestone",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseApplicationInvoiceConfig.mockReturnValue({ data: null, isLoading: false });
});

describe("MilestonesTab", () => {
  it("should_render_setting_up_state_when_application_approved_but_milestoneStatuses_empty", () => {
    // Lifecycle window: status flips to "approved" → project created →
    // grant attested → milestones attested. "No milestones defined" is
    // wrong copy for that transient window — it implies permanent
    // absence.
    render(
      <MilestonesTab
        application={makeApplication({ status: "approved", milestoneStatuses: [] })}
        isOwner={false}
      />
    );

    expect(screen.getByText(/Setting up milestones/i)).toBeInTheDocument();
    expect(screen.queryByText(/No milestones defined/i)).not.toBeInTheDocument();
  });

  it("should_render_no_milestones_defined_when_unapproved_and_milestoneStatuses_empty", () => {
    // Pre-approval there's no grant on-chain yet; the empty state copy
    // should reflect "no milestones to show", not the post-approval
    // transient hint.
    render(
      <MilestonesTab
        application={makeApplication({ status: "pending", milestoneStatuses: [] })}
        isOwner={false}
      />
    );

    expect(screen.getByText(/No milestones defined for this application/i)).toBeInTheDocument();
    expect(screen.queryByText(/Setting up milestones/i)).not.toBeInTheDocument();
  });

  it("should_render_empty_state_when_milestoneStatuses_is_undefined", () => {
    const application = makeApplication({
      status: "pending",
      milestoneStatuses: undefined,
    });
    render(<MilestonesTab application={application} isOwner={false} />);

    expect(screen.getByText(/No milestones defined for this application/i)).toBeInTheDocument();
  });

  it("should_route_application_source_entries_to_OffChainMilestoneRow", () => {
    const application = makeApplication({
      milestoneStatuses: [
        makeEntry({
          source: "application",
          milestoneUID: "0xapp-1",
          title: "Beta launch",
          fieldLabel: "projectMilestones",
        }),
      ],
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const offChainRows = screen.getAllByTestId("off-chain-row");
    expect(offChainRows).toHaveLength(1);
    expect(offChainRows[0]).toHaveTextContent("Beta launch");
    expect(offChainRows[0]).toHaveAttribute("data-uid", "0xapp-1");
    expect(offChainRows[0]).toHaveAttribute("data-field-label", "projectMilestones");
    expect(screen.queryByTestId("on-chain-row")).not.toBeInTheDocument();
  });

  it("should_route_project_source_entries_to_OnChainMilestoneRow_with_projectUid", () => {
    const application = makeApplication({
      milestoneStatuses: [
        makeEntry({
          source: "project",
          milestoneUID: "0xproj-1",
          title: "Inherited milestone",
        }),
      ],
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const onChainRows = screen.getAllByTestId("on-chain-row");
    expect(onChainRows).toHaveLength(1);
    expect(onChainRows[0]).toHaveTextContent("Inherited milestone");
    expect(onChainRows[0]).toHaveAttribute("data-uid", "0xproj-1");
    expect(onChainRows[0]).toHaveAttribute("data-project-uid", PROJECT_UID);
    expect(screen.queryByTestId("off-chain-row")).not.toBeInTheDocument();
  });

  it("should_render_both_row_types_preserving_indexer_sort_order", () => {
    // The indexer sorts (done sinks, then due date asc); the tab must NOT
    // re-sort. Assert the array order is the render order so a stray
    // client-side sort introduced later trips this test.
    const application = makeApplication({
      milestoneStatuses: [
        makeEntry({ source: "application", milestoneUID: "0x1", title: "First (app)" }),
        makeEntry({ source: "project", milestoneUID: "0x2", title: "Second (project)" }),
        makeEntry({ source: "application", milestoneUID: "0x3", title: "Third (app)" }),
      ],
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const allRows = screen.getAllByTestId(/-row$/);
    expect(allRows.map((el) => el.textContent)).toEqual([
      "First (app)",
      "Second (project)",
      "Third (app)",
    ]);
  });

  it("should_skip_project_source_rows_when_application_has_no_projectUID", () => {
    // Defensive: the indexer only emits project-source rows when
    // application.projectUID is set, but if a stale payload arrives the
    // tab refuses to render an OnChainMilestoneRow that has no project
    // page to link back to.
    const application = makeApplication({
      projectUID: undefined,
      milestoneStatuses: [
        makeEntry({ source: "application", milestoneUID: "0xa", title: "App-only row" }),
        makeEntry({ source: "project", milestoneUID: "0xp", title: "Should be skipped" }),
      ],
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    expect(screen.getAllByTestId("off-chain-row")).toHaveLength(1);
    expect(screen.queryByTestId("on-chain-row")).not.toBeInTheDocument();
  });

  it("should_match_existing_invoice_to_application_row_by_title", () => {
    mockUseApplicationInvoiceConfig.mockReturnValue({
      data: {
        invoiceRequired: true,
        grantUID: GRANT_UID,
        milestoneInvoices: [
          { milestoneLabel: "Beta launch", invoiceFileKey: "s3://invoices/beta.pdf" },
        ],
      },
      isLoading: false,
    });

    const application = makeApplication({
      milestoneStatuses: [
        makeEntry({ source: "application", milestoneUID: "0xa", title: "Beta launch" }),
        makeEntry({ source: "application", milestoneUID: "0xb", title: "No invoice here" }),
      ],
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const rows = screen.getAllByTestId("off-chain-row");
    expect(rows[0]).toHaveAttribute("data-existing-invoice-key", "s3://invoices/beta.pdf");
    expect(rows[1]).toHaveAttribute("data-existing-invoice-key", "");
  });

  it("should_use_fieldLabel_and_title_as_key_fallback_when_milestoneUID_is_absent", () => {
    // Slots in applicationData that haven't been anchored on-chain yet
    // have no milestoneUID — the indexer still emits them as
    // application-source entries. They must render without crashing on
    // a missing key.
    const application = makeApplication({
      milestoneStatuses: [
        makeEntry({
          source: "application",
          milestoneUID: undefined,
          fieldLabel: "projectMilestones",
          title: "Not anchored yet",
        }),
      ],
    });

    render(<MilestonesTab application={application} isOwner={true} />);

    const row = screen.getByTestId("off-chain-row");
    expect(row).toHaveTextContent("Not anchored yet");
    expect(row).toHaveAttribute("data-uid", "");
  });
});
