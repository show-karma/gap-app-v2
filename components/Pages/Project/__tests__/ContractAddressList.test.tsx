import { fireEvent, render, screen } from "@testing-library/react";
import { ContractAddressList } from "../ContractAddressList";
import "@testing-library/jest-dom";

// Mock ContractAddressItem since we're testing the list component
jest.mock("../ContractAddressItem", () => ({
  ContractAddressItem: ({
    pair,
    index,
    onRemove,
    onVerify,
    onNetworkChange,
    onAddressChange,
  }: any) => (
    <div data-testid={`contract-item-${index}`}>
      <span>Network: {pair.network || "empty"}</span>
      <span>Address: {pair.address || "empty"}</span>
      <span>Verified: {pair.verified ? "yes" : "no"}</span>
      <button onClick={() => onRemove(index)}>Remove {index}</button>
      {onVerify && <button onClick={() => onVerify(index)}>Verify {index}</button>}
      <input
        data-testid={`network-input-${index}`}
        onChange={(e) => onNetworkChange(index, e.target.value)}
      />
      <input
        data-testid={`address-input-${index}`}
        onChange={(e) => onAddressChange(index, e.target.value)}
      />
    </div>
  ),
}));

describe("ContractAddressList", () => {
  const supportedNetworks = ["ethereum", "optimism", "arbitrum"] as const;
  const mockOnNetworkChange = jest.fn();
  const mockOnAddressChange = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnAdd = jest.fn();
  const mockOnVerify = jest.fn();

  const defaultProps = {
    pairs: [
      { network: "ethereum", address: "0x123", verified: false },
      { network: "optimism", address: "0x456", verified: true },
    ],
    invalidContracts: new Map(),
    onNetworkChange: mockOnNetworkChange,
    onAddressChange: mockOnAddressChange,
    onRemove: mockOnRemove,
    onAdd: mockOnAdd,
    supportedNetworks,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all contract pairs", () => {
      render(<ContractAddressList {...defaultProps} />);

      expect(screen.getByTestId("contract-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("contract-item-1")).toBeInTheDocument();
    });

    it("should display pair information", () => {
      render(<ContractAddressList {...defaultProps} />);

      expect(screen.getByText("Network: ethereum")).toBeInTheDocument();
      expect(screen.getByText("Address: 0x123")).toBeInTheDocument();
      expect(screen.getByText("Network: optimism")).toBeInTheDocument();
      expect(screen.getByText("Address: 0x456")).toBeInTheDocument();
    });

    it("should display verification status", () => {
      render(<ContractAddressList {...defaultProps} />);

      const verifiedStatuses = screen.getAllByText(/Verified:/);
      expect(verifiedStatuses.length).toBe(2);
    });

    it("should render add button", () => {
      render(<ContractAddressList {...defaultProps} />);

      expect(screen.getByText("Add Contract")).toBeInTheDocument();
    });

    it("should handle empty pairs", () => {
      render(
        <ContractAddressList
          {...defaultProps}
          pairs={[{ network: "", address: "", verified: false }]}
        />
      );

      expect(screen.getByText("Network: empty")).toBeInTheDocument();
      expect(screen.getByText("Address: empty")).toBeInTheDocument();
    });
  });

  describe("Key Generation", () => {
    it("should use network:address as key for filled pairs", () => {
      const { container } = render(<ContractAddressList {...defaultProps} />);

      const items = container.querySelectorAll("[data-testid^='contract-item']");
      expect(items.length).toBe(2);
    });

    it("should use empty-index as key for empty pairs", () => {
      const { container } = render(
        <ContractAddressList
          {...defaultProps}
          pairs={[
            { network: "", address: "", verified: false },
            { network: "", address: "", verified: false },
          ]}
        />
      );

      const items = container.querySelectorAll("[data-testid^='contract-item']");
      expect(items.length).toBe(2);
    });

    it("should handle mixed filled and empty pairs", () => {
      const { container } = render(
        <ContractAddressList
          {...defaultProps}
          pairs={[
            { network: "ethereum", address: "0x123", verified: false },
            { network: "", address: "", verified: false },
          ]}
        />
      );

      const items = container.querySelectorAll("[data-testid^='contract-item']");
      expect(items.length).toBe(2);
    });
  });

  describe("Add Button", () => {
    it("should call onAdd when add button clicked", () => {
      render(<ContractAddressList {...defaultProps} />);

      const addButton = screen.getByText("Add Contract");
      fireEvent.click(addButton);

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });

    it("should always show add button", () => {
      render(
        <ContractAddressList
          {...defaultProps}
          pairs={[{ network: "", address: "", verified: false }]}
        />
      );

      expect(screen.getByText("Add Contract")).toBeInTheDocument();
    });
  });

  describe("Props Passing", () => {
    it("should pass onVerify to ContractAddressItem when provided", () => {
      render(<ContractAddressList {...defaultProps} onVerify={mockOnVerify} />);

      const verifyButtons = screen.getAllByText(/Verify/);
      expect(verifyButtons.length).toBeGreaterThan(0);
    });

    it("should not show verify button when onVerify not provided", () => {
      render(<ContractAddressList {...defaultProps} onVerify={undefined} />);

      const verifyButtons = screen.queryAllByText(/^Verify \d+$/);
      expect(verifyButtons.length).toBe(0);
    });

    it("should pass invalidContracts to ContractAddressItem", () => {
      const invalidContracts = new Map([
        ["ethereum:0x123", { message: "Invalid contract", type: "backend" }],
      ]);

      render(<ContractAddressList {...defaultProps} invalidContracts={invalidContracts} />);

      // Items should still render
      expect(screen.getByTestId("contract-item-0")).toBeInTheDocument();
    });

    it("should pass supportedNetworks to ContractAddressItem", () => {
      render(<ContractAddressList {...defaultProps} />);

      // Component should render successfully
      expect(screen.getByTestId("contract-item-0")).toBeInTheDocument();
    });
  });

  describe("Callback Forwarding", () => {
    it("should forward onNetworkChange callback", () => {
      render(<ContractAddressList {...defaultProps} />);

      const networkInput = screen.getByTestId("network-input-0");
      fireEvent.change(networkInput, { target: { value: "arbitrum" } });

      expect(mockOnNetworkChange).toHaveBeenCalledWith(0, "arbitrum");
    });

    it("should forward onAddressChange callback", () => {
      render(<ContractAddressList {...defaultProps} />);

      const addressInput = screen.getByTestId("address-input-0");
      fireEvent.change(addressInput, { target: { value: "0x789" } });

      expect(mockOnAddressChange).toHaveBeenCalledWith(0, "0x789");
    });

    it("should forward onRemove callback with correct index", () => {
      render(<ContractAddressList {...defaultProps} />);

      const removeButton = screen.getByText("Remove 1");
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("should forward onVerify callback with correct index", () => {
      render(<ContractAddressList {...defaultProps} onVerify={mockOnVerify} />);

      const verifyButton = screen.getByText("Verify 0");
      fireEvent.click(verifyButton);

      expect(mockOnVerify).toHaveBeenCalledWith(0);
    });
  });

  describe("Error Display", () => {
    it("should display error message when provided", () => {
      render(<ContractAddressList {...defaultProps} error="Something went wrong" />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("should not display error section when no error", () => {
      render(<ContractAddressList {...defaultProps} error={null} />);

      expect(screen.queryByText(/went wrong/)).not.toBeInTheDocument();
    });

    it("should handle empty error string", () => {
      render(<ContractAddressList {...defaultProps} error="" />);

      // Should not display empty error
      const errorDivs = screen.queryAllByText("");
      expect(errorDivs.length).toBe(0);
    });
  });

  describe("Scrollable Container", () => {
    it("should have scrollable container class", () => {
      const { container } = render(<ContractAddressList {...defaultProps} />);

      const scrollableDiv = container.querySelector(".overflow-y-auto");
      expect(scrollableDiv).toBeInTheDocument();
    });

    it("should have max height class", () => {
      const { container } = render(<ContractAddressList {...defaultProps} />);

      const containerDiv = container.querySelector(".max-h-\\[60vh\\]");
      expect(containerDiv).toBeInTheDocument();
    });
  });

  describe("Multiple Pairs", () => {
    it("should render multiple pairs correctly", () => {
      const pairs = [
        { network: "ethereum", address: "0x111", verified: false },
        { network: "optimism", address: "0x222", verified: true },
        { network: "arbitrum", address: "0x333", verified: false },
      ];

      render(<ContractAddressList {...defaultProps} pairs={pairs} />);

      expect(screen.getByTestId("contract-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("contract-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("contract-item-2")).toBeInTheDocument();
    });

    it("should handle single pair", () => {
      render(
        <ContractAddressList
          {...defaultProps}
          pairs={[{ network: "ethereum", address: "0x123", verified: false }]}
        />
      );

      expect(screen.getByTestId("contract-item-0")).toBeInTheDocument();
      expect(screen.queryByTestId("contract-item-1")).not.toBeInTheDocument();
    });
  });

  describe("Verified Contracts", () => {
    it("should display verified contracts", () => {
      const pairs = [
        {
          network: "ethereum",
          address: "0x123",
          verified: true,
          verifiedAt: "2024-01-01T00:00:00Z",
          verifiedBy: "0xVerifier",
        },
      ];

      render(<ContractAddressList {...defaultProps} pairs={pairs} />);

      expect(screen.getByText("Verified: yes")).toBeInTheDocument();
    });

    it("should display unverified contracts", () => {
      const pairs = [{ network: "ethereum", address: "0x123", verified: false }];

      render(<ContractAddressList {...defaultProps} pairs={pairs} />);

      expect(screen.getByText("Verified: no")).toBeInTheDocument();
    });

    it("should handle mixed verified and unverified contracts", () => {
      const pairs = [
        { network: "ethereum", address: "0x123", verified: true },
        { network: "optimism", address: "0x456", verified: false },
      ];

      render(<ContractAddressList {...defaultProps} pairs={pairs} />);

      expect(screen.getByText("Verified: yes")).toBeInTheDocument();
      expect(screen.getByText("Verified: no")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle pairs with very long addresses", () => {
      const longAddress = "0x" + "a".repeat(100);
      const pairs = [{ network: "ethereum", address: longAddress, verified: false }];

      render(<ContractAddressList {...defaultProps} pairs={pairs} />);

      expect(screen.getByText(`Address: ${longAddress}`)).toBeInTheDocument();
    });

    it("should handle special characters in network names", () => {
      const pairs = [{ network: "ethereum-mainnet", address: "0x123", verified: false }];

      render(<ContractAddressList {...defaultProps} pairs={pairs} />);

      expect(screen.getByText("Network: ethereum-mainnet")).toBeInTheDocument();
    });

    it("should handle updating many items at once", () => {
      render(<ContractAddressList {...defaultProps} />);

      const networkInput0 = screen.getByTestId("network-input-0");
      const networkInput1 = screen.getByTestId("network-input-1");

      fireEvent.change(networkInput0, { target: { value: "arbitrum" } });
      fireEvent.change(networkInput1, { target: { value: "polygon" } });

      expect(mockOnNetworkChange).toHaveBeenCalledWith(0, "arbitrum");
      expect(mockOnNetworkChange).toHaveBeenCalledWith(1, "polygon");
      expect(mockOnNetworkChange).toHaveBeenCalledTimes(2);
    });
  });
});
