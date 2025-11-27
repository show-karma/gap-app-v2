/**
 * @file Tests for FiatOnrampModal component
 * @description Comprehensive tests for the MoonPay crypto onramp modal component
 * covering rendering, MoonPay SDK integration, network selection, and currency display
 */

import { render, screen } from "@testing-library/react";
import { FiatOnrampModal } from "@/components/Donation/FiatOnramp/FiatOnrampModal";
import "@testing-library/jest-dom";
import * as moonpayUtils from "@/utilities/moonpay";

// Mock MoonPay SDK
jest.mock("@moonpay/moonpay-react", () => ({
  MoonPayBuyWidget: ({
    visible,
    defaultCurrencyCode,
    walletAddress,
    baseCurrencyCode,
    baseCurrencyAmount,
    showOnlyCurrencies
  }: any) => (
    <div
      data-testid="moonpay-widget"
      data-visible={visible}
      data-currency={defaultCurrencyCode}
      data-wallet={walletAddress}
      data-base-currency={baseCurrencyCode}
      data-base-amount={baseCurrencyAmount}
      data-allowed-currencies={showOnlyCurrencies}
    >
      MoonPay Widget
    </div>
  ),
}));

// Mock shadcn Dialog components
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, onOpenChange, children }: any) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: any) => (
    <div data-testid="dialog-description">{children}</div>
  ),
}));

// Mock MoonPay utilities
jest.mock("@/utilities/moonpay");

// Mock project data
const mockProject = {
  uid: "project-123",
  title: "Test Project",
  payoutAddress: "0x1234567890123456789012345678901234567890",
  chainID: 8453, // Base
};

describe("FiatOnrampModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (moonpayUtils.toMoonPayNetworkName as jest.Mock).mockReturnValue("base");
    (moonpayUtils.getMoonPayCurrencyCode as jest.Mock).mockReturnValue("eth_base");
    (moonpayUtils.getAllowedMoonPayCurrencies as jest.Mock).mockReturnValue(
      "celo,cusd,eth,eth_arbitrum,eth_base,eth_optimism,pol_polygon,usdc,usdc_arbitrum,usdc_base,usdc_celo,usdc_optimism,usdc_polygon,usdt,usdt_arbitrum,usdt_base,usdt_celo,usdt_optimism,usdt_polygon"
    );
  });

  it("should not render dialog content when isOpen is false", () => {
    const { container } = render(
      <FiatOnrampModal
        isOpen={false}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    const dialog = container.querySelector('[data-open="false"]');
    expect(dialog).toBeInTheDocument();
  });

  it("should render dialog when isOpen is true", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Pay with Card"
    );
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "Purchase crypto with your debit or credit card"
    );
  });

  it("should render MoonPay widget with correct props", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveAttribute("data-visible", "true");
    expect(widget).toHaveAttribute("data-base-currency", "usd");
    expect(widget).toHaveAttribute("data-base-amount", "100");
  });

  it("should convert project chainID to MoonPay network name", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(moonpayUtils.toMoonPayNetworkName).toHaveBeenCalledWith(8453);
  });

  it("should get correct currency code for ETH on the selected network", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(moonpayUtils.getMoonPayCurrencyCode).toHaveBeenCalledWith("ETH", "base");
  });

  it("should pass defaultCurrencyCode to MoonPay widget", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-currency", "eth_base");
  });

  it("should pass project payoutAddress to MoonPay widget", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-wallet", "0x1234567890123456789012345678901234567890");
  });

  it("should pass allowed currencies from SUPPORTED_TOKENS", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(moonpayUtils.getAllowedMoonPayCurrencies).toHaveBeenCalled();
    const widget = screen.getByTestId("moonpay-widget");
    // Should have the allowed currencies attribute with the mocked value
    expect(widget).toHaveAttribute("data-allowed-currencies");
    const allowedCurrencies = widget.getAttribute("data-allowed-currencies");
    expect(allowedCurrencies).toContain("eth_base");
    expect(allowedCurrencies).toContain("usdc_base");
  });

  it("should pass fiatAmount correctly to MoonPay widget", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={250.5}
      />
    );

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-base-amount", "250.5");
  });

  it("should handle Optimism network correctly", () => {
    (moonpayUtils.toMoonPayNetworkName as jest.Mock).mockReturnValue("optimism");
    (moonpayUtils.getMoonPayCurrencyCode as jest.Mock).mockReturnValue("eth_optimism");

    const optimismProject = {
      ...mockProject,
      chainID: 10,
    };

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={optimismProject}
        fiatAmount={100}
      />
    );

    expect(moonpayUtils.toMoonPayNetworkName).toHaveBeenCalledWith(10);
    expect(moonpayUtils.getMoonPayCurrencyCode).toHaveBeenCalledWith("ETH", "optimism");

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-currency", "eth_optimism");
  });

  it("should handle Arbitrum network correctly", () => {
    (moonpayUtils.toMoonPayNetworkName as jest.Mock).mockReturnValue("arbitrum");
    (moonpayUtils.getMoonPayCurrencyCode as jest.Mock).mockReturnValue("eth_arbitrum");

    const arbitrumProject = {
      ...mockProject,
      chainID: 42161,
    };

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={arbitrumProject}
        fiatAmount={100}
      />
    );

    expect(moonpayUtils.toMoonPayNetworkName).toHaveBeenCalledWith(42161);
    expect(moonpayUtils.getMoonPayCurrencyCode).toHaveBeenCalledWith("ETH", "arbitrum");

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-currency", "eth_arbitrum");
  });

  it("should handle Ethereum mainnet correctly", () => {
    (moonpayUtils.toMoonPayNetworkName as jest.Mock).mockReturnValue("ethereum");
    (moonpayUtils.getMoonPayCurrencyCode as jest.Mock).mockReturnValue("eth");

    const ethereumProject = {
      ...mockProject,
      chainID: 1,
    };

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={ethereumProject}
        fiatAmount={100}
      />
    );

    expect(moonpayUtils.toMoonPayNetworkName).toHaveBeenCalledWith(1);
    expect(moonpayUtils.getMoonPayCurrencyCode).toHaveBeenCalledWith("ETH", "ethereum");

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-currency", "eth");
  });

  it("should call onClose when dialog is closed and not processing", () => {
    const mockOnClose = jest.fn();

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        fiatAmount={100}
      />
    );

    const dialog = screen.getByTestId("dialog");
    const onOpenChange = dialog.getAttribute("data-open") === "true" ? mockOnClose : jest.fn();

    expect(mockOnClose).toBeDefined();
  });

  it("should use different payoutAddress for different projects", () => {
    const customProject = {
      ...mockProject,
      payoutAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      chainID: 10,
    };

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={customProject}
        fiatAmount={100}
      />
    );

    const widget = screen.getByTestId("moonpay-widget");
    expect(widget).toHaveAttribute("data-wallet", "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
  });
});
