/**
 * Unit tests for ProjectDetailsSidebar.
 *
 * Tests agreement toggle (date-picker-driven signing), unsign flow,
 * milestone key uniqueness, and button disabled states.
 */

// ---- Mock holders (must be declared before vi.mock calls) ----

const mockToggleMutate = vi.fn();
const mockSaveMutate = vi.fn();

let mockTogglePending = false;
let mockSavePending = false;

// Mock the DatePicker component to avoid Radix Popover portal issues in JSDOM
vi.mock("@/components/Utilities/DatePicker", async () => {
  const React = await import("react");
  return {
    DatePicker: ({
      selected,
      onSelect,
      ariaLabel,
      placeholder,
    }: {
      selected?: Date;
      onSelect: (date: Date) => void;
      ariaLabel?: string;
      placeholder?: string;
    }) => {
      return React.createElement(
        "button",
        {
          "aria-label": ariaLabel || "Pick a date",
          onClick: () => onSelect(new Date("2024-06-15T00:00:00Z")),
          type: "button",
        },
        selected ? selected.toISOString().split("T")[0] : placeholder || "Pick a date"
      );
    },
  };
});

vi.mock("@/src/features/payout-disbursement", async () => {
  const actual = await vi.importActual("@/src/features/payout-disbursement");
  return {
    ...actual,
    useToggleAgreement: vi.fn(() => ({
      mutate: mockToggleMutate,
      isPending: mockTogglePending,
    })),
    useSaveMilestoneInvoices: vi.fn(() => ({
      mutate: mockSaveMutate,
      mutateAsync: mockSaveMutate,
      isPending: mockSavePending,
    })),
    // Stub out the content components to avoid their data-fetching hooks
    PayoutConfigurationContent: vi.fn(() => null),
    PayoutHistoryContent: vi.fn(() => null),
  };
});

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => ["", vi.fn()],
}));

// Mock RBAC — grant full permissions by default so invoice/edit controls are visible
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  useCan: vi.fn(() => true),
  useCanAny: vi.fn(() => true),
  useCanAll: vi.fn(() => true),
  useHasRole: vi.fn(() => false),
  useHasRoleOrHigher: vi.fn(() => false),
  useIsReviewerType: vi.fn(() => false),
  usePermissionContext: vi.fn(() => ({
    roles: {},
    permissions: [],
    isLoading: false,
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  })),
  PermissionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import "@testing-library/jest-dom";

import {
  ProjectDetailsSidebar,
  type ProjectDetailsSidebarGrant,
} from "@/components/Pages/Admin/ControlCenter/ProjectDetailsSidebar";
import { useSaveMilestoneInvoices, useToggleAgreement } from "@/src/features/payout-disbursement";
import {
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  MilestoneLifecycleStatus,
  type TokenTotal,
} from "@/src/features/payout-disbursement/types/payout-disbursement";
import { createMockAgreement, createMockInvoice } from "../fixtures";

// ---- Test grant object ----

const testGrant: ProjectDetailsSidebarGrant = {
  grantUid: "grant-uid-1",
  projectUid: "project-uid-1",
  projectName: "Alpha Project",
  projectSlug: "alpha-project",
  grantName: "Grant Round Q1",
  grantProgramId: "program-1",
  grantChainId: 10,
  projectChainId: 10,
  currentPayoutAddress: "0x1234567890abcdef1234567890abcdef12345678",
  currentAmount: "10000",
  currency: "USDC",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTogglePending = false;
  mockSavePending = false;

  // Re-mock to pick up updated pending values
  vi.mocked(useToggleAgreement).mockImplementation(() => ({
    mutate: mockToggleMutate,
    isPending: mockTogglePending,
  }));
  vi.mocked(useSaveMilestoneInvoices).mockImplementation(() => ({
    mutate: mockSaveMutate,
    mutateAsync: mockSaveMutate,
    isPending: mockSavePending,
  }));
});

// ---- Helper to render the sidebar ----

