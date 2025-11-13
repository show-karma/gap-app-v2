/**
 * @file Tests for FiatOnrampModal component
 * @description Comprehensive tests for the Stripe crypto onramp modal component
 * covering rendering, Stripe SDK integration, Privy user data, and error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import { FiatOnrampModal } from "@/components/Donation/FiatOnramp/FiatOnrampModal";
import "@testing-library/jest-dom";

// Mock Next.js Script component
jest.mock("next/script", () => {
  return function MockScript({ src, onLoad }: any) {
    if (onLoad) {
      setTimeout(() => onLoad(), 0);
    }
    return <script src={src} data-testid={`script-${src}`} />;
  };
});

// Mock Privy
const mockPrivyUser = {
  wallet: {
    address: "0x1234567890123456789012345678901234567890",
  },
  email: {
    address: "test@example.com",
  },
};

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(() => ({
    user: mockPrivyUser,
  })),
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
}));

// Mock the donation hook
const mockCreateOnrampUrl = jest.fn();
jest.mock("@/hooks/donation/useDonation", () => ({
  useCreateOnrampUrl: jest.fn(() => ({
    mutateAsync: mockCreateOnrampUrl,
    isPending: false,
  })),
}));

// Mock project data
const mockProject = {
  uid: "project-123",
  title: "Test Project",
  payoutAddress: "0x1234567890123456789012345678901234567890",
};

// Mock Stripe global
const mockStripeOnramp = {
  mount: jest.fn(() => ({
    unmount: jest.fn(),
  })),
  on: jest.fn(),
};

describe("FiatOnrampModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).StripeOnramp = jest.fn(() => mockStripeOnramp);
  });

  afterEach(() => {
    delete (window as any).StripeOnramp;
  });

  it("should not render when isOpen is false", () => {
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
      "Complete Your Donation to Test Project"
    );
  });

  it("should load Stripe scripts", () => {
    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(screen.getByTestId("script-https://js.stripe.com/v3/")).toBeInTheDocument();
    expect(screen.getByTestId("script-https://crypto-js.stripe.com/crypto-onramp-outer.js")).toBeInTheDocument();
  });

  it("should create onramp session with Privy user data", async () => {
    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(mockCreateOnrampUrl).toHaveBeenCalledWith({
        projectId: "project-123",
        payoutAddress: "0x1234567890123456789012345678901234567890",
        fiatAmount: 100,
        fiatCurrency: "USD",
        targetToken: "USDC",
        network: 1,
        userEmail: "test@example.com",
      });
    });
  });

  it("should create onramp session without email if user has no email", async () => {
    const { usePrivy } = require("@privy-io/react-auth");
    usePrivy.mockReturnValue({
      user: {
        wallet: {
          address: "0x1234567890123456789012345678901234567890",
        },
      },
    });

    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={200}
      />
    );

    await waitFor(() => {
      expect(mockCreateOnrampUrl).toHaveBeenCalledWith({
        projectId: "project-123",
        payoutAddress: "0x1234567890123456789012345678901234567890",
        fiatAmount: 200,
        fiatCurrency: "USD",
        targetToken: "USDC",
        network: 1,
        userEmail: undefined,
      });
    });

    usePrivy.mockReturnValue({
      user: mockPrivyUser,
    });
  });

  it("should not create session if user has no wallet", async () => {
    const { usePrivy } = require("@privy-io/react-auth");
    usePrivy.mockReturnValue({
      user: {
        email: {
          address: "test@example.com",
        },
      },
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(mockCreateOnrampUrl).not.toHaveBeenCalled();
    });

    usePrivy.mockReturnValue({
      user: mockPrivyUser,
    });
  });

  it("should mount Stripe onramp SDK when client secret is received", async () => {
    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(window.StripeOnramp).toHaveBeenCalledWith("cos_test_123_secret_abc");
    });

    await waitFor(() => {
      expect(mockStripeOnramp.mount).toHaveBeenCalled();
    });
  });

  it("should set up event listeners for onramp session updates", async () => {
    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(mockStripeOnramp.on).toHaveBeenCalledWith(
        "onramp_session_updated",
        expect.any(Function)
      );
    });
  });

  it("should display loading state while creating session", () => {
    const { useCreateOnrampUrl } = require("@/hooks/donation/useDonation");
    useCreateOnrampUrl.mockReturnValue({
      mutateAsync: mockCreateOnrampUrl,
      isPending: true,
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(screen.getByText("Loading payment gateway...")).toBeInTheDocument();

    useCreateOnrampUrl.mockReturnValue({
      mutateAsync: mockCreateOnrampUrl,
      isPending: false,
    });
  });

  it("should handle errors when creating onramp session", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    mockCreateOnrampUrl.mockRejectedValue(
      new Error("Failed to create onramp session")
    );

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create onramp session:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("should call onClose when dialog is closed", () => {
    const mockOnClose = jest.fn();

    const { Dialog } = require("@/components/ui/dialog");
    const OriginalDialog = Dialog;
    const MockDialogWithClose = ({ open, onOpenChange, children }: any) => {
      if (!open) return null;
      return (
        <div data-testid="dialog-with-close">
          <button onClick={() => onOpenChange(false)}>Close</button>
          {children}
        </div>
      );
    };

    require("@/components/ui/dialog").Dialog = MockDialogWithClose;

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={mockOnClose}
        project={mockProject}
        fiatAmount={100}
      />
    );

    const closeButton = screen.getByText("Close");
    closeButton.click();

    expect(mockOnClose).toHaveBeenCalled();

    require("@/components/ui/dialog").Dialog = OriginalDialog;
  });

  it("should not create duplicate sessions on re-render", async () => {
    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    const { rerender } = render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(mockCreateOnrampUrl).toHaveBeenCalledTimes(1);
    });

    rerender(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    expect(mockCreateOnrampUrl).toHaveBeenCalledTimes(1);
  });

  it("should render onramp container with correct id", async () => {
    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      const container = document.getElementById("onramp-container");
      expect(container).toBeInTheDocument();
    });
  });

  it("should pass fiatAmount correctly to API", async () => {
    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={mockProject}
        fiatAmount={250.5}
      />
    );

    await waitFor(() => {
      expect(mockCreateOnrampUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          fiatAmount: 250.5,
        })
      );
    });
  });

  it("should use project payoutAddress as destination wallet", async () => {
    const customProject = {
      ...mockProject,
      payoutAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    };

    mockCreateOnrampUrl.mockResolvedValue({
      url: "cos_test_123_secret_abc",
      sessionId: "cos_test_123",
    });

    render(
      <FiatOnrampModal
        isOpen={true}
        onClose={jest.fn()}
        project={customProject}
        fiatAmount={100}
      />
    );

    await waitFor(() => {
      expect(mockCreateOnrampUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          payoutAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        })
      );
    });
  });
});
