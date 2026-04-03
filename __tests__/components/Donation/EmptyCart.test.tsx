/**
 * Tests for EmptyCart component
 *
 * Covers:
 * - Renders empty state message and CTA
 * - Browse Projects button triggers callback
 * - Accessibility (data-testid, button semantics)
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyCart } from "@/components/Donation/EmptyCart";
import { renderWithProviders } from "../../utils/render";

describe("EmptyCart", () => {
  const onBrowseProjects = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success state", () => {
    it("should render the empty cart message", () => {
      renderWithProviders(<EmptyCart onBrowseProjects={onBrowseProjects} />);

      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
      expect(
        screen.getByText("Add some projects to your donation cart to get started")
      ).toBeInTheDocument();
    });

    it("should render the Browse Projects button", () => {
      renderWithProviders(<EmptyCart onBrowseProjects={onBrowseProjects} />);

      const button = screen.getByRole("button", { name: "Browse Projects" });
      expect(button).toBeInTheDocument();
    });

    it("should have the empty-cart data-testid", () => {
      renderWithProviders(<EmptyCart onBrowseProjects={onBrowseProjects} />);

      expect(screen.getByTestId("empty-cart")).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should call onBrowseProjects when Browse Projects button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<EmptyCart onBrowseProjects={onBrowseProjects} />);

      await user.click(screen.getByRole("button", { name: "Browse Projects" }));

      expect(onBrowseProjects).toHaveBeenCalledTimes(1);
    });
  });
});
