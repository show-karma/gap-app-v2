/**
 * Tests for claim-funds error page
 * (app/community/[communityId]/(whitelabel)/claim-funds/error.tsx)
 *
 * Covers:
 * - Error message displayed
 * - Error digest displayed when present
 * - Try again button calls reset
 * - Go home link rendered
 */

import { fireEvent, screen } from "@testing-library/react";
import ClaimFundsError from "@/app/community/[communityId]/(whitelabel)/claim-funds/error";
import { renderWithProviders } from "../../utils/render";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-icon" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg data-testid="refresh-icon" className={className} />
  ),
}));

// Mock Link component
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ClaimFundsError", () => {
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display the error heading", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <ClaimFundsError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should display a descriptive message", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <ClaimFundsError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(
      screen.getByText("We encountered an error loading claim funds. Please try again.")
    ).toBeInTheDocument();
  });

  it("should display error digest when present", () => {
    const error = Object.assign(new Error("Test"), {
      digest: "ERR_CLAIM_123",
    });

    renderWithProviders(<ClaimFundsError error={error} reset={reset} />);

    expect(screen.getByText("Error ID: ERR_CLAIM_123")).toBeInTheDocument();
  });

  it("should not display error digest when absent", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <ClaimFundsError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("should call reset when Try again button is clicked", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <ClaimFundsError error={error as Error & { digest?: string }} reset={reset} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("should render the Go home link pointing to root", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <ClaimFundsError error={error as Error & { digest?: string }} reset={reset} />
    );

    const link = screen.getByText("Go home");
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("should render the alert triangle icon", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <ClaimFundsError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
  });
});
