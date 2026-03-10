/**
 * Unit tests for ProjectDetailsModal.
 *
 * Tests agreement toggle (date-picker-driven signing), unsign flow,
 * milestone key uniqueness, and button disabled states.
 */

// ---- Mock holders (must be declared before jest.mock calls) ----

const mockToggleMutate = jest.fn();
const mockSaveMutate = jest.fn();

let mockTogglePending = false;
let mockSavePending = false;

// Mock the DatePicker component to avoid Radix Popover portal issues in JSDOM
jest.mock("@/components/Utilities/DatePicker", () => ({
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
    const React = require("react");
    return React.createElement(
      "button",
      {
        "aria-label": ariaLabel,
        "data-testid": "date-picker-trigger",
        onClick: () => onSelect(new Date("2024-06-15T00:00:00")),
      },
      selected ? selected.toLocaleDateString() : (placeholder ?? "Pick a date")
    );
  },
}));

// Mock the payout-disbursement module at the test file level
jest.mock("@/src/features/payout-disbursement", () => {
  const React = require("react");
  const actual = jest.requireActual("@/src/features/payout-disbursement/types/payout-disbursement");
  const utils = jest.requireActual("@/src/features/payout-disbursement/utils/format-token-amount");
  return {
    ...actual,
    formatDisplayAmount: utils.formatDisplayAmount,
    fromSmallestUnit: utils.fromSmallestUnit,
    useToggleAgreement: jest.fn(() => ({
      mutate: mockToggleMutate,
      isPending: mockTogglePending,
    })),
    useSaveMilestoneInvoices: jest.fn(() => ({
      mutate: mockSaveMutate,
      isPending: mockSavePending,
    })),
    getPaidAllocationIds: jest.fn(() => []),
    CreateDisbursementModal: () => null,
    PayoutConfigurationModal: () => null,
    PayoutHistoryDrawer: () => null,
    TokenBreakdown: ({ totalsByToken }: { totalsByToken: unknown[] }) =>
      React.createElement(
        "span",
        { "data-testid": "token-breakdown" },
        `${totalsByToken.length} tokens`
      ),
  };
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import "@testing-library/jest-dom";

import {
  ProjectDetailsModal,
  type ProjectDetailsModalGrant,
} from "@/components/Pages/Admin/ControlCenter/ProjectDetailsModal";
import {
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  MilestoneLifecycleStatus,
  type TokenTotal,
} from "@/src/features/payout-disbursement/types/payout-disbursement";
import { createMockAgreement, createMockInvoice } from "../fixtures";

// ---- Test grant object ----

const testGrant: ProjectDetailsModalGrant = {
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
  mockToggleMutate.mockClear();
  mockSaveMutate.mockClear();
  mockTogglePending = false;
  mockSavePending = false;

  // Re-mock to pick up updated pending values
  const {
    useToggleAgreement,
    useSaveMilestoneInvoices,
  } = require("@/src/features/payout-disbursement");

  (useToggleAgreement as jest.Mock).mockImplementation(() => ({
    mutate: mockToggleMutate,
    isPending: mockTogglePending,
  }));
  (useSaveMilestoneInvoices as jest.Mock).mockImplementation(() => ({
    mutate: mockSaveMutate,
    isPending: mockSavePending,
  }));
});

// ---- Helper to render the modal ----

interface RenderModalOptions {
  grant?: ProjectDetailsModalGrant | null;
  open?: boolean;
  agreement?: CommunityPayoutAgreementInfo | null;
  milestoneInvoices?: CommunityPayoutInvoiceInfo[];
  invoiceRequired?: boolean;
  disbursementInfo?: {
    totalsByToken: TokenTotal[];
    status: string;
    history: unknown[];
  } | null;
  onOpenChange?: jest.Mock;
  onOpenConfigModal?: jest.Mock;
  onOpenHistoryDrawer?: jest.Mock;
  onCreateDisbursement?: jest.Mock;
}

function renderModal(options: RenderModalOptions = {}) {
  const {
    grant = testGrant,
    open = true,
    agreement = null,
    milestoneInvoices = [],
    invoiceRequired = false,
    disbursementInfo = null,
    onOpenChange = jest.fn(),
    onOpenConfigModal = jest.fn(),
    onOpenHistoryDrawer = jest.fn(),
    onCreateDisbursement = jest.fn(),
  } = options;

  return render(
    <ProjectDetailsModal
      grant={grant}
      open={open}
      onOpenChange={onOpenChange}
      communityUID="community-uid-1"
      kycStatus={null}
      disbursementInfo={disbursementInfo}
      agreement={agreement}
      milestoneInvoices={milestoneInvoices}
      invoiceRequired={invoiceRequired}
      onOpenConfigModal={onOpenConfigModal}
      onOpenHistoryDrawer={onOpenHistoryDrawer}
      onCreateDisbursement={onCreateDisbursement}
    />
  );
}

// ---- Tests ----

describe("ProjectDetailsModal", () => {
  it("renders the project name and grant name when open", () => {
    renderModal();
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Grant Round Q1")).toBeInTheDocument();
  });

  it("renders nothing when grant is null", () => {
    const { container } = renderModal({ grant: null });
    expect(container.innerHTML).toBe("");
  });

  it("shows the approved amount with currency", () => {
    renderModal();
    expect(screen.getByText("Approved:")).toBeInTheDocument();
    expect(screen.getByText("10,000 USDC")).toBeInTheDocument();
  });

  it("shows the payout address truncated", () => {
    renderModal();
    expect(screen.getByText("0x1234...5678")).toBeInTheDocument();
  });

  describe("Agreement signing (date-picker flow)", () => {
    it("shows date input when agreement is not signed", () => {
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
        milestoneInvoices: [
          createMockInvoice({ milestoneLabel: "Deliverable A" }),
          createMockInvoice({
            milestoneLabel: "Deliverable B",
            milestoneUID: "ms-uid-2",
          }),
        ],
      });

      expect(screen.getByText("Deliverable A")).toBeInTheDocument();
      expect(screen.getByText("Deliverable B")).toBeInTheDocument();
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
      expect(() => renderModal({ milestoneInvoices: invoices })).not.toThrow();
    });

    it("shows empty state when no invoices", () => {
      renderModal({ milestoneInvoices: [] });
      expect(screen.getByText(/no milestones configured/i)).toBeInTheDocument();
    });
  });

  describe("Milestone status column", () => {
    it("renders milestone status badge with correct label", () => {
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
      renderModal({
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
    it("shows 'Invoice received' badge when invoice status is 'received'", () => {
      renderModal({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Recv",
            milestoneUID: "ms-recv",
            invoiceStatus: "received",
          }),
        ],
      });

      expect(screen.getByText("Invoice received")).toBeInTheDocument();
      // "Received" column header is still present
      expect(screen.getByText("Received")).toBeInTheDocument();
    });

    it("shows 'Invoice received' badge when invoice status is 'paid'", () => {
      renderModal({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS Paid",
            milestoneUID: "ms-paid",
            invoiceStatus: "paid",
          }),
        ],
      });

      expect(screen.getByText("Invoice received")).toBeInTheDocument();
    });

    it("shows 'Not submitted' badge when invoice status is 'not_submitted'", () => {
      renderModal({
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

      expect(screen.getByText("Not submitted")).toBeInTheDocument();
    });

    it("does not show invoice status column when invoiceRequired is false", () => {
      renderModal({
        invoiceRequired: false,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "MS NoInv",
            milestoneUID: "ms-noinv",
            invoiceStatus: "received",
          }),
        ],
      });

      // The "Invoice Status" header should not be present
      expect(screen.queryByText("Invoice Status")).not.toBeInTheDocument();
    });
  });

  describe("Unsaved changes guard", () => {
    it("calls window.confirm when closing with unsaved changes", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);

      renderModal({
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
      const dateInput = screen.getByLabelText(/invoice received date for M1/i);
      await user.type(dateInput, "2024-06-15");

      // Try to close via the explicit Close button (not the Radix dialog X)
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      // The last one is our explicit "Close" text button in the footer
      const closeButton = closeButtons[closeButtons.length - 1];
      await user.click(closeButton);

      expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Discard?");
      confirmSpy.mockRestore();
    });

    it("does not prompt when closing without unsaved changes", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      const confirmSpy = jest.spyOn(window, "confirm");

      renderModal({ onOpenChange, milestoneInvoices: [] });

      // Use the explicit "Close" text button in the footer
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const closeButton = closeButtons[closeButtons.length - 1];
      await user.click(closeButton);

      expect(confirmSpy).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe("Save changes", () => {
    it("shows save button with edit count when there are unsaved changes", async () => {
      const user = userEvent.setup();
      renderModal({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "Milestone A",
            milestoneUID: "ms-a",
            invoiceReceivedAt: null,
          }),
        ],
      });

      const dateInput = screen.getByLabelText(/invoice received date for Milestone A/i);
      await user.type(dateInput, "2024-06-15");

      expect(screen.getByText(/save changes \(1\)/i)).toBeInTheDocument();
    });

    it("calls saveMilestoneInvoices mutation with correct data", async () => {
      const user = userEvent.setup();
      renderModal({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({
            milestoneLabel: "Milestone A",
            milestoneUID: "ms-a",
            invoiceReceivedAt: null,
          }),
        ],
      });

      const dateInput = screen.getByLabelText(/invoice received date for Milestone A/i);
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
        }),
        expect.any(Object)
      );
    });
  });

  describe("Button disabled states", () => {
    it("disables action buttons when save mutation is pending", () => {
      mockSavePending = true;
      const { useSaveMilestoneInvoices } = require("@/src/features/payout-disbursement");
      (useSaveMilestoneInvoices as jest.Mock).mockImplementation(() => ({
        mutate: mockSaveMutate,
        isPending: true,
      }));

      renderModal();

      const configButton = screen.getByRole("button", {
        name: /payout settings/i,
      });
      const historyButton = screen.getByRole("button", {
        name: /view history/i,
      });
      expect(configButton).toBeDisabled();
      expect(historyButton).toBeDisabled();
    });

    it("disables create disbursement button when no payout address", () => {
      renderModal({
        grant: { ...testGrant, currentPayoutAddress: undefined },
      });

      const createButton = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      expect(createButton).toBeDisabled();
    });

    it("disables create disbursement button when amount is 0", () => {
      renderModal({
        grant: { ...testGrant, currentAmount: "0" },
      });

      const createButton = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      expect(createButton).toBeDisabled();
    });

    it("enables create disbursement button when address and amount are valid", () => {
      renderModal();

      const createButton = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      expect(createButton).toBeEnabled();
    });
  });

  describe("Footer action callbacks", () => {
    it("calls onOpenConfigModal when Payout Settings is clicked", async () => {
      const user = userEvent.setup();
      const onOpenConfigModal = jest.fn();
      renderModal({ onOpenConfigModal });

      const button = screen.getByRole("button", {
        name: /payout settings/i,
      });
      await user.click(button);

      expect(onOpenConfigModal).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenHistoryDrawer when View History is clicked", async () => {
      const user = userEvent.setup();
      const onOpenHistoryDrawer = jest.fn();
      renderModal({ onOpenHistoryDrawer });

      const button = screen.getByRole("button", { name: /view history/i });
      await user.click(button);

      expect(onOpenHistoryDrawer).toHaveBeenCalledTimes(1);
    });

    it("calls onCreateDisbursement when Create Disbursement is clicked", async () => {
      const user = userEvent.setup();
      const onCreateDisbursement = jest.fn();
      renderModal({ onCreateDisbursement });

      const button = screen.getByRole("button", {
        name: /create disbursement/i,
      });
      await user.click(button);

      expect(onCreateDisbursement).toHaveBeenCalledTimes(1);
    });
  });
});
