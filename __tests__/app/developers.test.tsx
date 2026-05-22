import { render, screen } from "@testing-library/react";
import DevelopersPage, { metadata } from "@/app/developers/page";

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({ isWhitelabel: false }),
}));

async function renderDevelopersPage() {
  const element = await DevelopersPage();
  return render(element);
}

describe("app/developers/page.tsx", () => {
  it("renders the Karma developer resources H1", async () => {
    await renderDevelopersPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /karma developer resources/i })
    ).toBeInTheDocument();
  });

  it("includes substantive body content (>500 chars)", async () => {
    const { container } = await renderDevelopersPage();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(500);
  });

  it("declares the canonical /developers path in metadata", () => {
    const canonical = (metadata.alternates?.canonical ?? "") as string;
    expect(canonical).toBe("/developers");
  });

  it("mentions karmahq in the meta description for name-based search", () => {
    const description = (metadata.description ?? "") as string;
    expect(description.toLowerCase()).toContain("karmahq");
  });

  it("links to the OpenAPI spec, MCP setup, and OAuth metadata", async () => {
    await renderDevelopersPage();
    const openapiLink = screen.getByRole("link", { name: /karmahq\.xyz\/openapi\.json/i });
    expect(openapiLink.getAttribute("href")).toBe("/openapi.json");

    const mcpLink = screen.getByRole("link", { name: /karmahq\.xyz\/mcp\/connect/i });
    expect(mcpLink.getAttribute("href")).toBe("/mcp/connect");

    const oauthLink = screen.getByRole("link", {
      name: /karmahq\.xyz\/\.well-known\/oauth-protected-resource/i,
    });
    expect(oauthLink.getAttribute("href")).toBe("/.well-known/oauth-protected-resource");
  });

  it("surfaces machine-readable discovery files (llms.txt, ai-plugin.json, agent-card.json)", async () => {
    const { container } = await renderDevelopersPage();
    const text = container.textContent ?? "";
    expect(text).toContain("/llms.txt");
    expect(text).toContain("/.well-known/ai-plugin.json");
    expect(text).toContain("/.well-known/agent-card.json");
    expect(text).toContain("/.well-known/api-catalog");
  });

  it("includes the info@karmahq.xyz contact mailto link", async () => {
    await renderDevelopersPage();
    const mailtoLink = screen.getByRole("link", { name: /info@karmahq\.xyz/i });
    expect(mailtoLink.getAttribute("href")).toBe("mailto:info@karmahq.xyz");
  });
});

describe("app/developers/page.tsx whitelabel gating", () => {
  it("calls notFound() when rendered on a whitelabel tenant", async () => {
    const { getWhitelabelContext } = await import("@/utilities/whitelabel-server");
    (getWhitelabelContext as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      isWhitelabel: true,
    });
    const { notFound } = await import("next/navigation");

    await DevelopersPage().catch(() => {
      // notFound() throws NEXT_HTTP_ERROR_FALLBACK
    });

    expect(notFound).toHaveBeenCalled();
  });
});
