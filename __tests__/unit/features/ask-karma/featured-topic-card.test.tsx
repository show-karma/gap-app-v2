import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeaturedTopicCard } from "@/src/features/ask-karma/components/featured-topic-card";
import type { AskKarmaTopic } from "@/src/features/ask-karma/types";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    target,
    rel,
  }: {
    href: string;
    children: React.ReactNode;
    target?: string;
    rel?: string;
  }) => (
    <a href={href} target={target} rel={rel}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild: _asChild,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?: string;
    size?: string;
  }) => <span {...props}>{children}</span>,
}));

const baseTopic: AskKarmaTopic = {
  icon: "dollar",
  title: "Open Funding Rounds",
  description: "Browse active programs",
  links: [{ label: "View open rounds", href: "/funding-opportunities" }],
};

describe("FeaturedTopicCard", () => {
  it("renders title, description, and links", () => {
    render(<FeaturedTopicCard topic={baseTopic} />);
    expect(screen.getByRole("heading", { name: "Open Funding Rounds" })).toBeInTheDocument();
    expect(screen.getByText("Browse active programs")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "View open rounds" });
    expect(link).toHaveAttribute("href", "/funding-opportunities");
  });

  it("marks external links with target and rel attributes", () => {
    render(
      <FeaturedTopicCard
        topic={{
          ...baseTopic,
          links: [{ label: "External", href: "https://example.com", isExternal: true }],
        }}
      />
    );
    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not set target/rel for internal links", () => {
    render(<FeaturedTopicCard topic={baseTopic} />);
    const link = screen.getByRole("link", { name: "View open rounds" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("renders a CTA when provided instead of links", () => {
    render(
      <FeaturedTopicCard
        topic={{
          icon: "trending-up",
          title: "Track Active Projects",
          cta: { label: "View Funded Projects", href: "/projects" },
        }}
      />
    );
    const cta = screen.getByRole("link", { name: "View Funded Projects" });
    expect(cta).toHaveAttribute("href", "/projects");
  });

  it("renders without description if not provided", () => {
    render(<FeaturedTopicCard topic={{ ...baseTopic, description: undefined }} />);
    expect(screen.queryByText("Browse active programs")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open Funding Rounds" })).toBeInTheDocument();
  });

  it("renders a link without href as a muted, non-interactive label", () => {
    render(
      <FeaturedTopicCard
        topic={{
          icon: "dollar",
          title: "Coming Soon Section",
          links: [{ label: "Round 3 Announcement" }, { label: "Selection Committee" }],
        }}
      />
    );
    // No anchors rendered for href-less entries.
    expect(screen.queryByRole("link", { name: "Round 3 Announcement" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Selection Committee" })).not.toBeInTheDocument();
    // Labels still appear so users see the topic, marked as disabled for a11y.
    const round3 = screen.getByText("Round 3 Announcement");
    expect(round3).toHaveAttribute("aria-disabled", "true");
    expect(round3.tagName).toBe("SPAN");
  });

  it("mixes linked and disabled entries in the same topic", () => {
    render(
      <FeaturedTopicCard
        topic={{
          icon: "dollar",
          title: "Round info",
          links: [
            { label: "Round 3 Announcement" },
            { label: "Retro reports", href: "https://example.com/retro", isExternal: true },
          ],
        }}
      />
    );
    expect(screen.getByText("Round 3 Announcement")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Retro reports" })).toHaveAttribute(
      "href",
      "https://example.com/retro"
    );
  });

  it("renders both links and CTA when both provided", () => {
    render(
      <FeaturedTopicCard
        topic={{
          ...baseTopic,
          cta: { label: "View All", href: "/all" },
        }}
      />
    );
    expect(screen.getByRole("link", { name: "View open rounds" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All" })).toBeInTheDocument();
  });
});
