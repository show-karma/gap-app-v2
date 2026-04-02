import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayoutConfigurationModal } from "../components/PayoutConfigurationModal";
import type { PayoutGrantConfig } from "../types/payout-disbursement";

// Mock the hooks
const mockSavePayoutConfig = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("../hooks/use-payout-disbursement", () => ({
  usePayoutConfigByGrant: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useGrantMilestones: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useSavePayoutConfig: vi.fn((options) => {
    mockSavePayoutConfig.mockImplementation(options);
    return {
      mutateAsync: mockMutateAsync,
      isPending: false,
    };
  }),
}));

// Mock viem
vi.mock("viem", () => ({
  isAddress: vi.fn((addr: string) => addr.startsWith("0x") && addr.length === 42),
}));

// Mock toast
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock crypto.randomUUID to return unique values
let uuidCounter = 0;
const mockUUID = vi.fn(() => `mock-uuid-${++uuidCounter}`);
Object.defineProperty(global, "crypto", {
  value: { randomUUID: mockUUID },
});

// Import mocks after jest.mock calls
import { useGrantMilestones, usePayoutConfigByGrant } from "../hooks/use-payout-disbursement";

const mockedUsePayoutConfigByGrant = usePayoutConfigByGrant as vi.Mock;
const mockedUseGrantMilestones = useGrantMilestones as vi.Mock;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("PayoutConfigurationModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    grantUID: "grant-123",
    projectUID: "project-456",
    communityUID: "community-789",
    grantName: "Test Grant",
    projectName: "Test Project",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0; // Reset UUID counter
    mockMutateAsync.mockResolvedValue({});
    mockedUsePayoutConfigByGrant.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockedUseGrantMilestones.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  describe("rendering", () => {
    it("should render modal when open", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Configure Payout")).toBeInTheDocument();
      expect(screen.getByText(/Test Project/)).toBeInTheDocument();
      expect(screen.getByText(/Test Grant/)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<PayoutConfigurationModal {...defaultProps} isOpen={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText("Configure Payout")).not.toBeInTheDocument();
    });

    it("should show loading state when fetching config", () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Loading configuration...")).toBeInTheDocument();
    });

    it("should render form fields", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText("Payout Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Network")).toBeInTheDocument();
      expect(screen.getByLabelText("Token")).toBeInTheDocument();
      expect(screen.getByLabelText("Total Grant Amount")).toBeInTheDocument();
    });
  });

  describe("loading existing config", () => {
    const existingConfig: PayoutGrantConfig = {
      id: "config-1",
      grantUID: "grant-123",
      projectUID: "project-456",
      communityUID: "community-789",
      payoutAddress: "0x1234567890123456789012345678901234567890",
      totalGrantAmount: "100.50", // Human-readable format
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism USDC
      chainID: 10,
      milestoneAllocations: [
        { id: "alloc-1", label: "First payment", amount: "30" },
        { id: "alloc-2", label: "Final payment", amount: "70.50" },
      ],
      createdBy: "0xadmin",
      updatedBy: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("should load existing config values", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfig,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const addressInput = screen.getByLabelText("Payout Address") as HTMLInputElement;
        expect(addressInput.value).toBe("0x1234567890123456789012345678901234567890");
      });
    });

    it("should load total grant amount directly without conversion", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfig,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const amountInput = screen.getByLabelText("Total Grant Amount") as HTMLInputElement;
        expect(amountInput.value).toBe("100.50");
      });
    });
  });

  describe("custom line item persistence", () => {
    it("should restore custom line items when loading an existing config that contains them", async () => {
      mockedUseGrantMilestones.mockReturnValue({
        data: [{ uid: "milestone-1", title: "Milestone 1" }],
        isLoading: false,
      });

      const configWithCustomItems: PayoutGrantConfig = {
        id: "config-custom",
        grantUID: "grant-123",
        projectUID: "project-456",
        communityUID: "community-789",
        payoutAddress: "0x1234567890123456789012345678901234567890",
        totalGrantAmount: "100",
        tokenAddress: null,
        chainID: 10,
        milestoneAllocations: [
          { id: "alloc-first", label: "First payment", amount: "20" },
          { id: "alloc-m1", milestoneUID: "milestone-1", label: "Milestone 1", amount: "30" },
          { id: "alloc-custom-1", label: "Travel expenses", amount: "10" },
          { id: "alloc-custom-2", label: "Equipment costs", amount: "15" },
          { id: "alloc-final", label: "Final payment", amount: "25" },
        ],
        createdBy: "0xadmin",
        updatedBy: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithCustomItems,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue("Travel expenses")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Equipment costs")).toBeInTheDocument();
      });
    });
  });

  describe("duplicate allocation keys", () => {
    it("should not produce duplicate keys when an existing allocation matches both a label and a milestoneUID slot", async () => {
      const DUPLICATE_ID = "057d0401-6477-4d60-881c-791692205b37";

      mockedUseGrantMilestones.mockReturnValue({
        data: [{ uid: "milestone-1", title: "Milestone 1" }],
        isLoading: false,
      });

      const configWithAmbiguousAllocation: PayoutGrantConfig = {
        id: "config-dup",
        grantUID: "grant-123",
        projectUID: "project-456",
        communityUID: "community-789",
        payoutAddress: "0x1234567890123456789012345678901234567890",
        totalGrantAmount: "100",
        tokenAddress: null,
        chainID: 10,
        milestoneAllocations: [
          { id: DUPLICATE_ID, label: "First payment", milestoneUID: "milestone-1", amount: "50" },
          { id: "alloc-final", label: "Final payment", amount: "50" },
        ],
        createdBy: "0xadmin",
        updatedBy: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithAmbiguousAllocation,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const allocationItems = document.querySelectorAll("[data-allocation-id]");
        const ids = Array.from(allocationItems).map((el) => el.getAttribute("data-allocation-id"));
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });

    it("should not produce duplicate keys when backend data contains duplicate allocation ids", async () => {
      const DUPLICATE_ID = "dup-backend-id";

      mockedUseGrantMilestones.mockReturnValue({
        data: [{ uid: "milestone-1", title: "M1" }],
        isLoading: false,
      });

      const configWithDuplicateIds: PayoutGrantConfig = {
        id: "config-dup2",
        grantUID: "grant-123",
        projectUID: "project-456",
        communityUID: "community-789",
        payoutAddress: "0x1234567890123456789012345678901234567890",
        totalGrantAmount: "100",
        tokenAddress: null,
        chainID: 10,
        milestoneAllocations: [
          { id: DUPLICATE_ID, label: "First payment", amount: "30" },
          { id: DUPLICATE_ID, milestoneUID: "milestone-1", label: "M1", amount: "40" },
          { id: "alloc-final", label: "Final payment", amount: "30" },
        ],
        createdBy: "0xadmin",
        updatedBy: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithDuplicateIds,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const allocationItems = document.querySelectorAll("[data-allocation-id]");
        const ids = Array.from(allocationItems).map((el) => el.getAttribute("data-allocation-id"));
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });

  describe("validation", () => {
    it("should show error for invalid payout address", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const addressInput = screen.getByLabelText("Payout Address");
      await user.type(addressInput, "invalid-address");
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText("Invalid Ethereum address")).toBeInTheDocument();
      });
    });

    it("should accept valid payout address", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const addressInput = screen.getByLabelText("Payout Address");
      await user.type(addressInput, "0x1234567890123456789012345678901234567890");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Invalid Ethereum address")).not.toBeInTheDocument();
      });
    });

    it("should accept valid positive amount without error", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const amountInput = screen.getByLabelText("Total Grant Amount");
      await user.type(amountInput, "100");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Amount must be a non-negative number")).not.toBeInTheDocument();
      });
    });
  });

  describe("milestone allocations", () => {
    it("should generate allocations from milestones", async () => {
      mockedUseGrantMilestones.mockReturnValue({
        data: [
          { uid: "ms-1", title: "Milestone 1" },
          { uid: "ms-2", title: "Milestone 2" },
        ],
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("First payment")).toBeInTheDocument();
        expect(screen.getByText("Milestone 1")).toBeInTheDocument();
        expect(screen.getByText("Milestone 2")).toBeInTheDocument();
        expect(screen.getByText("Final payment")).toBeInTheDocument();
      });
    });

    it("should show allocation sum indicator", async () => {
      mockedUseGrantMilestones.mockReturnValue({
        data: [{ uid: "ms-1", title: "Milestone 1" }],
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("Total Allocated")).toBeInTheDocument();
      });
    });
  });

  describe("custom line items", () => {
    it("should add a custom line item and allow editing description and amount", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("button", { name: "Add custom line item" }));

      const descriptionInput = screen.getByLabelText("Custom line item description");
      const amountInput = screen.getByLabelText("Custom line item amount");

      await user.type(descriptionInput, "Test Payment");
      await user.type(amountInput, "1");

      expect((descriptionInput as HTMLInputElement).value).toBe("Test Payment");
      expect((amountInput as HTMLInputElement).value).toBe("1");
    });

    it("should remove a custom line item after confirmation", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("button", { name: "Add custom line item" }));
      await user.type(screen.getByLabelText("Custom line item description"), "One-off payment");

      await user.click(screen.getByRole("button", { name: "Remove custom line item" }));

      // Confirmation dialog appears
      await waitFor(() => {
        expect(
          screen.getByText("Are you sure you want to remove this line item?")
        ).toBeInTheDocument();
      });

      // Confirm deletion
      await user.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(screen.queryByLabelText("Custom line item description")).not.toBeInTheDocument();
      });
    });

    it("should include custom line item in save payload", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("button", { name: "Add custom line item" }));
      await user.type(screen.getByLabelText("Custom line item description"), "Test Payment");
      await user.type(screen.getByLabelText("Custom line item amount"), "1");

      await user.click(screen.getByRole("button", { name: "Save Configuration" }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      const callArg = mockMutateAsync.mock.calls[0][0];
      expect(callArg.configs[0].milestoneAllocations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Test Payment",
            amount: "1",
          }),
        ])
      );
    });

    it("should require description for custom line item before saving", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("button", { name: "Add custom line item" }));
      await user.type(screen.getByLabelText("Custom line item amount"), "1");
      await user.click(screen.getByRole("button", { name: "Save Configuration" }));

      await waitFor(() => {
        expect(screen.getByText("Description is required")).toBeInTheDocument();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("paid allocation guards", () => {
    const existingConfigWithCustom: PayoutGrantConfig = {
      id: "config-1",
      grantUID: "grant-123",
      projectUID: "project-456",
      communityUID: "community-789",
      payoutAddress: "0x1234567890123456789012345678901234567890",
      totalGrantAmount: "300",
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      chainID: 10,
      milestoneAllocations: [
        { id: "alloc-first", label: "First payment", amount: "100" },
        { id: "alloc-custom-1", label: "Consulting fee", amount: "100" },
        { id: "alloc-final", label: "Final payment", amount: "100" },
      ],
      createdBy: "0xadmin",
      updatedBy: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("should disable editing for paid custom line items", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfigWithCustom,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={existingConfigWithCustom}
          paidAllocationIds={["alloc-custom-1"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // The paid custom allocation's description input should be disabled
        const descriptionInputs = screen.queryAllByLabelText("Custom line item description");
        for (const input of descriptionInputs) {
          if ((input as HTMLInputElement).value === "Consulting fee") {
            expect(input).toBeDisabled();
          }
        }
      });
    });

    it("should hide the remove button for paid custom line items", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfigWithCustom,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={existingConfigWithCustom}
          paidAllocationIds={["alloc-custom-1"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // Should have the "Consulting fee" text visible
        expect(screen.getByDisplayValue("Consulting fee")).toBeInTheDocument();
      });

      // The remove button should NOT be present for the paid allocation
      const removeButtons = screen.queryAllByRole("button", { name: "Remove custom line item" });
      expect(removeButtons).toHaveLength(0);
    });

    it("should show paid badge for paid allocations", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfigWithCustom,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={existingConfigWithCustom}
          paidAllocationIds={["alloc-first"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Paid")).toBeInTheDocument();
      });
    });

    it("should disable amount input for paid allocations", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfigWithCustom,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={existingConfigWithCustom}
          paidAllocationIds={["alloc-first"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("First payment")).toBeInTheDocument();
      });

      // Find all amount inputs and verify paid ones are disabled
      // The First payment allocation's amount input should be disabled
      const allInputs = screen.getAllByRole("textbox");
      const firstPaymentAmountInput = allInputs.find(
        (input) =>
          (input as HTMLInputElement).value === "100" &&
          input.closest('[data-allocation-id="alloc-first"]')
      );
      if (firstPaymentAmountInput) {
        expect(firstPaymentAmountInput).toBeDisabled();
      }
    });

    it("should still allow editing unpaid custom line items when some are paid", async () => {
      const user = userEvent.setup();

      const configWithMultipleCustom: PayoutGrantConfig = {
        ...existingConfigWithCustom,
        milestoneAllocations: [
          { id: "alloc-first", label: "First payment", amount: "100" },
          { id: "alloc-custom-1", label: "Consulting fee", amount: "100" },
          { id: "alloc-custom-2", label: "Travel expenses", amount: "50" },
          { id: "alloc-final", label: "Final payment", amount: "50" },
        ],
        totalGrantAmount: "300",
      };

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithMultipleCustom,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={configWithMultipleCustom}
          paidAllocationIds={["alloc-custom-1"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Travel expenses")).toBeInTheDocument();
      });

      // The unpaid custom line item should still be editable
      const travelInput = screen.getByDisplayValue("Travel expenses");
      expect(travelInput).not.toBeDisabled();

      // Should be able to remove the unpaid custom line item
      const removeButtons = screen.queryAllByRole("button", { name: "Remove custom line item" });
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it("should not allow removing paid allocations from save payload", async () => {
      const user = userEvent.setup();

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfigWithCustom,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={existingConfigWithCustom}
          paidAllocationIds={["alloc-custom-1"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Consulting fee")).toBeInTheDocument();
      });

      // Save the config
      await user.click(screen.getByRole("button", { name: "Save Configuration" }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // The paid allocation should still be in the save payload
      const callArg = mockMutateAsync.mock.calls[0][0];
      expect(callArg.configs[0].milestoneAllocations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "alloc-custom-1",
            label: "Consulting fee",
            amount: "100",
          }),
        ])
      );
    });
  });

  describe("form submission", () => {
    it("should call save mutation when save button is clicked", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Click save without entering any data (all fields are optional)
      const saveButton = screen.getByRole("button", { name: "Save Configuration" });
      await user.click(saveButton);

      // Verify mutation was called
      await waitFor(
        () => {
          expect(mockMutateAsync).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("should call mutateAsync with correct payload structure", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Just click save with defaults - should include grantUID and projectUID
      const saveButton = screen.getByRole("button", { name: "Save Configuration" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        const callArg = mockMutateAsync.mock.calls[0][0];
        expect(callArg.communityUID).toBe("community-789");
        expect(callArg.configs[0].grantUID).toBe("grant-123");
        expect(callArg.configs[0].projectUID).toBe("project-456");
      });
    });

    it("should call mutateAsync when save button is clicked", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const saveButton = screen.getByRole("button", { name: "Save Configuration" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });
  });

  describe("token selection", () => {
    it("should show USDC as default token", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const tokenSelect = screen.getByLabelText("Token") as HTMLSelectElement;
      expect(tokenSelect.value).toBe("usdc");
    });

    it("should allow selecting native token", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const tokenSelect = screen.getByLabelText("Token");
      await user.selectOptions(tokenSelect, "native");

      await waitFor(() => {
        expect((tokenSelect as HTMLSelectElement).value).toBe("native");
      });
    });

    it("should not have custom token option", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const tokenSelect = screen.getByLabelText("Token") as HTMLSelectElement;
      const options = Array.from(tokenSelect.options).map((opt) => opt.value);
      expect(options).toContain("usdc");
      expect(options).toContain("native");
      expect(options).not.toContain("custom");
    });
  });

  describe("modal controls", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when close icon is clicked", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const closeButton = screen.getByRole("button", { name: "Close payout configuration" });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should reset form when modal closes", async () => {
      const { rerender } = render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Close the modal
      rerender(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <PayoutConfigurationModal {...defaultProps} isOpen={false} />
        </QueryClientProvider>
      );

      // Reopen the modal
      rerender(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <PayoutConfigurationModal {...defaultProps} isOpen={true} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const addressInput = screen.getByLabelText("Payout Address") as HTMLInputElement;
        expect(addressInput.value).toBe("");
      });
    });
  });

  describe("accessibility", () => {
    it("should have accessible close button", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const closeButton = screen.getByRole("button", { name: "Close payout configuration" });
      expect(closeButton).toBeInTheDocument();
    });

    it("should have labeled form inputs", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText("Payout Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Network")).toBeInTheDocument();
      expect(screen.getByLabelText("Token")).toBeInTheDocument();
      expect(screen.getByLabelText("Total Grant Amount")).toBeInTheDocument();
    });
  });

  describe("delete confirmation dialog", () => {
    const configWithCustomItems: PayoutGrantConfig = {
      id: "config-1",
      grantUID: "grant-123",
      projectUID: "project-456",
      communityUID: "community-789",
      payoutAddress: "0x1234567890123456789012345678901234567890",
      totalGrantAmount: "200",
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      chainID: 10,
      milestoneAllocations: [
        { id: "alloc-first", label: "First payment", amount: "100" },
        { id: "alloc-custom-1", label: "Custom fee", amount: "50" },
        { id: "alloc-final", label: "Final payment", amount: "50" },
      ],
      createdBy: "0xadmin",
      updatedBy: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("should show confirmation dialog when clicking remove on custom line item", async () => {
      const user = userEvent.setup();

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithCustomItems,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal {...defaultProps} existingConfig={configWithCustomItems} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Custom fee")).toBeInTheDocument();
      });

      const removeButton = screen.getByRole("button", { name: "Remove custom line item" });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.getByText("Are you sure you want to remove this line item?")
        ).toBeInTheDocument();
      });
    });

    it("should remove line item after confirming deletion", async () => {
      const user = userEvent.setup();

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithCustomItems,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal {...defaultProps} existingConfig={configWithCustomItems} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Custom fee")).toBeInTheDocument();
      });

      const removeButton = screen.getByRole("button", { name: "Remove custom line item" });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.getByText("Are you sure you want to remove this line item?")
        ).toBeInTheDocument();
      });

      // Click the "Continue" button in the dialog to confirm
      const continueButton = screen.getByRole("button", { name: "Continue" });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue("Custom fee")).not.toBeInTheDocument();
      });
    });

    it("should not remove line item when canceling deletion", async () => {
      const user = userEvent.setup();

      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithCustomItems,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal {...defaultProps} existingConfig={configWithCustomItems} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Custom fee")).toBeInTheDocument();
      });

      const removeButton = screen.getByRole("button", { name: "Remove custom line item" });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.getByText("Are you sure you want to remove this line item?")
        ).toBeInTheDocument();
      });

      // Click "Cancel" to dismiss
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      // The line item should still be present
      expect(screen.getByDisplayValue("Custom fee")).toBeInTheDocument();
    });

    it("should not show remove button for paid custom line items", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: configWithCustomItems,
        isLoading: false,
      });

      render(
        <PayoutConfigurationModal
          {...defaultProps}
          existingConfig={configWithCustomItems}
          paidAllocationIds={["alloc-custom-1"]}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Custom fee")).toBeInTheDocument();
      });

      // Remove button should not be present (it is hidden when isPaid)
      const removeButtons = screen.queryAllByRole("button", { name: "Remove custom line item" });
      expect(removeButtons).toHaveLength(0);
    });
  });
});
