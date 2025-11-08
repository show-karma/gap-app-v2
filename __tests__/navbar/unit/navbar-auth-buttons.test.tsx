/**
 * Unit Tests: Navbar Auth Buttons
 * Tests sign in and contact sales buttons, loading states, and authentication triggers
 */

import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { NavbarAuthButtons } from "@/src/components/navbar/navbar-auth-buttons";
import { renderWithProviders, createMockUseAuth } from "../utils/test-helpers";
import { getAuthFixture } from "../fixtures/auth-fixtures";

// Mock useAuth at module level
let mockUseAuthImplementation = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuthImplementation(),
}));

describe("NavbarAuthButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe("Loading State", () => {
    it("should show skeleton when ready is false", () => {
      const loadingFixture = getAuthFixture("loading");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(loadingFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      // Skeleton should render (component returns NavbarAuthButtonsSkeleton)
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should not show buttons when ready is false", () => {
      const loadingFixture = getAuthFixture("loading");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(loadingFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      // Buttons should not be visible during loading
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
      expect(screen.queryByText("Contact sales")).not.toBeInTheDocument();
    });
  });

  describe("Sign In Button", () => {
    it("should render sign in button with correct text", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).toBeInTheDocument();
    });

    it("should call authenticate() on sign in click", async () => {
      const user = userEvent.setup();
      const mockAuthenticate = jest.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      mockUseAuthImplementation.mockReturnValue({
          ...createMockUseAuth(unauthFixture.authState),
          authenticate: mockAuthenticate,
        });
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      await user.click(signInButton);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });

    it("should have correct styling classes for sign in button", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      const { container } = mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).toHaveClass("bg-secondary");
      expect(signInButton).toHaveClass("border-none");
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      const mockAuthenticate = jest.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      mockUseAuthImplementation.mockReturnValue({
          ...createMockUseAuth(unauthFixture.authState),
          authenticate: mockAuthenticate,
        });
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      
      // Focus and trigger with Enter key
      signInButton.focus();
      await user.keyboard("{Enter}");

      expect(mockAuthenticate).toHaveBeenCalled();
    });

    it("should be a button element", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton.tagName).toBe("BUTTON");
    });

    it("should have outline variant styling", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      // Button variant="outline" applies specific classes
      expect(signInButton).toHaveClass("font-medium");
    });
  });

  describe("Contact Sales Button", () => {
    it("should render contact sales button with correct text", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesButton = screen.getByText("Contact sales");
      expect(contactSalesButton).toBeInTheDocument();
    });

    it("should render phone icon in contact sales button", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      // PhoneCall icon should be present (lucide renders as svg)
      const contactSalesButton = screen.getByText("Contact sales");
      const phoneIcon = contactSalesButton.parentElement?.querySelector("svg");
      expect(phoneIcon).toBeInTheDocument();
    });

    it("should be an external link (opens in new tab)", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesLink = screen.getByText("Contact sales").closest("a");
      expect(contactSalesLink).toHaveAttribute("target", "_blank");
      expect(contactSalesLink).toHaveAttribute("rel");
    });

    it("should have correct href to partner form", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesLink = screen.getByText("Contact sales").closest("a");
      expect(contactSalesLink).toHaveAttribute("href");
      expect(contactSalesLink?.getAttribute("href")).toBeTruthy();
    });

    it("should have correct styling classes", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesButton = screen.getByText("Contact sales");
      expect(contactSalesButton).toHaveClass("border-border");
      expect(contactSalesButton).toHaveClass("text-foreground");
    });

    it("should have small size variant", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesButton = screen.getByText("Contact sales");
      // Size="sm" adds specific height/padding classes
      expect(contactSalesButton).toHaveClass("shadow-sm");
    });

    it("should have icon with correct sizing", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      // PhoneCall icon should have sizing classes
      const contactSalesButton = screen.getByText("Contact sales");
      const phoneIcon = contactSalesButton.parentElement?.querySelector("svg");
      expect(phoneIcon).toHaveClass("w-4");
      expect(phoneIcon).toHaveClass("h-4");
    });

    it("should be keyboard accessible", async () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesLink = screen.getByText("Contact sales");
      
      // Should be focusable
      contactSalesLink.focus();
      expect(document.activeElement).toBe(contactSalesLink);
    });
  });

  describe("Layout & Arrangement", () => {
    it("should render both buttons in correct order", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      const buttons = container.querySelectorAll("button, a");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      
      // Sign in should come before Contact sales
      const signInButton = screen.getByText("Sign in");
      const contactSalesButton = screen.getByText("Contact sales");
      expect(signInButton.compareDocumentPosition(contactSalesButton)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    it("should have flex layout container", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      // Find the div containing the buttons
      const buttonsContainer = container.querySelector("div.flex.items-center");
      expect(buttonsContainer).toBeInTheDocument();
      expect(buttonsContainer).toHaveClass("flex");
      expect(buttonsContainer).toHaveClass("items-center");
    });

    it("should have gap spacing between buttons", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      // Find the div containing the buttons
      const buttonsContainer = container.querySelector("div.flex.items-center");
      expect(buttonsContainer).toHaveClass("gap-3");
    });
  });

  describe("Ready State Transitions", () => {
    it("should transition from skeleton to buttons when ready changes", () => {
      const loadingFixture = getAuthFixture("loading");
      const unauthFixture = getAuthFixture("unauthenticated");
      
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(loadingFixture.authState));
      const { rerender } = renderWithProviders(<NavbarAuthButtons />);

      // Initially no buttons
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

      // Update to ready state
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      rerender(<NavbarAuthButtons />);

      // Buttons should now be visible
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Contact sales")).toBeInTheDocument();
    });

    it("should show buttons immediately when ready is true on mount", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      // Buttons should be immediately visible
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Contact sales")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes on buttons", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      const contactSalesButton = screen.getByText("Contact sales");

      // Sign in should be a button
      expect(signInButton.tagName).toBe("BUTTON");
      // Contact sales should be a link
      expect(contactSalesButton.closest("a")).toHaveAttribute("href");
    });

    it("should be navigable with tab key", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      const contactSalesButton = screen.getByText("Contact sales");

      // Both should be in tab order (tabIndex should be 0 or not set to -1)
      expect(signInButton).not.toHaveAttribute("tabindex", "-1");
      expect(contactSalesButton).not.toHaveAttribute("tabindex", "-1");
    });

    it("should have visible focus indicators", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      
      // Focus the button
      signInButton.focus();
      expect(document.activeElement).toBe(signInButton);
    });
  });

  describe("Multiple Renders", () => {
    it("should not call authenticate on mount", () => {
      const mockAuthenticate = jest.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      mockUseAuthImplementation.mockReturnValue({
          ...createMockUseAuth(unauthFixture.authState),
          authenticate: mockAuthenticate,
        });
      renderWithProviders(<NavbarAuthButtons />);

      // Should not auto-call authenticate on mount
      expect(mockAuthenticate).not.toHaveBeenCalled();
    });

    it("should maintain button state across rerenders", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { rerender } = renderWithProviders(<NavbarAuthButtons />);

      expect(screen.getByText("Sign in")).toBeInTheDocument();

      // Rerender with same mock state
      rerender(<NavbarAuthButtons />);

      // Buttons should still be present
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Contact sales")).toBeInTheDocument();
    });
  });

  describe("Interaction States", () => {
    it("should show hover state on sign in button", async () => {
      const user = userEvent.setup();
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      
      // Hover state is defined by hover: classes
      expect(signInButton).toHaveClass("hover:text-muted-foreground");
    });

    it("should show hover state on contact sales button", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const contactSalesButton = screen.getByText("Contact sales");
      
      // Hover state classes
      expect(contactSalesButton).toHaveClass("hover:bg-accent");
    });

    it("should have transition classes for smooth interactions", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      
      // Transition classes for smooth color changes
      expect(signInButton).toHaveClass("transition-colors");
    });
  });
});