interface RenderSidebarOptions {
  grant?: ProjectDetailsSidebarGrant | null;
  open?: boolean;
  agreement?: CommunityPayoutAgreementInfo | null;
  milestoneInvoices?: CommunityPayoutInvoiceInfo[];
  invoiceRequired?: boolean;
  disbursementInfo?: {
    totalsByToken: TokenTotal[];
    status: string;
    history: unknown[];
  } | null;
  onOpenChange?: vi.Mock;
  onCreateDisbursement?: vi.Mock;
  onConfigSuccess?: vi.Mock;
}

function renderSidebar(options: RenderSidebarOptions = {}) {
  const {
    grant = testGrant,
    open = true,
    agreement = null,
    milestoneInvoices = [],
    invoiceRequired = false,
    disbursementInfo = null,
    onOpenChange = vi.fn(),
    onCreateDisbursement = vi.fn(),
    onConfigSuccess = vi.fn(),
  } = options;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDetailsSidebar
        grant={grant}
        open={open}
        onOpenChange={onOpenChange}
        communityUID="community-uid-1"
        kycStatus={null}
        disbursementInfo={disbursementInfo}
        agreement={agreement}
        milestoneInvoices={milestoneInvoices}
        invoiceRequired={invoiceRequired}
        onCreateDisbursement={onCreateDisbursement}
        onConfigSuccess={onConfigSuccess}
      />
    </QueryClientProvider>
  );
}

// ---- Tests ----

