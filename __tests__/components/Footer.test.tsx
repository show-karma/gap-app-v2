import { render, screen } from "@testing-library/react";
import { Footer } from "@/src/components/footer/footer";
import "@testing-library/jest-dom/vitest";

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

vi.mock("@/components/Icons/Paragraph", () => ({
  ParagraphIcon: (props: any) => (
    <svg {...props} data-testid="paragraph-icon" aria-label="Paragraph" />
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
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });

    it("should render logo", () => {
      render(<Footer />);

      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("should render newsletter component", () => {
      render(<Footer />);

      expect(screen.getByTestId("newsletter")).toBeInTheDocument();
    });
  });

  describe("Navigation Links", () => {
    it("should render all navigation links as clickable", () => {
      render(<Footer />);

      const navLinks = ["For Builders", "For Funders", "Blog", "Guide", "API Docs", "Governance"];

      navLinks.forEach((linkText) => {
        const link = screen.getByText(linkText);
        expect(link.closest("a")).toHaveAttribute("href");
      });
    });

    it("should have navigation landmark", () => {
      render(<Footer />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });
  });

  describe("Social Media Links", () => {
    it("should render all social media icons", () => {
      render(<Footer />);

      expect(screen.getByTestId("twitter-icon")).toBeInTheDocument();
      expect(screen.getByTestId("discord-icon")).toBeInTheDocument();
      expect(screen.getByTestId("telegram-icon")).toBeInTheDocument();
      expect(screen.getByTestId("paragraph-icon")).toBeInTheDocument();
    });

    it("should have aria-labels for accessibility", () => {
      render(<Footer />);

      const links = screen.getAllByRole("link");
      const socialLinks = links.filter((link) =>
        ["Twitter", "Discord", "Telegram", "Paragraph"].includes(
          link.getAttribute("aria-label") || ""
        )
      );

      expect(socialLinks.length).toBe(4);
    });
  });

  describe("Legal Links", () => {
    it("should render all legal links as clickable", () => {
      render(<Footer />);

      const legalLinks = ["Terms", "Privacy"];

      legalLinks.forEach((linkText) => {
        const link = screen.getByText(linkText);
        expect(link.closest("a")).toHaveAttribute("href");
      });
    });
  });

  describe("Copyright", () => {
    it("should display current year in copyright", () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`\u00A9 ${currentYear} Karma. All rights reserved.`)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic footer element", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer.tagName).toBe("FOOTER");
    });

    it("should have external links with proper attributes", () => {
      render(<Footer />);

      const blogLink = screen.getByText("Blog").closest("a");
      expect(blogLink).toHaveAttribute("target", "_blank");
      expect(blogLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should have aria-labels for icon-only links", () => {
      render(<Footer />);

      const links = screen.getAllByRole("link");
      const iconLinks = links.filter(
        (link) => !link.textContent?.trim() && link.getAttribute("aria-label")
      );

      expect(iconLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle year transition correctly", () => {
      const mockDate = new Date("2025-01-01");
      vi.spyOn(global, "Date").mockImplementation(() => mockDate as any);

      render(<Footer />);

      expect(screen.getByText("\u00A9 2025 Karma. All rights reserved.")).toBeInTheDocument();

      vi.restoreAllMocks();
    });

    it("should maintain structure with all links present", () => {
      render(<Footer />);

      const allLinks = screen.getAllByRole("link");
      // 6 navigation + 2 legal + 4 social = 12 links
      expect(allLinks.length).toBeGreaterThanOrEqual(12);
    });
  });
});
