import { vi } from "vitest";
/**
 * Integration tests: Payout configuration flow
 *
 * Tests the end-to-end payout configuration journey through the
 * PayoutConfigurationModal component: setting up payout address,
 * configuring token and amount, allocating to milestones, and saving.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement/types/payout-disbursement";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn();
let capturedSaveOptions: any = {};

vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  usePayoutConfigByGrant: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useGrantMilestones: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useSavePayoutConfig: vi.fn((options: any) => {
    capturedSaveOptions = options || {};
    return {
      mutateAsync: mockMutateAsync,
      isPending: false,
    };
  }),
}));

vi.mock("viem", () => ({
  isAddress: vi.fn((addr: string) => addr.startsWith("0x") && addr.length === 42),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, "crypto", {
  value: { randomUUID: vi.fn(() => `mock-uuid-${++uuidCounter}`) },
  writable: true,
});

// ---------------------------------------------------------------------------
// Import mocks and component
// ---------------------------------------------------------------------------

import { PayoutConfigurationModal } from "@/src/features/payout-disbursement/components/PayoutConfigurationModal";
import {
  useGrantMilestones,
  usePayoutConfigByGrant,
} from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";

const mockedUsePayoutConfigByGrant = usePayoutConfigByGrant as vi.Mock;
const mockedUseGrantMilestones = useGrantMilestones as vi.Mock;
const mockToast = require("react-hot-toast").default;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Payout configuration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    capturedSaveOptions = {};
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

  // -------------------------------------------------------------------------
  // Modal rendering
  // -------------------------------------------------------------------------

  describe("modal rendering", () => {
    it("renders the payout configuration modal when open", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Configure Payout")).toBeInTheDocument();
      expect(screen.getByText(/Test Project/)).toBeInTheDocument();
      expect(screen.getByText(/Test Grant/)).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<PayoutConfigurationModal {...defaultProps} isOpen={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText("Configure Payout")).not.toBeInTheDocument();
    });

    it("renders all required form fields", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText("Payout Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Network")).toBeInTheDocument();
      expect(screen.getByLabelText("Token")).toBeInTheDocument();
      expect(screen.getByLabelText("Total Grant Amount")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe("loading state", () => {
    it("shows loading indicator while fetching existing config", () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Loading configuration...")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Existing config loading
  // -------------------------------------------------------------------------

  describe("loading existing config", () => {
    const existingConfig: PayoutGrantConfig = {
      id: "config-1",
      grantUID: "grant-123",
      projectUID: "project-456",
      communityUID: "community-789",
      payoutAddress: "0x1234567890123456789012345678901234567890",
      totalGrantAmount: "50000",
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      chainID: 10,
      milestoneAllocations: [
        { id: "alloc-1", label: "First payment", amount: "20000" },
        { id: "alloc-2", label: "Final payment", amount: "30000" },
      ],
      createdBy: "0xadmin",
      updatedBy: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    it("pre-fills payout address from existing config", async () => {
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

    it("pre-fills total grant amount from existing config", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfig,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const amountInput = screen.getByLabelText("Total Grant Amount") as HTMLInputElement;
        expect(amountInput.value).toBe("50000");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  describe("validation", () => {
    it("shows error for invalid Ethereum address", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const addressInput = screen.getByLabelText("Payout Address");
      await user.type(addressInput, "not-a-valid-address");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Invalid Ethereum address")).toBeInTheDocument();
      });
    });

    it("clears error for valid Ethereum address", async () => {
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
  });

  // -------------------------------------------------------------------------
  // Milestone allocations
  // -------------------------------------------------------------------------

  describe("milestone allocations", () => {
    it("generates allocations from grant milestones", async () => {
      mockedUseGrantMilestones.mockReturnValue({
        data: [
          { uid: "ms-1", title: "Design Phase" },
          { uid: "ms-2", title: "Development Phase" },
        ],
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("First payment")).toBeInTheDocument();
        expect(screen.getByText("Design Phase")).toBeInTheDocument();
        expect(screen.getByText("Development Phase")).toBeInTheDocument();
        expect(screen.getByText("Final payment")).toBeInTheDocument();
      });
    });

    it("shows First payment and Final payment when no milestones", () => {
      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("First payment")).toBeInTheDocument();
      expect(screen.getByText("Final payment")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Close action
  // -------------------------------------------------------------------------

  describe("close action", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Save configuration
  // -------------------------------------------------------------------------

  describe("save configuration", () => {
    it("calls mutateAsync with correct args when Save Configuration is clicked", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Fill in the payout address (valid ETH address)
      const addressInput = screen.getByLabelText("Payout Address");
      await user.type(addressInput, "0x1234567890123456789012345678901234567890");
      await user.tab();

      // Leave totalGrantAmount empty (it's optional) to avoid allocation sum
      // mismatch with the default "First payment" and "Final payment" rows.

      // Click Save Configuration
      const saveButton = screen.getByRole("button", { name: /Save Configuration/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      // Verify the call args contain the correct grant/project/community UIDs
      const callArgs = mockMutateAsync.mock.calls[0][0];
      expect(callArgs.communityUID).toBe("community-789");
      expect(callArgs.configs).toHaveLength(1);
      expect(callArgs.configs[0].grantUID).toBe("grant-123");
      expect(callArgs.configs[0].projectUID).toBe("project-456");
      expect(callArgs.configs[0].payoutAddress).toBe("0x1234567890123456789012345678901234567890");
    });

    it("invokes onSuccess callback after successful save", async () => {
      // Make mutateAsync resolve, which triggers the onSuccess in useSavePayoutConfig options
      mockMutateAsync.mockImplementation(async () => {
        // Simulate what React Query does: call the onSuccess from the hook options
        capturedSaveOptions.onSuccess?.();
        return {};
      });

      const user = userEvent.setup();
      const onSuccess = vi.fn();

      render(<PayoutConfigurationModal {...defaultProps} onSuccess={onSuccess} />, {
        wrapper: createWrapper(),
      });

      // Fill payout address only (totalGrantAmount is optional)
      const addressInput = screen.getByLabelText("Payout Address");
      await user.type(addressInput, "0x1234567890123456789012345678901234567890");
      await user.tab();

      // Save
      await user.click(screen.getByRole("button", { name: /Save Configuration/ }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      // The component's useSavePayoutConfig onSuccess calls onSuccess() and onClose()
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith("Payout configuration saved successfully");
    });

    it("does not call mutateAsync when address is invalid", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Type invalid address
      const addressInput = screen.getByLabelText("Payout Address");
      await user.type(addressInput, "not-valid");
      await user.tab();

      // Fill amount
      const amountInput = screen.getByLabelText("Total Grant Amount");
      await user.type(amountInput, "10000");
      await user.tab();

      // Click save
      await user.click(screen.getByRole("button", { name: /Save Configuration/ }));

      // mutateAsync should not be called due to validation failure
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });
});
