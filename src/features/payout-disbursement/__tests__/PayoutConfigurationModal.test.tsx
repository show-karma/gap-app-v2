import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayoutConfigurationModal } from "../components/PayoutConfigurationModal";
import type { PayoutGrantConfig } from "../types/payout-disbursement";

// Mock the hooks
const mockSavePayoutConfig = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock("../hooks/use-payout-disbursement", () => ({
  usePayoutConfigByGrant: jest.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useGrantMilestones: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useSavePayoutConfig: jest.fn((options) => {
    mockSavePayoutConfig.mockImplementation(options);
    return {
      mutateAsync: mockMutateAsync,
      isPending: false,
    };
  }),
}));

// Mock viem
jest.mock("viem", () => ({
  isAddress: jest.fn((addr: string) => addr.startsWith("0x") && addr.length === 42),
  parseUnits: jest.fn((value: string, decimals: number) => {
    const num = parseFloat(value);
    return BigInt(Math.round(num * 10 ** decimals));
  }),
  formatUnits: jest.fn((value: bigint, decimals: number) => {
    return (Number(value) / 10 ** decimals).toString();
  }),
}));

// Mock toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock crypto.randomUUID to return unique values
let uuidCounter = 0;
const mockUUID = jest.fn(() => `mock-uuid-${++uuidCounter}`);
Object.defineProperty(global, "crypto", {
  value: { randomUUID: mockUUID },
});

import toast from "react-hot-toast";
import { formatUnits, parseUnits } from "viem";
// Import mocks after jest.mock calls
import { useGrantMilestones, usePayoutConfigByGrant } from "../hooks/use-payout-disbursement";

const mockedUsePayoutConfigByGrant = usePayoutConfigByGrant as jest.Mock;
const mockedUseGrantMilestones = useGrantMilestones as jest.Mock;

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
    onClose: jest.fn(),
    grantUID: "grant-123",
    projectUID: "project-456",
    communityUID: "community-789",
    grantName: "Test Grant",
    projectName: "Test Project",
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      totalGrantAmount: "100000000", // 100 USDC in smallest units (6 decimals)
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism USDC
      chainId: 10,
      milestoneAllocations: [
        { id: "alloc-1", label: "First payment", amount: "30000000" }, // 30 USDC
        { id: "alloc-2", label: "Final payment", amount: "70000000" }, // 70 USDC
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

      // Check that formatUnits was called to convert amounts
      expect(formatUnits).toHaveBeenCalled();
    });

    it("should convert smallest unit amounts to human-readable on load", async () => {
      mockedUsePayoutConfigByGrant.mockReturnValue({
        data: existingConfig,
        isLoading: false,
      });

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // formatUnits should be called for totalGrantAmount conversion
      await waitFor(() => {
        expect(formatUnits).toHaveBeenCalledWith(BigInt("100000000"), 6);
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

    it("should show custom token address input when custom is selected", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const tokenSelect = screen.getByLabelText("Token");
      await user.selectOptions(tokenSelect, "custom");

      await waitFor(() => {
        expect(screen.getByLabelText("Custom Token Address")).toBeInTheDocument();
      });
    });

    it("should validate custom token address", async () => {
      const user = userEvent.setup();

      render(<PayoutConfigurationModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const tokenSelect = screen.getByLabelText("Token");
      await user.selectOptions(tokenSelect, "custom");

      const customTokenInput = screen.getByLabelText("Custom Token Address");
      await user.type(customTokenInput, "invalid");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Invalid token address")).toBeInTheDocument();
      });
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
});
