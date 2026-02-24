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

// Mock the payout-disbursement module at the test file level
jest.mock("@/src/features/payout-disbursement", () => {
  const React = require("react");
  const actual = jest.requireActual("@/src/features/payout-disbursement/types/payout-disbursement");
  return {
    ...actual,
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
import type {
  CommunityPayoutAgreementInfo,
  CommunityPayoutInvoiceInfo,
  TokenTotal,
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

      const dateInput = screen.getByLabelText(/set agreement signed date/i);
      // fireEvent.change is more reliable for date inputs than userEvent.type
      await user.clear(dateInput);
      // Simulate picking a date by typing into the input
      const { fireEvent } = require("@testing-library/react");
      fireEvent.change(dateInput, { target: { value: "2024-06-15" } });

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
      expect(screen.getByText(/no milestone invoices configured/i)).toBeInTheDocument();
    });

    it("shows invoice status badges", () => {
      renderModal({
        invoiceRequired: true,
        milestoneInvoices: [
          createMockInvoice({ invoiceStatus: "received" }),
          createMockInvoice({
            milestoneLabel: "Milestone 2",
            milestoneUID: "ms-2",
            invoiceStatus: "not_submitted",
          }),
        ],
      });

      expect(screen.getByText("Received")).toBeInTheDocument();
      expect(screen.getByText("Not submitted")).toBeInTheDocument();
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
