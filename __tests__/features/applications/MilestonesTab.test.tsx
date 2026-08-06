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
const mockUsePermissionsQuery = vi.fn();

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: (...args: unknown[]) => mockUsePermissionsQuery(...args),
}));

vi.mock("@/src/features/applications/hooks/use-application-invoice-config", () => ({
  useApplicationInvoiceConfig: (...args: unknown[]) => mockUseApplicationInvoiceConfig(...args),
}));

vi.mock("@/src/features/applications/components/OffChainMilestoneRow", () => ({
  OffChainMilestoneRow: ({
    entry,
    existingInvoice,
    isEditable,
  }: {
    entry: MilestoneStatusEntry;
    existingInvoice?: { invoiceFileKey: string | null };
    isEditable: boolean;
  }) => (
    <div
      data-testid="off-chain-row"
      data-uid={entry.milestoneUID ?? ""}
      data-field-label={entry.fieldLabel ?? ""}
      data-editable={String(isEditable)}
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
    isEditable,
  }: {
    entry: MilestoneStatusEntry;
    projectUid: string;
    isEditable: boolean;
  }) => (
    <div
      data-testid="on-chain-row"
      data-uid={entry.milestoneUID ?? ""}
      data-project-uid={projectUid}
      data-editable={String(isEditable)}
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
  mockUsePermissionsQuery.mockReturnValue({
    data: { isProjectOwner: true, isProjectAdmin: false, isProjectMember: true },
    isLoading: false,
  });
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

/**
 * Project-authority gating.
 *
 * Being the APPLICANT is an off-chain funding-platform role. Submitting a
 * milestone completion writes an on-chain attestation that the indexer
 * authorizes against PROJECT authority (owner / MemberOf / resolver admin,
 * fanned over linked wallets). When an application is linked to a project the
 * applicant has no authority on, EAS accepts the attestation, the grantee pays
 * gas, and the indexer discards it — silently. The tab must therefore require
 * BOTH signals before offering the action.
 */
describe("MilestonesTab project-authority gating", () => {
  const entries = [
    makeEntry({ source: "application", milestoneUID: "0xapp-1", title: "App milestone" }),
    makeEntry({ source: "project", milestoneUID: "0xproj-1", title: "Project milestone" }),
  ];

  function renderWithAuthority(
    permissions: Record<string, boolean> | null,
    { isOwner = true, isLoading = false } = {}
  ) {
    mockUsePermissionsQuery.mockReturnValue({ data: permissions, isLoading });
    return render(
      <MilestonesTab
        application={makeApplication({ milestoneStatuses: entries })}
        isOwner={isOwner}
      />
    );
  }

  function editableFlags() {
    return [...screen.getAllByTestId(/^(off|on)-chain-row$/)].map((el) =>
      el.getAttribute("data-editable")
    );
  }

  it("should_make_rows_editable_when_applicant_is_the_project_owner", () => {
    renderWithAuthority({
      isProjectOwner: true,
      isProjectAdmin: false,
      isProjectMember: false,
    });

    expect(editableFlags()).toEqual(["true", "true"]);
  });

  it("should_make_rows_editable_when_applicant_is_only_a_project_member", () => {
    // MemberOf alone is an accepted arm in the indexer's validator, so the UI
    // must not demand owner/admin — that would hide the action from grantees
    // the indexer would happily admit.
    renderWithAuthority({
      isProjectOwner: false,
      isProjectAdmin: false,
      isProjectMember: true,
    });

    expect(editableFlags()).toEqual(["true", "true"]);
  });

  it("should_make_rows_editable_when_applicant_is_an_on_chain_project_admin", () => {
    renderWithAuthority({
      isProjectOwner: false,
      isProjectAdmin: true,
      isProjectMember: false,
    });

    expect(editableFlags()).toEqual(["true", "true"]);
  });

  it("should_lock_rows_when_applicant_has_no_project_authority", () => {
    renderWithAuthority({
      isProjectOwner: false,
      isProjectAdmin: false,
      isProjectMember: false,
    });

    expect(editableFlags()).toEqual(["false", "false"]);
  });

  it("should_explain_why_submission_is_blocked_when_applicant_has_no_project_authority", () => {
    renderWithAuthority({
      isProjectOwner: false,
      isProjectAdmin: false,
      isProjectMember: false,
    });

    expect(screen.getByRole("status")).toHaveTextContent(/not authorized on the linked/i);
  });

  it("should_fail_closed_while_project_authority_is_still_resolving", () => {
    // No-glimpse rule: a tri-state auth signal must never render the
    // privileged affordance during the pending window.
    renderWithAuthority(null, { isLoading: true });

    expect(editableFlags()).toEqual(["false", "false"]);
  });

  it("should_not_show_the_blocked_notice_while_authority_is_still_resolving", () => {
    renderWithAuthority(null, { isLoading: true });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_fail_closed_when_the_permissions_query_errors_out", () => {
    renderWithAuthority(null);

    expect(editableFlags()).toEqual(["false", "false"]);
  });

  it("should_not_show_the_blocked_notice_to_non_applicants", () => {
    // A reviewer/admin viewing the application never had the affordance;
    // telling them they're "not authorized" would be noise.
    renderWithAuthority(
      { isProjectOwner: false, isProjectAdmin: false, isProjectMember: false },
      { isOwner: false }
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_scope_the_permissions_query_to_the_linked_project_and_skip_it_for_non_applicants", () => {
    renderWithAuthority(
      { isProjectOwner: false, isProjectAdmin: false, isProjectMember: false },
      { isOwner: false }
    );

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith(
      { projectId: PROJECT_UID },
      { enabled: false }
    );
  });
});
