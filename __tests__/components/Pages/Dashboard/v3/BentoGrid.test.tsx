import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BentoGrid } from "@/components/Pages/Dashboard/v3/BentoGrid";
import type { DashModule } from "@/components/Pages/Dashboard/v3/module";

// The route Link resolves hrefs through a url builder / community context that
// isn't relevant here — render it as a plain anchor so we can assert the href.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

const makeModule = (
  key: string,
  label: string,
  status: DashModule["status"] = "ready"
): DashModule => ({
  key,
  label,
  icon: "rocket",
  status,
  summary: { big: 3, rows: [] },
  empty: { prompt: "", cta: { label: "" } },
  render: () => <div>{label} DETAIL</div>,
});

describe("BentoGrid (route-based overview)", () => {
  it("renders one link per module pointing at /dashboard/[module]", () => {
    const modules = [makeModule("projects", "My projects"), makeModule("reviews", "My reviews")];
    render(<BentoGrid modules={modules} />);

    const projects = screen.getByRole("link", { name: /My projects/i });
    const reviews = screen.getByRole("link", { name: /My reviews/i });
    expect(projects).toHaveAttribute("href", "/dashboard/projects");
    expect(reviews).toHaveAttribute("href", "/dashboard/reviews");
    // The overview never renders a module's drill-in content — only the tiles.
    expect(screen.queryByText(/DETAIL/)).not.toBeInTheDocument();
  });

  it("renders a loading tile as a non-link (nothing to navigate to yet)", () => {
    render(<BentoGrid modules={[makeModule("communities", "My communities", "loading")]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(document.querySelector('[data-comment-anchor="tile-communities"]')).toBeInTheDocument();
  });
});
