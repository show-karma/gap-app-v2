/**
 * ProgramBanner Component Tests
 * Tests dark mode theme support for the program banner
 *
 * Bug: The banner has a light-only background (bg-brand-lightblue) and text
 * colors (text-brand-darkblue) with no dark mode variants, causing invisible
 * text when dark mode is active.
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "test-community" })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === "programId") return "program-123";
      return null;
    }),
  })),
}));

// Mock useCommunityPrograms to return a program matching the programId
jest.mock("@/hooks/usePrograms", () => ({
  useCommunityPrograms: jest.fn(() => ({
    data: [
      {
        programId: "program-123",
        metadata: {
          title: "Test Program",
          description: "A test program description",
          socialLinks: {
            grantsSite: "https://example.com",
          },
        },
      },
    ],
    isLoading: false,
  })),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock ReadMore to expose the markdownClass for inspection
jest.mock("@/utilities/ReadMore", () => ({
  ReadMore: ({ children, markdownClass }: { children: string; markdownClass?: string }) => (
    <div data-testid="read-more" data-markdown-class={markdownClass}>
      {children}
    </div>
  ),
}));

// Mock ExternalLink
jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a data-testid="external-link" href={href}>
      {children}
    </a>
  ),
}));

// Mock ArrowInIcon
jest.mock("@/components/Icons/ArrowIn", () => ({
  ArrowInIcon: ({ className }: { className: string }) => (
    <span data-testid="arrow-icon" className={className} />
  ),
}));

import { ProgramBanner } from "@/components/ProgramBanner";

describe("ProgramBanner", () => {
  describe("dark mode support", () => {
    it("should include dark mode background class on the banner container", () => {
      const { container } = render(<ProgramBanner />);
      const banner = container.firstChild as HTMLElement;

      expect(banner.className).toContain("bg-brand-lightblue");
      expect(banner.className).toContain("dark:bg-zinc-800");
    });

    it("should include dark mode text class on the title", () => {
      render(<ProgramBanner />);
      const title = screen.getByText("Test Program");

      expect(title.className).toContain("text-brand-darkblue");
      expect(title.className).toContain("dark:text-zinc-100");
    });

    it("should include dark mode text class on the markdown content", () => {
      render(<ProgramBanner />);
      const readMore = screen.getByTestId("read-more");
      const markdownClass = readMore.getAttribute("data-markdown-class");

      expect(markdownClass).toContain("text-brand-darkblue");
      expect(markdownClass).toContain("dark:text-zinc-300");
    });
  });

  describe("rendering", () => {
    it("should render the program title", () => {
      render(<ProgramBanner />);
      expect(screen.getByText("Test Program")).toBeInTheDocument();
    });

    it("should render the apply link when grantsSite is provided", () => {
      render(<ProgramBanner />);
      const link = screen.getByTestId("external-link");
      expect(link).toHaveAttribute("href", "https://example.com");
    });
  });
});
