import { render, screen } from "@testing-library/react";
import { Footer } from "@/src/components/footer/footer";
import "@testing-library/jest-dom";

// The copyright year is a prop now: it is read once at module scope on the
// server (see src/components/footer/copyright-year.ts) and threaded down, so
// the footer itself never touches the clock. Any fixed value proves the render.
const COPYRIGHT_YEAR = 2031;

// Mock next/dynamic so that dynamic imports resolve synchronously in tests
vi.mock("next/dynamic", () => ({
  default: (fn: () => Promise<any>) => {
    const Component = (props: any) => {
      // Render the mock Newsletter directly
      return <div data-testid="newsletter">Newsletter Signup</div>;
    };
    return Component;
  },
}));

// Mock child components
vi.mock("@/src/components/shared/logo", () => ({
  Logo: () => <div data-testid="logo">Karma</div>,
}));

vi.mock("@/src/components/footer/newsletter", () => ({
  Newsletter: () => <div data-testid="newsletter">Newsletter Signup</div>,
}));

// Mock icons
vi.mock("@/components/Icons", () => ({
  TwitterIcon: (props: any) => <svg {...props} data-testid="twitter-icon" aria-label="Twitter" />,
  DiscordIcon: (props: any) => <svg {...props} data-testid="discord-icon" aria-label="Discord" />,
  TelegramIcon: (props: any) => (
    <svg {...props} data-testid="telegram-icon" aria-label="Telegram" />
  ),
}));

