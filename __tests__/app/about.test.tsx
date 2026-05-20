import { render, screen } from "@testing-library/react";
import AboutPage, { metadata } from "@/app/about/page";

describe("app/about/page.tsx", () => {
  it("renders the About Karma H1", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: /about karma/i })).toBeInTheDocument();
  });

  it("includes substantive body content (>500 chars)", () => {
    const { container } = render(<AboutPage />);
    expect(container.textContent?.length ?? 0).toBeGreaterThan(500);
  });

  it("declares the canonical /about path in metadata", () => {
    const canonical = (metadata.alternates?.canonical ?? "") as string;
    expect(canonical).toBe("/about");
  });

  it("links to the MCP setup guide and the For AI Agents landing page", () => {
    render(<AboutPage />);
    const mcpLink = screen.getByRole("link", { name: /mcp setup guide/i });
    const forAgentsLink = screen.getByRole("link", { name: /for ai agents/i });
    expect(mcpLink.getAttribute("href")).toBe("/mcp/connect");
    expect(forAgentsLink.getAttribute("href")).toBe("/for-agents");
  });
});
