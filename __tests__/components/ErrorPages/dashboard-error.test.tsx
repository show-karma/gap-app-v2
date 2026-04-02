/**
 * Tests for app/dashboard/error.tsx
 *
 * Covers:
 * - Error message displayed
 * - Error digest displayed when present
 * - Reset/Try again button calls the reset callback
 * - Go home link rendered
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardError from "@/app/dashboard/error";
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

describe("DashboardError", () => {
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display the error heading", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DashboardError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should display a description message", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DashboardError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(
      screen.getByText("We encountered an error loading your dashboard. Please try again.")
    ).toBeInTheDocument();
  });

  it("should display error digest when present", () => {
    const error = Object.assign(new Error("Test"), {
      digest: "ERR_DIGEST_456",
    });

    renderWithProviders(<DashboardError error={error} reset={reset} />);

    expect(screen.getByText("Error ID: ERR_DIGEST_456")).toBeInTheDocument();
  });

  it("should not display error digest when absent", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DashboardError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("should call reset when Try again button is clicked", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DashboardError error={error as Error & { digest?: string }} reset={reset} />
    );

    await user.click(screen.getByRole("button", { name: /Try again/ }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("should render the Go home link", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DashboardError error={error as Error & { digest?: string }} reset={reset} />
    );

    const link = screen.getByText("Go home");
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("should render the alert icon", () => {
    const error = Object.assign(new Error("Test"), { digest: undefined });

    renderWithProviders(
      <DashboardError error={error as Error & { digest?: string }} reset={reset} />
    );

    expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
  });
});
