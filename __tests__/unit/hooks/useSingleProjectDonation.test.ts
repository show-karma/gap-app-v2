import { act, renderHook, waitFor } from "@testing-library/react";
import * as wagmi from "wagmi";

// Mock wagmi hooks
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
}));

// Mock useNetworkSwitching
const mockSwitchToNetwork = vi.fn();
vi.mock("@/hooks/useNetworkSwitching", () => ({
  useNetworkSwitching: vi.fn(() => ({
    currentChainId: 42220,
    switchToNetwork: mockSwitchToNetwork,
  })),
}));

// Mock useDonationTransfer
const mockExecuteDonations = vi.fn();
vi.mock("@/hooks/useDonationTransfer", () => ({
  useDonationTransfer: vi.fn(() => ({
    executeDonations: mockExecuteDonations,
    isExecuting: false,
  })),
}));

// Mock useCreateDonation
vi.mock("@/hooks/donation/useCreateDonation", () => ({
  useCreateDonation: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

// Mock useCrossChainBalances
vi.mock("@/hooks/donation/useCrossChainBalances", () => ({
  useCrossChainBalances: vi.fn(() => ({
    balanceByTokenKey: { "ETH-1": "1.0" },
  })),
}));

// Mock chain-payout-address
vi.mock("@/src/features/chain-payout-address/hooks/use-chain-payout-address", () => ({
  getPayoutAddressForChain: vi.fn(() => "0xRecipient1111111111111111111111111111111"),
}));

// Mock supportedTokens
vi.mock("@/constants/supportedTokens", () => ({
  getAllSupportedChains: vi.fn(() => [1, 10, 42161]),
  SUPPORTED_TOKENS: [],
}));

import { useSingleProjectDonation } from "@/hooks/donation/useSingleProjectDonation";
import { useNetworkSwitching } from "@/hooks/useNetworkSwitching";

const createMockProject = (overrides = {}) => ({
  uid: "0xproject123",
  title: "Test Project",
  chainPayoutAddress: { "1": "0xRecipient1111111111111111111111111111111" },
  ...overrides,
});

const createMockToken = (overrides = {}) => ({
  symbol: "ETH",
  name: "Ethereum",
  address: "native",
  decimals: 18,
  chainId: 1,
  chainName: "Ethereum",
  isNative: true,
  ...overrides,
});

describe("useSingleProjectDonation", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: "0x9b750f08b73D7441d4A0eFF112648764613019A4",
    } as any);

    // Wallet is on chain 42220 (Celo), different from the selected token (chain 1)
    vi.mocked(useNetworkSwitching).mockReturnValue({
      currentChainId: 42220,
      switchToNetwork: mockSwitchToNetwork,
    } as any);

    mockExecuteDonations.mockResolvedValue([
      { hash: "0xabc", projectId: "0xproject123", status: "success" },
    ]);
  });

  describe("chain switching on cross-chain donation", () => {
    it("should_provide_beforeTransfer_callback_when_chains_differ", async () => {
      const project = createMockProject();
      const { result } = renderHook(() => useSingleProjectDonation(project as any, onClose));

      act(() => {
        result.current.setSelectedToken(createMockToken({ chainId: 1 }));
        result.current.handleAmountChange({
          target: { value: "0.001" },
        } as any);
      });

      act(() => {
        result.current.handleProceed();
      });

      await waitFor(() => {
        expect(mockExecuteDonations).toHaveBeenCalled();
      });

      // executeDonations must receive payments, address resolver, AND beforeTransfer
      const callArgs = mockExecuteDonations.mock.calls[0];
      expect(callArgs[0]).toHaveLength(1); // payments
      expect(typeof callArgs[1]).toBe("function"); // getRecipientAddress
      expect(typeof callArgs[2]).toBe("function"); // beforeTransfer
    });

    it("should_delegate_chain_switching_to_beforeTransfer_inside_executeDonations", async () => {
      const project = createMockProject();
      const { result } = renderHook(() => useSingleProjectDonation(project as any, onClose));

      act(() => {
        result.current.setSelectedToken(createMockToken({ chainId: 1 }));
        result.current.handleAmountChange({
          target: { value: "0.001" },
        } as any);
      });

      act(() => {
        result.current.handleProceed();
      });

      await waitFor(() => {
        expect(mockExecuteDonations).toHaveBeenCalled();
      });

      // The beforeTransfer callback (3rd arg) should be provided
      const beforeTransfer = mockExecuteDonations.mock.calls[0][2];
      expect(beforeTransfer).toBeDefined();

      // Simulate executeDonations calling beforeTransfer with a cross-chain payment
      await beforeTransfer({ chainId: 1 });

      // switchToNetwork should be called with the target chain
      expect(mockSwitchToNetwork).toHaveBeenCalledWith(1);
    });

    it("should_pass_beforeTransfer_callback_to_executeDonations_for_wallet_sync", async () => {
      const project = createMockProject();
      const { result } = renderHook(() => useSingleProjectDonation(project as any, onClose));

      act(() => {
        result.current.setSelectedToken(createMockToken({ chainId: 1 }));
        result.current.handleAmountChange({
          target: { value: "0.001" },
        } as any);
      });

      act(() => {
        result.current.handleProceed();
      });

      await waitFor(() => {
        expect(mockExecuteDonations).toHaveBeenCalled();
      });

      // executeDonations should receive a beforeTransfer callback (3rd arg)
      // to handle wallet client sync after chain switch
      const callArgs = mockExecuteDonations.mock.calls[0];
      // callArgs[0] = payments array, callArgs[1] = getRecipientAddress, callArgs[2] = beforeTransfer
      expect(callArgs[2]).toBeDefined();
      expect(typeof callArgs[2]).toBe("function");
    });

    it("should_always_call_switchToNetwork_even_when_wagmi_reports_same_chain", async () => {
      // wagmi reports chain 1, but actual wallet could be on a different chain
      // switchToNetwork handles the no-op internally if already correct
      vi.mocked(useNetworkSwitching).mockReturnValue({
        currentChainId: 1,
        switchToNetwork: mockSwitchToNetwork,
      } as any);

      const project = createMockProject();
      const { result } = renderHook(() => useSingleProjectDonation(project as any, onClose));

      act(() => {
        result.current.setSelectedToken(createMockToken({ chainId: 1 }));
        result.current.handleAmountChange({
          target: { value: "0.001" },
        } as any);
      });

      act(() => {
        result.current.handleProceed();
      });

      await waitFor(() => {
        expect(mockExecuteDonations).toHaveBeenCalled();
      });

      // beforeTransfer should still call switchToNetwork unconditionally
      const beforeTransfer = mockExecuteDonations.mock.calls[0][2];
      await beforeTransfer({ chainId: 1 });
      expect(mockSwitchToNetwork).toHaveBeenCalledWith(1);
    });
  });
});
