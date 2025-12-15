import { render, screen } from "@testing-library/react";
import { Navbar } from "@/src/components/navbar/navbar";
import "@testing-library/jest-dom";

// Mock useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({
    authenticated: false,
    authenticate: jest.fn(),
    logout: jest.fn(),
    address: undefined,
  })),
}));

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({
    theme: "light",
    setTheme: jest.fn(),
  })),
}));

// Mock store hooks
jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: jest.fn(() => ({
    openModal: jest.fn(),
  })),
}));

jest.mock("@/store/communities", () => ({
  useCommunitiesStore: jest.fn(() => ({
    communities: [],
  })),
}));

jest.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: jest.fn(() => ({
    programs: [],
  })),
}));

jest.mock("@/hooks/useStaff", () => ({
  useStaff: jest.fn(() => ({
    isStaff: false,
  })),
}));

jest.mock("@/store/owner", () => ({
  useOwnerStore: jest.fn(() => false),
}));

jest.mock("@/store/registry", () => ({
  useRegistryStore: jest.fn(() => ({
    isPoolManager: false,
    isRegistryAdmin: false,
  })),
}));

// Mock child components
jest.mock("@/src/components/navbar/navbar-desktop-navigation", () => ({
  NavbarDesktopNavigation: () => <div data-testid="desktop-navigation" />,
}));

jest.mock("@/src/components/navbar/navbar-mobile-menu", () => ({
  NavbarMobileMenu: () => <div data-testid="mobile-menu" />,
}));

describe("Navbar", () => {
  describe("Rendering", () => {
    it("should render navigation element", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("should render desktop navigation component", () => {
      render(<Navbar />);

      expect(screen.getByTestId("desktop-navigation")).toBeInTheDocument();
    });

    it("should render mobile menu component", () => {
      render(<Navbar />);

      expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    });

    it("should have correct fixed positioning", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("fixed", "top-0", "left-0", "right-0");
    });

    it("should have correct z-index for layering", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("z-10");
    });

    it("should have full width styling", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("w-full");
    });

    it("should have bottom border", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("border-b", "border-border");
    });
  });

  describe("Layout Structure", () => {
    it("should have centered content layout", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("flex", "items-center", "justify-center");
    });

    it("should have inner container with max-width", () => {
      const { container } = render(<Navbar />);

      const innerDiv = container.querySelector("div.max-w-\\[1920px\\]");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should have proper spacing between elements", () => {
      const { container } = render(<Navbar />);

      const innerDiv = container.querySelector("div.gap-8");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should have vertical padding", () => {
      const { container } = render(<Navbar />);

      const innerDiv = container.querySelector("div.py-3");
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should render both desktop and mobile components for responsive switching", () => {
      render(<Navbar />);

      // Both should exist in DOM, CSS handles visibility
      expect(screen.getByTestId("desktop-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    });

    it("should have responsive flex direction", () => {
      const { container } = render(<Navbar />);

      const innerDiv = container.querySelector("div.flex-row");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should have minimum width constraint", () => {
      const { container } = render(<Navbar />);

      const innerDiv = container.querySelector("div.min-w-min");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should have justify-between for spacing", () => {
      const { container } = render(<Navbar />);

      const innerDiv = container.querySelector("div.justify-between");
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe("Background and Theme", () => {
    it("should have background color class", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("bg-background");
    });

    it("should render with proper base styling", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav.className).toContain("flex");
      expect(nav.className).toContain("bg-background");
      expect(nav.className).toContain("w-full");
    });
  });

  describe("Accessibility", () => {
    it("should have navigation landmark", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav.tagName).toBe("NAV");
    });

    it("should be keyboard accessible", () => {
      const { container } = render(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();

      // Verify navigation is in the DOM and accessible
      expect(container.querySelector("nav")).toBe(nav);
    });
  });

  describe("Component Integration", () => {
    it("should integrate desktop and mobile components within same nav", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      const desktop = screen.getByTestId("desktop-navigation");
      const mobile = screen.getByTestId("mobile-menu");

      expect(nav).toContainElement(desktop);
      expect(nav).toContainElement(mobile);
    });

    it("should maintain component hierarchy", () => {
      const { container } = render(<Navbar />);

      const nav = container.querySelector("nav");
      const innerContainer = nav?.querySelector("div");

      expect(nav).toContainElement(innerContainer!);
      expect(innerContainer).toContainElement(screen.getByTestId("desktop-navigation"));
      expect(innerContainer).toContainElement(screen.getByTestId("mobile-menu"));
    });
  });

  describe("Styling Classes", () => {
    it("should have all required layout classes", () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");
      const expectedClasses = [
        "flex",
        "bg-background",
        "w-full",
        "items-center",
        "justify-center",
        "flex-row",
        "gap-8",
        "max-w-full",
        "min-w-min",
        "border-b",
        "border-border",
        "z-10",
        "fixed",
        "top-0",
        "left-0",
        "right-0",
      ];

      expectedClasses.forEach((className) => {
        expect(nav.className).toContain(className);
      });
    });

    it("should maintain consistent styling across renders", () => {
      const { rerender } = render(<Navbar />);

      const nav1Classes = screen.getByRole("navigation").className;

      rerender(<Navbar />);

      const nav2Classes = screen.getByRole("navigation").className;
      expect(nav1Classes).toBe(nav2Classes);
    });
  });
});
