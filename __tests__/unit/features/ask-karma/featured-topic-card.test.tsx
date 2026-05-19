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