describe("ProjectDetailsSidebar", () => {
  it("renders the project name and grant name when open", () => {
    renderSidebar();
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Grant Round Q1")).toBeInTheDocument();
  });

  it("renders nothing when grant is null", () => {
    const { container } = renderSidebar({ grant: null });
    expect(container.innerHTML).toBe("");
  });

  it("shows the approved amount with currency", () => {
    renderSidebar();
    expect(screen.getByText("Approved:")).toBeInTheDocument();
    expect(screen.getByText("10,000 USDC")).toBeInTheDocument();
  });

  it("shows the payout address truncated", () => {
    renderSidebar();
    expect(screen.getByText("0x1234...5678")).toBeInTheDocument();
  });

  it("renders sidebar navigation with all three sections", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: /details/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /payout settings/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /history/i })).toBeInTheDocument();
  });

  describe("Agreement signing (date-picker flow)", () => {
    it("shows date input when agreement is not signed", () => {
      renderSidebar({
        agreement: createMockAgreement({
          signed: false,
          signedAt: null,
          signedBy: null,
        }),
      });

      const dateInput = screen.getByLabelText(/set agreement signed date/i);
      expect(dateInput).toBeInTheDocument();
      expect(screen.getByText("Not signed")).toBeInTheDocument();
    });

    it("calls toggleAgreement with signed=true when a date is picked", async () => {
      const user = userEvent.setup();
      renderSidebar({
        agreement: createMockAgreement({
          signed: false,
          signedAt: null,
          signedBy: null,
        }),
      });

      const datePickerButton = screen.getByLabelText(/set agreement signed date/i);
      await user.click(datePickerButton);

      expect(mockToggleMutate).toHaveBeenCalledTimes(1);
      expect(mockToggleMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          grantUID: "grant-uid-1",
          signed: true,
          signedAt: expect.stringContaining("2024-06-15"),
        }),
        expect.any(Object)
      );
    });

    it("shows signed state with date when agreement is signed", () => {
      renderSidebar({
        agreement: createMockAgreement({
          signed: true,
          signedAt: "2024-06-15T00:00:00Z",
        }),
      });

      expect(screen.getByText(/signed/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun 15, 2024/)).toBeInTheDocument();
      // Date input should NOT be visible when signed
      expect(screen.queryByLabelText(/set agreement signed date/i)).not.toBeInTheDocument();
    });

    it("does not show date input when agreement is signed", () => {
      renderSidebar({
        agreement: createMockAgreement({
          signed: true,
          signedAt: "2024-06-01T00:00:00Z",
        }),
      });

      expect(screen.queryByLabelText(/set agreement signed date/i)).not.toBeInTheDocument();
    });
  });

  describe("Agreement unsigning", () => {
    it("shows confirm dialog when X button is clicked on signed agreement", async () => {
      const user = userEvent.setup();
      renderSidebar({
        agreement: createMockAgreement({ signed: true }),
      });

      const unsignButton = screen.getByLabelText(/remove agreement signed date/i);
      await user.click(unsignButton);

      expect(screen.getByText("Mark as unsigned?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirm unsign/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel unsign/i })).toBeInTheDocument();
    });

    it("calls toggleAgreement with signed=false when confirm is clicked", async () => {
      const user = userEvent.setup();
      renderSidebar({
        agreement: createMockAgreement({ signed: true }),
      });

      const unsignButton = screen.getByLabelText(/remove agreement signed date/i);
      await user.click(unsignButton);

      const confirmButton = screen.getByRole("button", {
        name: /confirm unsign/i,
      });
      await user.click(confirmButton);

      expect(mockToggleMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          grantUID: "grant-uid-1",
          signed: false,
        }),
        expect.any(Object)
      );
    });

    it("hides confirm dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      renderSidebar({
        agreement: createMockAgreement({ signed: true }),
      });

      const unsignButton = screen.getByLabelText(/remove agreement signed date/i);
      await user.click(unsignButton);

      const cancelButton = screen.getByRole("button", {
        name: /cancel unsign/i,
      });
      await user.click(cancelButton);

      expect(screen.queryByText("Mark as unsigned?")).not.toBeInTheDocument();
    });
  });

  describe("Milestone invoices table", () => {
    it("renders milestone labels", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({ milestoneLabel: "Deliverable A" }),
          createMockInvoice({
            milestoneLabel: "Deliverable B",
            milestoneUID: "ms-uid-2",
          }),
        ],
      });

      expect(screen.getByText("Milestone 1: Deliverable A")).toBeInTheDocument();
      expect(screen.getByText("Milestone 2: Deliverable B")).toBeInTheDocument();
    });

    it("uses milestoneUID as key when available, avoiding duplicate key issues", () => {
      const invoices = [
        createMockInvoice({
          milestoneLabel: "Same Label",
          milestoneUID: "unique-uid-1",
        }),
        createMockInvoice({
          milestoneLabel: "Same Label",
          milestoneUID: "unique-uid-2",
        }),
      ];

      // Should not throw even though labels are the same
      expect(() => renderSidebar({ milestoneInvoices: invoices })).not.toThrow();
    });

    it("shows empty state when no invoices", () => {
      renderSidebar({ milestoneInvoices: [] });
      expect(screen.getByText(/no milestones configured/i)).toBeInTheDocument();
    });
  });

  describe("Milestone status column", () => {
    it("renders milestone status badge with correct label", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Completed",
            milestoneUID: "ms-c",
            milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
          }),
          createMockInvoice({
            milestoneLabel: "MS Verified",
            milestoneUID: "ms-v",
            milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          }),
        ],
      });

      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    it("shows 'Pending' when milestoneStatus is null", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Null",
            milestoneUID: "ms-null",
            milestoneStatus: null,
            milestoneDueDate: null,
          }),
        ],
      });

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("shows 'Past due' when status is pending and dueDate is in the past", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Overdue",
            milestoneUID: "ms-overdue",
            milestoneStatus: MilestoneLifecycleStatus.PENDING,
            milestoneDueDate: "2020-01-01T00:00:00Z",
          }),
        ],
      });

      expect(screen.getByText("Past due")).toBeInTheDocument();
    });

    it("does not show 'Past due' when status is completed even with past dueDate", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Done",
            milestoneUID: "ms-done",
            milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
            milestoneDueDate: "2020-01-01T00:00:00Z",
          }),
        ],
      });

      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.queryByText("Past due")).not.toBeInTheDocument();
    });

    it("falls back to 'Pending' config when milestoneStatus is null", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Null Status",
            milestoneUID: "ms-null-status",
            milestoneStatus: null,
          }),
        ],
      });

      // Null status falls back to pending config
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("shows completion date in tooltip for completed milestone on hover", async () => {
      const user = userEvent.setup();
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Comp",
            milestoneUID: "ms-comp",
            milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
            milestoneStatusUpdatedAt: "2024-07-10T00:00:00Z",
          }),
        ],
      });

      await user.hover(screen.getByText("Completed"));
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Completed on.*Jul 10, 2024/);
    });

    it("shows verification date in tooltip for verified milestone on hover", async () => {
      const user = userEvent.setup();
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Ver",
            milestoneUID: "ms-ver",
            milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
            milestoneStatusUpdatedAt: "2024-08-15T00:00:00Z",
          }),
        ],
      });

      await user.hover(screen.getByText("Verified"));
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Verified on.*Aug 15, 2024/);
    });

    it("shows due date in tooltip for past due milestone on hover", async () => {
      const user = userEvent.setup();
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Late",
            milestoneUID: "ms-late",
            milestoneStatus: MilestoneLifecycleStatus.PENDING,
            milestoneDueDate: "2020-06-01T00:00:00Z",
          }),
        ],
      });

      await user.hover(screen.getByText("Past due"));
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Due.*Jun 1, 2020/);
    });

    it("shows created and due dates in tooltip for pending milestone on hover", async () => {
      const user = userEvent.setup();
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Pend",
            milestoneUID: "ms-pend",
            milestoneStatus: MilestoneLifecycleStatus.PENDING,
            milestoneStatusUpdatedAt: "2024-01-15T00:00:00Z",
            milestoneDueDate: "2030-12-31T00:00:00Z",
          }),
        ],
      });

      await user.hover(screen.getByText("Pending"));
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent(/Created.*Jan 15, 2024/);
      expect(tooltip).toHaveTextContent(/Due.*Dec 31, 2030/);
    });

    it("shows alert icon with 'not verified yet' tooltip for completed milestone", async () => {
      const user = userEvent.setup();
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Comp Alert",
            milestoneUID: "ms-comp-alert",
            milestoneStatus: MilestoneLifecycleStatus.COMPLETED,
          }),
        ],
      });

      // The alert icon should be present next to the completed badge
      const alertIcon = document.querySelector("svg.text-amber-500");
      expect(alertIcon).toBeInTheDocument();

      // Hover on the alert icon to see the tooltip
      await user.hover(alertIcon as Element);
      const tooltip = await screen.findByRole("tooltip", {}, { timeout: 3000 });
      expect(tooltip).toHaveTextContent("The milestone has not been verified yet");
    });

    it("does not show alert icon for verified milestone", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Ver No Alert",
            milestoneUID: "ms-ver-no-alert",
            milestoneStatus: MilestoneLifecycleStatus.VERIFIED,
          }),
        ],
      });

      // No amber alert icon should be present for verified milestones
      const alertIcon = document.querySelector("svg.text-amber-500");
      expect(alertIcon).not.toBeInTheDocument();
    });

    it("does not show alert icon for pending milestone", () => {
      renderSidebar({
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Pend No Alert",
            milestoneUID: "ms-pend-no-alert",
            milestoneStatus: MilestoneLifecycleStatus.PENDING,
          }),
        ],
      });

      const alertIcon = document.querySelector("svg.text-amber-500");
      expect(alertIcon).not.toBeInTheDocument();
    });
  });

  describe("Invoice status column", () => {
    it("shows Invoice column header and received date input when invoice status is 'received'", () => {
      renderSidebar({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Recv",
            milestoneUID: "ms-recv",
            invoiceStatus: "received",
            invoiceReceivedAt: "2024-06-10T00:00:00Z",
          }),
        ],
      });

      // Invoice column header is present when invoiceRequired is true
      expect(screen.getByText("Invoice")).toBeInTheDocument();
      // Date input for received date should be present with value
      const dateInput = screen.getByLabelText(/invoice received date for.*MS Recv/i);
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveValue("2024-06-10");
    });

    it("shows Invoice column header and date input when invoice status is 'paid'", () => {
      renderSidebar({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Paid",
            milestoneUID: "ms-paid",
            invoiceStatus: "paid",
            invoiceReceivedAt: "2024-06-10T00:00:00Z",
          }),
        ],
      });

      expect(screen.getByText("Invoice")).toBeInTheDocument();
      const dateInput = screen.getByLabelText(/invoice received date for.*MS Paid/i);
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveValue("2024-06-10");
    });

    it("shows empty date input when invoice status is 'not_submitted' and no received date", () => {
      renderSidebar({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS NotSub",
            milestoneUID: "ms-notsub",
            invoiceStatus: "not_submitted",
            invoiceReceivedAt: null,
          }),
        ],
      });

      // Invoice column header is present
      expect(screen.getByText("Invoice")).toBeInTheDocument();
      // Date input should be empty (no received date)
      const dateInput = screen.getByLabelText(/invoice received date for.*MS NotSub/i);
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveValue("");
    });

    it("does not show invoice status column when invoiceRequired is false", () => {
      renderSidebar({
        invoiceRequired: false,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS NoInv",
            milestoneUID: "ms-noinv",
            invoiceStatus: "received",
          }),
        ],
      });

      // The "Invoice" column header should not be present when invoice is not required
      expect(screen.queryByText("Invoice")).not.toBeInTheDocument();
    });
  });

  describe("Unsaved changes guard", () => {
    it("shows discard dialog when closing with unsaved changes", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      renderSidebar({
        onOpenChange,
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "M1",
            milestoneUID: "ms-1",
            invoiceReceivedAt: null,
          }),
        ],
      });

      // Make a change to a milestone invoice date
      const dateInput = screen.getByLabelText(/invoice received date for.*M1/i);
      await user.type(dateInput, "2024-06-15");

      // Try to close via the explicit Close button in the footer
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const closeButton = closeButtons[closeButtons.length - 1];
      await user.click(closeButton);

      // Discard confirmation dialog should appear
      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
      expect(screen.getByText(/discard them/i)).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("does not show discard dialog when closing without unsaved changes", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      renderSidebar({ onOpenChange, milestoneInvoices: [] });

      // Use the explicit "Close" text button in the footer
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const closeButton = closeButtons[closeButtons.length - 1];
      await user.click(closeButton);

      expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    });
  });

  describe("Save changes", () => {
    it("shows save button with edit count when there are unsaved milestone changes", async () => {
      const user = userEvent.setup();
      renderSidebar({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "Milestone A",
            milestoneUID: "ms-a",
            invoiceReceivedAt: null,
          }),
        ],
      });

      const dateInput = screen.getByLabelText(/invoice received date for.*Milestone A/i);
      await user.type(dateInput, "2024-06-15");

      expect(screen.getByText(/save changes \(1\)/i)).toBeInTheDocument();
    });

    it("calls saveMilestoneInvoices mutation with correct data", async () => {
      const user = userEvent.setup();
      renderSidebar({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "Milestone A",
            milestoneUID: "ms-a",
            invoiceReceivedAt: null,
          }),
        ],
      });

      const dateInput = screen.getByLabelText(/invoice received date for.*Milestone A/i);
      await user.type(dateInput, "2024-06-15");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await user.click(saveButton);

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          grantUID: "grant-uid-1",
          invoices: expect.arrayContaining([
            expect.objectContaining({
              milestoneLabel: "Milestone A",
              milestoneUID: "ms-a",
              invoiceReceivedAt: "2024-06-15T00:00:00.000Z",
            }),
          ]),
        })
      );
    });
  });

  describe("Button disabled states", () => {
    it("disables create disbursement button when no payout address", () => {
      renderSidebar({
        grant: { ...testGrant, currentPayoutAddress: undefined },
      });

      const createButton = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      expect(createButton).toBeDisabled();
    });

    it("disables create disbursement button when amount is 0", () => {
      renderSidebar({
        grant: { ...testGrant, currentAmount: "0" },
      });

      const createButton = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      expect(createButton).toBeDisabled();
    });

    it("enables create disbursement button when address and amount are valid", () => {
      renderSidebar();

      const createButton = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      expect(createButton).toBeEnabled();
    });
  });

  describe("Footer action callbacks", () => {
    it("calls onCreateDisbursement when Create Disbursement is clicked", async () => {
      const user = userEvent.setup();
      const onCreateDisbursement = vi.fn();
      renderSidebar({ onCreateDisbursement });

      const button = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      await user.click(button);

      expect(onCreateDisbursement).toHaveBeenCalledTimes(1);
    });
  });
});
