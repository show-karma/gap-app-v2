import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { OnrampFlow } from "../OnrampFlow";

// Mock the hooks
jest.mock("@/hooks/donation/useOnramp", () => ({
  useOnramp: jest.fn(() => ({
    initiateOnramp: jest.fn(),
    isLoading: false,
    session: null,
    clearSession: jest.fn(),
  })),
}));

jest.mock("@/hooks/useCountryDetection", () => ({
  useCountryDetection: jest.fn(() => ({
    country: "US",
    isLoading: false,
    error: null,
  })),
}));

// Mock child components
jest.mock("../StripeOnrampEmbed", () => ({
  StripeOnrampEmbed: jest.fn(() => <div data-testid="stripe-embed">Stripe Embed</div>),
}));

jest.mock("../OnrampSuccessModal", () => ({
  OnrampSuccessModal: jest.fn(() => <div data-testid="success-modal">Success Modal</div>),
}));

import { useOnramp } from "@/hooks/donation/useOnramp";
import { useCountryDetection } from "@/hooks/useCountryDetection";

const mockUseOnramp = useOnramp as jest.Mock;
const mockUseCountryDetection = useCountryDetection as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const defaultProps = {
  projectUid: "project-123",
  payoutAddress: "0x1234567890123456789012345678901234567890",
  chainId: 8453, // Base
};

describe("OnrampFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnramp.mockReturnValue({
      initiateOnramp: jest.fn(),
      isLoading: false,
      session: null,
      clearSession: jest.fn(),
    });
    mockUseCountryDetection.mockReturnValue({
      country: "US",
      isLoading: false,
      error: null,
    });
  });

  describe("Amount Input", () => {
    it("renders the amount input", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText(/Min:.*10/)).toBeInTheDocument();
    });

    it("shows minimum amount validation error", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "5" } });

      expect(screen.getByText(/Minimum amount is 10/)).toBeInTheDocument();
    });

    it("shows maximum amount validation error", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "20000" } });

      expect(screen.getByText(/Maximum amount is 10,000/)).toBeInTheDocument();
    });

    it("accepts valid amounts", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("restricts decimal places to 2", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "100.99" } });
      expect(input.value).toBe("100.99");

      fireEvent.change(input, { target: { value: "100.999" } });
      // Should not update because regex doesn't allow more than 2 decimals
      expect(input.value).toBe("100.99");
    });
  });

  describe("Chain Support", () => {
    it("shows button enabled for supported chains (Base)", () => {
      render(<OnrampFlow {...defaultProps} chainId={8453} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      const button = screen.getByRole("button", { name: /Continue to Stripe/i });
      expect(button).not.toBeDisabled();
    });

    it("shows error message for unsupported chains", () => {
      render(<OnrampFlow {...defaultProps} chainId={42161} />, { wrapper: createWrapper() }); // Arbitrum

      expect(
        screen.getByText(/Card payments are not available for this network/)
      ).toBeInTheDocument();
    });

    it("disables button for unsupported chains", () => {
      render(<OnrampFlow {...defaultProps} chainId={42161} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      const button = screen.getByRole("button", { name: /Continue to Stripe/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Country Detection", () => {
    it("disables button while country is loading", () => {
      mockUseCountryDetection.mockReturnValue({
        country: null,
        isLoading: true,
        error: null,
      });

      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      const button = screen.getByRole("button", { name: /Continue to Stripe/i });
      expect(button).toBeDisabled();
    });

    it("enables button after country is detected", () => {
      mockUseCountryDetection.mockReturnValue({
        country: "US",
        isLoading: false,
        error: null,
      });

      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      const button = screen.getByRole("button", { name: /Continue to Stripe/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe("Session Creation", () => {
    it("calls initiateOnramp with correct parameters", () => {
      const mockInitiateOnramp = jest.fn();
      mockUseOnramp.mockReturnValue({
        initiateOnramp: mockInitiateOnramp,
        isLoading: false,
        session: null,
        clearSession: jest.fn(),
      });

      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      const button = screen.getByRole("button", { name: /Continue to Stripe/i });
      fireEvent.click(button);

      expect(mockInitiateOnramp).toHaveBeenCalledWith(100, "USD");
    });

    it("shows loading state when creating session", () => {
      mockUseOnramp.mockReturnValue({
        initiateOnramp: jest.fn(),
        isLoading: true,
        session: null,
        clearSession: jest.fn(),
      });

      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Creating session/)).toBeInTheDocument();
    });

    it("renders StripeOnrampEmbed when session is active", () => {
      mockUseOnramp.mockReturnValue({
        initiateOnramp: jest.fn(),
        isLoading: false,
        session: { clientSecret: "cs_test_123", donationUid: "donation-456" },
        clearSession: jest.fn(),
      });

      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId("stripe-embed")).toBeInTheDocument();
    });
  });

  describe("Missing Payout Address", () => {
    it("disables button when payout address is empty", () => {
      render(<OnrampFlow {...defaultProps} payoutAddress="" />, { wrapper: createWrapper() });

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "100" } });

      const button = screen.getByRole("button", { name: /Continue to Stripe/i });
      expect(button).toBeDisabled();
    });
  });

  describe("How it works section", () => {
    it("displays the how it works explanation", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/How this works/)).toBeInTheDocument();
      expect(screen.getByText(/Complete your payment/)).toBeInTheDocument();
      expect(screen.getByText(/Your card payment is used to purchase USDC/)).toBeInTheDocument();
    });

    it("shows truncated payout address", () => {
      render(<OnrampFlow {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/0x1234.*7890/)).toBeInTheDocument();
    });
  });
});
