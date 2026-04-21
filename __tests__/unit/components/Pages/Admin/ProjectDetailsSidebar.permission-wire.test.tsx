import { render } from "@testing-library/react";
import { Permission } from "@/src/core/rbac/types";

// ─── Capture props that ProjectDetailsSidebar passes to MilestonesSection ────

const { capturedMilestonesProps } = vi.hoisted(() => ({
  capturedMilestonesProps: vi.fn<(props: Record<string, unknown>) => void>(),
}));

vi.mock("@/components/Pages/Admin/ControlCenter/MilestonesSection", () => ({
  MilestonesSection: (props: Record<string, unknown>) => {
    capturedMilestonesProps(props);
    return <div data-testid="milestones-section" />;
  },
}));

// ─── Mock useCan so we can assert both the argument AND control the return ────

const { useCanMock } = vi.hoisted(() => ({
  useCanMock: vi.fn<(permission: string) => boolean>(),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  useCan: useCanMock,
}));

// ─── Stub out everything else the sidebar touches ────────────────────────────

vi.mock("@/components/Pages/Admin/ControlCenter/DetailsSection", () => ({
  DetailsSection: () => <div data-testid="details-section" />,
}));

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, vi.fn()],
}));

vi.mock("@/src/features/payout-disbursement", () => ({
  PayoutDisbursementStatus: { AWAITING_SIGNATURES: "awaiting_signatures" },
  MilestoneLifecycleStatus: { PENDING: "pending", COMPLETED: "completed" },
  PayoutConfigurationContent: () => <div data-testid="config" />,
  PayoutHistoryContent: () => <div data-testid="history" />,
  RecordPaymentDialog: () => null,
  fromSmallestUnit: (v: string) => v,
  useToggleAgreement: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useSaveMilestoneInvoices: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeleteDisbursementByMilestone: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/utilities/network", () => ({
  getChainNameById: () => "Optimism",
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: { PROJECT: { GRANT: () => "/grant-url" } },
}));

import type { ProjectDetailsSidebarGrant } from "@/components/Pages/Admin/ControlCenter/ProjectDetailsSidebar";
// ─── Imports (after mocks) ────────────────────────────────────────────────────
import { ProjectDetailsSidebar } from "@/components/Pages/Admin/ControlCenter/ProjectDetailsSidebar";

const mockGrant: ProjectDetailsSidebarGrant = {
  grantUid: "grant-1",
  projectUid: "project-1",
  projectName: "Test Project",
  projectSlug: "test-project",
  grantName: "Test Grant",
  grantProgramId: "program-1",
  grantChainId: 10,
  projectChainId: 10,
  currency: "USDC",
} as unknown as ProjectDetailsSidebarGrant;

function renderSidebar() {
  return render(
    <ProjectDetailsSidebar
      grant={mockGrant}
      open={true}
      onOpenChange={vi.fn()}
      communityUID="community-1"
      invoiceRequired={true}
      kycStatus={null}
      disbursementInfo={null}
      agreement={null}
      milestoneInvoices={[]}
    />
  );
}

describe("ProjectDetailsSidebar — invoice permission wire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_query_useCan_with_Permission_PROGRAM_EDIT", () => {
    useCanMock.mockReturnValue(true);

    renderSidebar();

    expect(useCanMock).toHaveBeenCalledWith(Permission.PROGRAM_EDIT);
  });

  it("should_pass_canEditInvoices_true_to_MilestonesSection_when_useCan_returns_true", () => {
    useCanMock.mockReturnValue(true);

    renderSidebar();

    expect(capturedMilestonesProps).toHaveBeenCalled();
    const props = capturedMilestonesProps.mock.calls.at(-1)?.[0] as {
      canEditInvoices?: boolean;
    };
    expect(props.canEditInvoices).toBe(true);
  });

  it("should_pass_canEditInvoices_false_to_MilestonesSection_when_useCan_returns_false", () => {
    useCanMock.mockReturnValue(false);

    renderSidebar();

    const props = capturedMilestonesProps.mock.calls.at(-1)?.[0] as {
      canEditInvoices?: boolean;
    };
    expect(props.canEditInvoices).toBe(false);
  });

  it("should_use_Permission_PROGRAM_EDIT_exactly_not_a_related_permission", () => {
    // Guards against someone refactoring the hook call to PROGRAM_VIEW,
    // MILESTONE_EDIT, or another type-compatible but wrong permission.
    useCanMock.mockReturnValue(true);

    renderSidebar();

    const calls = useCanMock.mock.calls;
    const calledPermissions = calls.map((call) => call[0]);
    expect(calledPermissions).toContain(Permission.PROGRAM_EDIT);
    expect(calledPermissions).not.toContain(Permission.PROGRAM_VIEW);
    expect(calledPermissions).not.toContain(Permission.MILESTONE_EDIT);
  });
});