// Mock ExternalLink component
vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  describe("Rendering", () => {
    it("should render footer element", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });

    it("should render logo", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("should render newsletter component", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByTestId("newsletter")).toBeInTheDocument();
    });

    it("should have proper background", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("bg-background");
    });

    it("should have full width", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("w-full");
    });
  });

  describe("Navigation Links", () => {
    it("should render For Projects link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("For Projects")).toBeInTheDocument();
    });

    it("should render For Funders link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("For Funders")).toBeInTheDocument();
    });

    it("should render Blog link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("Blog")).toBeInTheDocument();
    });

    it("should render Guide link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("Guide")).toBeInTheDocument();
    });

    it("should render API Docs link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("API Docs")).toBeInTheDocument();
    });

    it("should render Governance link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("Governance")).toBeInTheDocument();
    });

    it("should have navigation landmark", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("should have proper link styling", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const link = screen.getByText("For Projects");
      expect(link.className).toContain("text-muted-foreground");
      expect(link.className).toContain("hover:text-foreground");
    });
  });

  describe("Social Media Links", () => {
    it("should render Twitter icon", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByTestId("twitter-icon")).toBeInTheDocument();
    });

    it("should render Discord icon", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByTestId("discord-icon")).toBeInTheDocument();
    });

    it("should render Telegram icon", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByTestId("telegram-icon")).toBeInTheDocument();
    });

    it("should not render a Paragraph icon (Blog moved to internal navigation)", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.queryByTestId("paragraph-icon")).not.toBeInTheDocument();
    });

    it("should have proper icon sizing", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const twitterIcon = screen.getByTestId("twitter-icon");
      expect(twitterIcon).toHaveClass("w-6", "h-6");
    });

    it("should have aria-labels for accessibility", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const links = screen.getAllByRole("link");
      const socialLinks = links.filter((link) =>
        ["Twitter", "Discord", "Telegram"].includes(link.getAttribute("aria-label") || "")
      );

      expect(socialLinks.length).toBe(3);
    });
  });

  describe("Legal Links", () => {
    it("should render Terms link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("Terms")).toBeInTheDocument();
    });

    it("should render Privacy link", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    it("should have proper legal link styling", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const termsLink = screen.getByText("Terms");
      expect(termsLink.className).toContain("text-muted-foreground");
      expect(termsLink.className).toContain("hover:text-foreground");
    });
  });

  describe("Copyright", () => {
    it("should display the year it is given in copyright", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(screen.getByText(new RegExp(`© ${COPYRIGHT_YEAR} Karma`))).toBeInTheDocument();
    });

    it("should display full copyright text", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(
        screen.getByText(`© ${COPYRIGHT_YEAR} Karma. All rights reserved.`)
      ).toBeInTheDocument();
    });

    it("should have proper copyright styling", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const copyright = screen.getByText(`© ${COPYRIGHT_YEAR} Karma. All rights reserved.`);

      expect(copyright).toHaveClass("text-muted-foreground");
      expect(copyright.tagName).toBe("P");
    });
  });

  describe("Layout Structure", () => {
    it("should have centered layout", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("flex", "flex-col", "items-center", "justify-center");
    });

    it("should have max-width container", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const maxWidthContainer = container.querySelector(".max-w-\\[1920px\\]");
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it("should have proper padding", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const paddedContainer = container.querySelector(".py-12");
      expect(paddedContainer).toBeInTheDocument();
    });

    it("should have horizontal divider", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const hr = container.querySelector("hr");
      expect(hr).toBeInTheDocument();
      expect(hr).toHaveClass("w-full", "h-[1px]", "bg-border");
    });

    it("should have responsive flexbox layout", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const responsiveContainer = container.querySelector(".lg\\:flex-row");
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should hide newsletter on small screens", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      // Newsletter is wrapped in a div with hidden and lg:block classes
      const newsletterContainer = container.querySelector(".lg\\:block.hidden");
      expect(newsletterContainer).toBeInTheDocument();
    });

    it("should have responsive navigation layout", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("flex", "flex-col", "md:flex-row");
    });

    it("should have responsive bottom section layout", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      // Find the container with legal links and copyright
      const bottomSection = container.querySelector(".sm\\:flex-row");
      expect(bottomSection).toBeInTheDocument();
    });

    it("should have responsive gap spacing", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const gapContainer = container.querySelector(".gap-x-6");
      expect(gapContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic footer element", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const footer = screen.getByRole("contentinfo");
      expect(footer.tagName).toBe("FOOTER");
    });

    it("should have navigation landmark", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const nav = screen.getByRole("navigation");
      expect(nav.tagName).toBe("NAV");
    });

    it("should have external links with proper attributes", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const guideLink = screen.getByText("Guide").closest("a");
      expect(guideLink).toHaveAttribute("target", "_blank");
      expect(guideLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should render Blog as an internal link, not an external one", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const blogLink = screen.getByText("Blog").closest("a");
      expect(blogLink).toHaveAttribute("href", "/blog");
      expect(blogLink).not.toHaveAttribute("target", "_blank");
    });

    it("should have aria-labels for icon-only links", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const links = screen.getAllByRole("link");
      const iconLinks = links.filter(
        (link) => !link.textContent?.trim() && link.getAttribute("aria-label")
      );

      expect(iconLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Dark Mode Support", () => {
    it("should use theme-aware colors", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("bg-background");
    });

    it("should use muted foreground for secondary text", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const link = screen.getByText("For Projects");
      expect(link.className).toContain("text-muted-foreground");
    });

    it("should have border using theme colors", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const hr = container.querySelector("hr");
      expect(hr).toHaveClass("bg-border");
    });
  });

  describe("Link Types", () => {
    it("should distinguish between internal and external links", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const buildersLink = screen.getByText("For Projects");
      const guideLink = screen.getByText("Guide");
      const blogLink = screen.getByText("Blog");

      // Guide is external, should have target="_blank"
      expect(guideLink.closest("a")).toHaveAttribute("target", "_blank");

      // Blog and For Projects are internal — no target="_blank"
      expect(blogLink.closest("a")).not.toHaveAttribute("target", "_blank");
      const buildersAnchor = buildersLink.closest("a");
      expect(buildersAnchor).toBeInTheDocument();
      expect(buildersAnchor).not.toHaveAttribute("target", "_blank");
    });

    it("should render all navigation links as clickable", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const navLinks = ["For Projects", "For Funders", "Blog", "Guide", "API Docs", "Governance"];

      navLinks.forEach((linkText) => {
        const link = screen.getByText(linkText);
        expect(link.closest("a")).toHaveAttribute("href");
      });
    });

    it("should render all legal links as clickable", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const legalLinks = ["Terms", "Privacy"];

      legalLinks.forEach((linkText) => {
        const link = screen.getByText(linkText);
        expect(link.closest("a")).toHaveAttribute("href");
      });
    });
  });

  describe("Styling Consistency", () => {
    it("should have consistent font sizes", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const buildersLink = screen.getByText("For Projects");
      const termsLink = screen.getByText("Terms");

      expect(buildersLink).toHaveClass("text-sm");
      expect(termsLink).toHaveClass("text-sm");
    });

    it("should have consistent hover states", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const links = [
        screen.getByText("For Projects"),
        screen.getByText("Blog"),
        screen.getByText("Terms"),
      ];

      links.forEach((link) => {
        expect(link.className).toContain("hover:text-foreground");
        expect(link.className).toContain("transition-colors");
      });
    });

    it("should maintain spacing consistency", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("gap-x-6", "gap-y-2");
    });
  });

  describe("Edge Cases", () => {
    it("does not read the clock — the injected year wins over the system date", () => {
      // The regression this pins: `new Date()` during render is an unstable
      // value under cacheComponents, and the footer is global chrome, so that
      // one read stopped 79 routes from prerendering. If someone reintroduces
      // it here, the rendered year follows the fake clock and this fails.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-01"));

      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(
        screen.getByText(`© ${COPYRIGHT_YEAR} Karma. All rights reserved.`)
      ).toBeInTheDocument();
      expect(screen.queryByText("© 2025 Karma. All rights reserved.")).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("should render all components without errors", () => {
      const { container } = render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      expect(container.querySelector("footer")).toBeInTheDocument();
      expect(screen.getByTestId("logo")).toBeInTheDocument();
      expect(screen.getByTestId("newsletter")).toBeInTheDocument();
    });

    it("should maintain structure with all links present", () => {
      render(<Footer copyrightYear={COPYRIGHT_YEAR} />);

      const allLinks = screen.getAllByRole("link");
      // 9 navigation + 2 legal + 3 social (Paragraph removed, Blog moved to
      // internal navigation) links, at minimum.
      expect(allLinks.length).toBeGreaterThanOrEqual(11);
    });
  });
});
