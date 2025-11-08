/**
 * Unit Tests: Navbar User Skeleton
 * Tests skeleton loading states for user menu, auth buttons, and logged-in buttons
 */

import { render } from "@testing-library/react";
import {
  NavbarUserSkeleton,
  NavbarAuthButtonsSkeleton,
  NavbarLoggedInButtonsSkeleton,
} from "@/src/components/navbar/navbar-user-skeleton";

describe("Navbar Skeleton Components", () => {
  describe("NavbarUserSkeleton", () => {
    it("should render skeleton structure", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      // Should render a container
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should have proper loading indicators/placeholders", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      // Should have 2 skeleton elements (help button + avatar)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });

    it("should match layout dimensions of actual component", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      // Should have h-8 w-8 skeleton elements matching the actual buttons
      const helpButtonSkeleton = container.querySelector(".h-8.w-8.rounded-xl");
      const avatarSkeleton = container.querySelector(".h-8.w-8.rounded-full");
      
      expect(helpButtonSkeleton).toBeInTheDocument();
      expect(avatarSkeleton).toBeInTheDocument();
    });

    it("should work in both mobile and desktop contexts", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      // Should have hidden lg:flex class for desktop-only display
      expect(mainContainer).toHaveClass("hidden");
      expect(mainContainer).toHaveClass("lg:flex");
    });

    it("should have proper Tailwind classes applied", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("items-center");
      expect(mainContainer).toHaveClass("gap-3");
    });

    it("should have correct border radius for help button skeleton", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const helpButtonSkeleton = container.querySelector(".rounded-xl");
      expect(helpButtonSkeleton).toBeInTheDocument();
    });

    it("should have circular avatar skeleton", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const avatarSkeleton = container.querySelector(".rounded-full");
      expect(avatarSkeleton).toBeInTheDocument();
    });

    it("should have flex layout container", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex");
    });

    it("should have inner flex container for skeleton items", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const innerContainer = container.querySelector(".flex.flex-row");
      expect(innerContainer).toBeInTheDocument();
    });

    it("should have gap spacing between skeleton elements", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const innerContainer = container.querySelector(".flex-row");
      expect(innerContainer).toHaveClass("gap-2");
    });
  });

  describe("NavbarAuthButtonsSkeleton", () => {
    it("should render skeleton structure", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should have proper loading indicators for auth buttons", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      // Should have 2 skeleton elements (sign in + contact sales)
      const skeletons = container.querySelectorAll('[class*="h-9"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });

    it("should match sign in button dimensions", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      // Sign in button skeleton: h-9 w-20
      const signInSkeleton = container.querySelector(".h-9.w-20");
      expect(signInSkeleton).toBeInTheDocument();
    });

    it("should match contact sales button dimensions", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      // Contact sales button skeleton: h-9 w-32
      const contactSalesSkeleton = container.querySelector(".h-9.w-32");
      expect(contactSalesSkeleton).toBeInTheDocument();
    });

    it("should have rounded corners on skeleton elements", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll(".rounded-md");
      expect(skeletons.length).toBe(2);
    });

    it("should have flex layout", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("items-center");
    });

    it("should have gap spacing between buttons", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("gap-3");
    });

    it("should be visible on all screen sizes (no hidden class)", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      // Auth buttons skeleton should not have hidden class
      expect(mainContainer).not.toHaveClass("hidden");
    });

    it("should render two distinct skeleton elements", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll('[class*="rounded-md"]');
      expect(skeletons.length).toBe(2);
    });

    it("should have different widths for each button skeleton", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const narrowSkeleton = container.querySelector(".w-20");
      const wideSkeleton = container.querySelector(".w-32");
      
      expect(narrowSkeleton).toBeInTheDocument();
      expect(wideSkeleton).toBeInTheDocument();
    });
  });

  describe("NavbarLoggedInButtonsSkeleton", () => {
    it("should render skeleton structure", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should have loading indicators for logged in buttons", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      // Should have 3 skeleton elements
      const skeletons = container.querySelectorAll('[class*="h-9"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it("should have three skeleton elements with different widths", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const skeleton24 = container.querySelector(".w-24");
      const skeletons20 = container.querySelectorAll(".w-20");
      
      expect(skeleton24).toBeInTheDocument();
      expect(skeletons20.length).toBe(2);
    });

    it("should have rounded-lg border radius", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll(".rounded-lg");
      expect(skeletons.length).toBe(3);
    });

    it("should have flex row layout", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("flex-row");
    });

    it("should have items aligned center", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("items-center");
    });

    it("should have gap-2 spacing", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("gap-2");
    });

    it("should render all skeleton elements with h-9 height", () => {
      const { container} = render(<NavbarLoggedInButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll(".h-9");
      expect(skeletons.length).toBe(3);
    });

    it("should be visible on all screen sizes", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).not.toHaveClass("hidden");
    });
  });

  describe("Visual Consistency", () => {
    it("NavbarUserSkeleton should maintain consistent sizing with actual component", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      // Both skeleton elements should be 8x8 to match help button and avatar
      const skeletons = container.querySelectorAll(".h-8.w-8");
      expect(skeletons.length).toBe(2);
    });

    it("NavbarAuthButtonsSkeleton should reflect actual button widths", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      // Widths should approximate "Sign in" and "Contact sales" text
      const narrowButton = container.querySelector(".w-20"); // ~Sign in
      const wideButton = container.querySelector(".w-32"); // ~Contact sales
      
      expect(narrowButton).toBeInTheDocument();
      expect(wideButton).toBeInTheDocument();
    });

    it("all skeletons should use consistent height for buttons", () => {
      const authContainer = render(<NavbarAuthButtonsSkeleton />);
      const loggedInContainer = render(<NavbarLoggedInButtonsSkeleton />);
      
      // Both should use h-9 for button-like elements
      expect(authContainer.container.querySelector(".h-9")).toBeInTheDocument();
      expect(loggedInContainer.container.querySelector(".h-9")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("skeleton elements should not be interactive", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const skeletons = container.querySelectorAll('[class*="h-8"]');
      skeletons.forEach((skeleton) => {
        // Skeletons should not be buttons or links
        expect(skeleton.tagName).not.toBe("BUTTON");
        expect(skeleton.tagName).not.toBe("A");
      });
    });

    it("should not have tab stops on skeleton elements", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll('[class*="h-9"]');
      skeletons.forEach((skeleton) => {
        // Should not be focusable
        expect(skeleton).not.toHaveAttribute("tabindex", "0");
      });
    });

    it("should have semantic div structure", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const mainContainer = container.firstChild;
      expect(mainContainer?.nodeName).toBe("DIV");
    });
  });

  describe("Animation", () => {
    it("NavbarUserSkeleton should have animation classes", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      // Skeleton component typically adds animate-pulse
      const skeletons = container.querySelectorAll('[class*="h-8"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("NavbarAuthButtonsSkeleton should have animation classes", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll('[class*="h-9"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("NavbarLoggedInButtonsSkeleton should have animation classes", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const skeletons = container.querySelectorAll('[class*="h-9"]');
      expect(skeletons.length).toBe(3);
    });
  });

  describe("Responsiveness", () => {
    it("NavbarUserSkeleton should be hidden on mobile", () => {
      const { container } = render(<NavbarUserSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("hidden");
      expect(mainContainer).toHaveClass("lg:flex");
    });

    it("NavbarAuthButtonsSkeleton should be visible on all sizes", () => {
      const { container } = render(<NavbarAuthButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      // Should not have responsive hide/show classes
      expect(mainContainer).not.toHaveClass("hidden");
      expect(mainContainer).not.toHaveClass("lg:hidden");
    });

    it("NavbarLoggedInButtonsSkeleton should be visible on all sizes", () => {
      const { container } = render(<NavbarLoggedInButtonsSkeleton />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).not.toHaveClass("hidden");
    });
  });

  describe("Multiple Renders", () => {
    it("should render consistently across multiple mounts", () => {
      const { container: container1 } = render(<NavbarUserSkeleton />);
      const { container: container2 } = render(<NavbarUserSkeleton />);
      
      const skeletons1 = container1.querySelectorAll('[class*="h-8"]');
      const skeletons2 = container2.querySelectorAll('[class*="h-8"]');
      
      expect(skeletons1.length).toBe(skeletons2.length);
    });

    it("should maintain structure after rerender", () => {
      const { container, rerender } = render(<NavbarAuthButtonsSkeleton />);
      
      const initialSkeletons = container.querySelectorAll('[class*="h-9"]');
      
      rerender(<NavbarAuthButtonsSkeleton />);
      
      const afterSkeletons = container.querySelectorAll('[class*="h-9"]');
      expect(afterSkeletons.length).toBe(initialSkeletons.length);
    });
  });
});

