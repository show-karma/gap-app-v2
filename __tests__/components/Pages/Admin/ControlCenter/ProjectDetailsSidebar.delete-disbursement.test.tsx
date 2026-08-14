import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type CommunityPayoutInvoiceInfo,
  MilestoneLifecycleStatus,
} from "@/src/features/payout-disbursement/types/payout-disbursement";

// Regression for GAP-FRONTEND-25M: deleting a disbursement from Control Center
// must target the clicked row's own milestoneUID. Previously the chain threw the
// UID away and re-derived identity from the free-text label, so two milestones
// sharing a label sent the FIRST row's UID and the backend 404'd.

// ─── Capture the delete mutation ─────────────────────────────────────────────

const { deleteMutate } = vi.hoisted(() => ({ deleteMutate: vi.fn() }));

vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  useDeleteDisbursementByMilestone: () => ({ mutate: deleteMutate, isPending: false }),
  useToggleAgreement: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useSaveMilestoneInvoices: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUpdateMilestonePaymentStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

// ─── Boundaries the sidebar / milestones table touch ─────────────────────────

vi.mock("@/src/core/rbac/context/permission-context", () => ({ useCan: () => true }));
vi.mock("@/hooks/useCopyToClipboard", () => ({ useCopyToClipboard: () => [null, vi.fn()] }));
vi.mock("next/navigation", () => ({ useParams: () => ({ communityId: "test-community" }) }));

vi.mock("@/components/Pages/Admin/ControlCenter/DetailsSection", () => ({
  DetailsSection: () => <div data-testid="details-section" />,
}));
vi.mock("@/src/features/payout-disbursement/components/PayoutConfigurationContent", () => ({
  PayoutConfigurationContent: () => <div data-testid="config" />,
}));
vi.mock("@/src/features/payout-disbursement/components/PayoutHistoryContent", () => ({
  PayoutHistoryContent: () => <div data-testid="history" />,
}));
vi.mock("@/src/features/payout-disbursement/components/RecordPaymentDialog", () => ({
  RecordPaymentDialog: () => null,
}));
vi.mock("@/components/EthereumAddressToProfileName", () => ({ default: () => null }));
vi.mock("@/components/Utilities/FileUpload", () => ({ FileUpload: () => null }));
vi.mock("@/components/Milestone/MilestoneAIEvaluationBadge", () => ({
  MilestoneAIEvaluationBadge: () => null,
}));
vi.mock("@/src/features/payout-disbursement/services/payout-disbursement.service", () => ({
  getInvoiceDownloadUrl: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// ─── Radix primitives for jsdom ──────────────────────────────────────────────

vi.mock("@radix-ui/react-dropdown-menu", () => {
  const React = require("react");
  return {
    Root: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      const [isOpen, setIsOpen] = React.useState(open ?? false);
      const handleOpenChange = (v: boolean) => {
        setIsOpen(v);
        onOpenChange?.(v);
      };
      return (
        <div data-testid="dropdown-root" data-open={isOpen}>
          {React.Children.map(children, (child: React.ReactElement) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child, {
              _isOpen: isOpen,
              _setOpen: handleOpenChange,
            } as Record<string, unknown>);
          })}
        </div>
      );
    },
    Trigger: ({
      children,
      asChild,
      _setOpen,
      ...props
    }: {
      children: React.ReactNode;
      asChild?: boolean;
      _setOpen?: (open: boolean) => void;
    }) => (
      <button {...props} data-testid="dropdown-trigger" onClick={() => _setOpen?.(true)}>
        {children}
      </button>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({
      children,
      _isOpen,
      ...props
    }: {
      children: React.ReactNode;
      _isOpen?: boolean;
      className?: string;
      side?: string;
      align?: string;
    }) =>
      _isOpen ? (
        <div data-testid="dropdown-content" role="menu" {...props}>
          {children}
        </div>
      ) : null,
    Item: ({
      children,
      onSelect,
      disabled,
      ...props
    }: {
      children: React.ReactNode;
      onSelect?: () => void;
      disabled?: boolean;
      className?: string;
    }) => (
      <button
        role="menuitem"
        onClick={() => {
          if (!disabled) onSelect?.();
        }}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    ),
    Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Sub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Label: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <div {...props}>{children}</div>
    ),
    Separator: (props: { className?: string }) => <hr {...props} />,
    ShortcutKeys: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

vi.mock("@radix-ui/react-dialog", () => {
  const React = require("react");
  return {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div data-testid="dialog-root">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: ({ children, ...props }: { children?: React.ReactNode; className?: string }) => (
      <div {...props}>{children}</div>
    ),
    Content: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <div role="dialog" {...props}>
        {children}
      </div>
    ),
    Title: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <h2 {...props}>{children}</h2>
    ),
    Description: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <p {...props}>{children}</p>
    ),
    Close: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <button {...props}>{children}</button>
    ),
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <span {...props}>{children}</span>
  ),
  Content: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div {...props}>{children}</div>,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import type { ProjectDetailsSidebarGrant } from "@/components/Pages/Admin/ControlCenter/ProjectDetailsSidebar";
import { ProjectDetailsSidebar } from "@/components/Pages/Admin/ControlCenter/ProjectDetailsSidebar";

const grant: ProjectDetailsSidebarGrant = {
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

// Two milestones sharing the SAME label but with DIFFERENT UIDs. The second row
// is the one the user clicks; a label-based lookup would collapse to the first.
function makeInvoice(milestoneUID: string): CommunityPayoutInvoiceInfo {
  return {
    milestoneLabel: "Milestone 1",
    milestoneUID,
    milestoneStatus: MilestoneLifecycleStatus.PENDING,
    milestoneDueDate: null,
    milestoneStatusUpdatedAt: null,
    invoiceStatus: "pending",
    invoiceReceivedAt: null,
    invoiceReceivedBy: null,
    invoiceFileKey: null,
    allocatedAmount: null,
    paymentStatus: "disbursed",
    paymentStatusDate: null,
    completionReason: null,
  } as unknown as CommunityPayoutInvoiceInfo;
}

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDetailsSidebar
        grant={grant}
        open={true}
        onOpenChange={vi.fn()}
        communityUID="community-1"
        invoiceRequired={false}
        kycStatus={null}
        disbursementInfo={null}
        agreement={null}
        milestoneInvoices={[makeInvoice("uid-first"), makeInvoice("uid-second")]}
      />
    </QueryClientProvider>
  );
}

describe("ProjectDetailsSidebar — delete disbursement identity (GAP-FRONTEND-25M)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes using the clicked row's own milestoneUID, not the shared label", async () => {
    const user = userEvent.setup();
    renderSidebar();

    // Both rows share the label, so there are two payment-status dropdowns.
    const triggers = screen.getAllByTestId("dropdown-trigger");
    expect(triggers).toHaveLength(2);

    // Open the SECOND row's dropdown and mark it unpaid.
    await user.click(triggers[1]);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    await user.click(screen.getByRole("menuitem", { name: /Unpaid/i }));

    // Confirm the deletion.
    await waitFor(() => expect(screen.getByText(/Mark as unpaid/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Delete disbursement/i }));

    // The mutation must carry the SECOND row's UID. Before the fix it re-derived
    // identity from the label and sent "uid-first".
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate).toHaveBeenCalledWith({
      grantUID: "grant-1",
      milestoneUID: "uid-second",
    });
  });
});
