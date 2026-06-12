import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GrantCompletedButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantCompletedButton";
import "@testing-library/jest-dom";

// Mock Spinner
vi.mock("@/components/ui/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      Loading...
    </div>
  ),
}));

// Mock Heroicons
vi.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
  XCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="x-circle-icon" className={className} />
  ),
}));

describe("GrantCompletedButton", () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #1609: unauthorized viewers must NOT see the misleading "revoke" affordance.
  describe("when the viewer is NOT authorized", () => {
    it("renders a non-interactive status badge, not a button", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={false}
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows the completion status text", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={false}
        />
      );

      expect(screen.getByText("Marked as complete")).toBeInTheDocument();
    });

    it("does NOT render the 'Revoke completion' affordance or its aria-label", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={false}
        />
      );

      expect(screen.queryByText("Revoke completion")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Revoke grant completion")).not.toBeInTheDocument();
      expect(screen.queryByTestId("x-circle-icon")).not.toBeInTheDocument();
    });

    it("does not call onClick (no interactive element)", async () => {
      const user = userEvent.setup();
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={false}
        />
      );

      await user.click(screen.getByRole("status"));
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("when the viewer IS authorized", () => {
    it("renders an interactive revoke button", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-label", "Revoke grant completion");
      expect(button).toHaveAttribute("title", "Click to revoke grant completion");
    });

    it("shows the hover-swap revoke affordance", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      );

      const defaultText = screen.getByText("Marked as complete");
      expect(defaultText).toHaveClass("group-hover:hidden");
      const hoverText = screen.getByText("Revoke completion");
      expect(hoverText).toHaveClass("hidden", "group-hover:inline");
      expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument();
    });

    it("calls onClick when clicked and not disabled", async () => {
      const user = userEvent.setup();
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      );

      await user.click(screen.getByRole("button"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={true}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      await user.click(button);
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("shows the spinner while revoking", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={true}
          isAuthorized={true}
        />
      );

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.getByText("Revoking...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });
  });
});
