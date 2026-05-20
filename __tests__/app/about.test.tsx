import { render, screen } from "@testing-library/react";
import AboutPage, { metadata } from "@/app/about/page";

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({ isWhitelabel: false }),
}));

async function renderAboutPage() {
  const element = await AboutPage();
  return render(element);
}

describe("app/about/page.tsx", () => {
  it("renders the About Karma H1", async () => {
    await renderAboutPage();
    expect(screen.getByRole("heading", { level: 1, name: /about karma/i })).toBeInTheDocument();
  });

  it("includes substantive body content (>500 chars)", async () => {
    const { container } = await renderAboutPage();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(500);
  });

  it("declares the canonical /about path in metadata", () => {
    const canonical = (metadata.alternates?.canonical ?? "") as string;
    expect(canonical).toBe("/about");
  });

  it("links to the MCP setup guide and the For AI Agents landing page", async () => {
    await renderAboutPage();
    const mcpLink = screen.getByRole("link", { name: /mcp setup guide/i });
    const forAgentsLink = screen.getByRole("link", { name: /for ai agents/i });
    expect(mcpLink.getAttribute("href")).toBe("/mcp/connect");
    expect(forAgentsLink.getAttribute("href")).toBe("/for-agents");
  });
});

describe("app/about/page.tsx whitelabel gating", () => {
  it("calls notFound() when rendered on a whitelabel tenant", async () => {
    const { getWhitelabelContext } = await import("@/utilities/whitelabel-server");
    (getWhitelabelContext as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      isWhitelabel: true,
    });
    const { notFound } = await import("next/navigation");

    await AboutPage().catch(() => {
      // notFound() throws a NEXT_HTTP_ERROR_FALLBACK; swallow it here.
    });

    expect(notFound).toHaveBeenCalled();
  });
});
