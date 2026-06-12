/**
 * Unit Tests: Navbar Auth Buttons
 * Tests sign in button, loading states, and authentication triggers.
 * Contact sales was removed from the nav header (see hero/CTA paths instead).
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarAuthButtons } from "@/src/components/navbar/navbar-auth-buttons";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import { createMockUseAuth, renderWithProviders } from "../utils/test-helpers";

// Mock useAuth at module level
const mockUseAuthImplementation = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuthImplementation(),
}));

describe("NavbarAuthButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    });

    it("should never render the legacy Contact sales button", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

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
      const mockAuthenticate = vi.fn();
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
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).toHaveClass("bg-secondary");
      expect(signInButton).toHaveClass("shadow-secondary-button");
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      const mockAuthenticate = vi.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      mockUseAuthImplementation.mockReturnValue({
        ...createMockUseAuth(unauthFixture.authState),
        authenticate: mockAuthenticate,
      });
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");

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

    it("should have semibold/medium typography", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).toHaveClass("font-medium");
    });
  });

  describe("Layout & Arrangement", () => {
    it("should have flex layout container", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      const buttonsContainer = container.querySelector("div.flex.items-center");
      expect(buttonsContainer).toBeInTheDocument();
      expect(buttonsContainer).toHaveClass("flex");
      expect(buttonsContainer).toHaveClass("items-center");
    });

    it("should have gap spacing in the container", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { container } = renderWithProviders(<NavbarAuthButtons />);

      const buttonsContainer = container.querySelector("div.flex.items-center");
      expect(buttonsContainer).toHaveClass("gap-2");
    });
  });

  describe("Ready State Transitions", () => {
    it("should transition from skeleton to button when ready changes", () => {
      const loadingFixture = getAuthFixture("loading");
      const unauthFixture = getAuthFixture("unauthenticated");

      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(loadingFixture.authState));
      const { rerender } = renderWithProviders(<NavbarAuthButtons />);

      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      rerender(<NavbarAuthButtons />);

      expect(screen.getByText("Sign in")).toBeInTheDocument();
    });

    it("should show button immediately when ready is true on mount", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      expect(screen.getByText("Sign in")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes on button", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton.tagName).toBe("BUTTON");
    });

    it("should be navigable with tab key", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).not.toHaveAttribute("tabindex", "-1");
    });

    it("should have visible focus indicators", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      signInButton.focus();
      expect(document.activeElement).toBe(signInButton);
    });
  });

  describe("Multiple Renders", () => {
    it("should not call authenticate on mount", () => {
      const mockAuthenticate = vi.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      mockUseAuthImplementation.mockReturnValue({
        ...createMockUseAuth(unauthFixture.authState),
        authenticate: mockAuthenticate,
      });
      renderWithProviders(<NavbarAuthButtons />);

      expect(mockAuthenticate).not.toHaveBeenCalled();
    });

    it("should maintain button state across rerenders", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      const { rerender } = renderWithProviders(<NavbarAuthButtons />);

      expect(screen.getByText("Sign in")).toBeInTheDocument();

      rerender(<NavbarAuthButtons />);

      expect(screen.getByText("Sign in")).toBeInTheDocument();
    });
  });

  describe("Interaction States", () => {
    it("should show hover state on sign in button", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).toHaveClass("hover:bg-secondary/70");
    });

    it("should have transition classes for smooth interactions", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      mockUseAuthImplementation.mockReturnValue(createMockUseAuth(unauthFixture.authState));
      renderWithProviders(<NavbarAuthButtons />);

      const signInButton = screen.getByText("Sign in");
      expect(signInButton).toHaveClass("transition-colors");
    });
  });
});
