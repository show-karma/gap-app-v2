/**
 * Tests for donation checkout error page
 * (app/community/[communityId]/donate/[programId]/checkout/error.tsx)
 *
 * Covers:
 * - Error message displayed via getDetailedErrorInfo
 * - Actionable steps shown when available
 * - Technical details shown when digest present
 * - Try Again button calls reset
 * - Navigation links (Back to Communities, Return to Home)
 * - Error logged via errorManager
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonationCheckoutError from "@/app/community/[communityId]/donate/[programId]/checkout/error";
import { errorManager } from "@/components/Utilities/errorManager";
import { getDetailedErrorInfo } from "@/utilities/donations/errorMessages";
import { renderWithProviders } from "../../utils/render";

vi.mock("@/utilities/donations/errorMessages", () => ({
  getDetailedErrorInfo: vi.fn(),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockGetDetailedErrorInfo = getDetailedErrorInfo as vi.MockedFunction<
  typeof getDetailedErrorInfo
>;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

describe("DonationCheckoutError", () => {
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "UNKNOWN_ERROR" as any,
      message: "An unexpected error occurred",
      actionableSteps: ["Try refreshing the page", "Contact support"],
      technicalMessage: "RPC timeout",
    });
  });

  it("should display the error heading", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByText("Failed to load checkout")).toBeInTheDocument();
    expect(
      screen.getByText("Your donation cart is safe - we encountered an error loading the page")
    ).toBeInTheDocument();
  });

  it("should display parsed error message", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });

  it("should display actionable steps", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByText("What you can do")).toBeInTheDocument();
    expect(screen.getByText("Try refreshing the page")).toBeInTheDocument();
    expect(screen.getByText("Contact support")).toBeInTheDocument();
  });

  it("should not show actionable steps when empty", () => {
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "UNKNOWN_ERROR" as any,
      message: "Error",
      actionableSteps: [],
    });

    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.queryByText("What you can do")).not.toBeInTheDocument();
  });

  it("should show technical details when digest is present", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("Test"), {
      digest: "ERR_DIGEST_789",
    });

    renderWithProviders(<DonationCheckoutError error={error} reset={reset} />);

    expect(screen.getByText("Technical Details")).toBeInTheDocument();

    // Click to expand details
    await user.click(screen.getByText("Technical Details"));
    expect(screen.getByText("ERR_DIGEST_789")).toBeInTheDocument();
    expect(screen.getByText("RPC timeout")).toBeInTheDocument();
  });

  it("should not show technical details when digest is missing", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.queryByText("Technical Details")).not.toBeInTheDocument();
  });

  it("should call reset when Try Again button is clicked", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("should render Back to Communities link", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    const link = screen.getByText("Back to Communities");
    expect(link.closest("a")).toHaveAttribute("href", "/community");
  });

  it("should render Return to Home link", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DonationCheckoutError error={error as Error & { digest?: string }} reset={reset} />
    );

    const link = screen.getByText("Return to Home");
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("should report error to errorManager on mount", () => {
    const error = Object.assign(new Error("Test"), { digest: "DIGEST_1" });

    renderWithProviders(<DonationCheckoutError error={error} reset={reset} />);

    expect(mockErrorManager).toHaveBeenCalledWith(
      "Donation checkout error",
      error,
      expect.objectContaining({
        digest: "DIGEST_1",
        route: "checkout",
      })
    );
  });
});
