import { render, screen } from "@testing-library/react";
import PricingPage, { metadata } from "@/app/pricing/page";

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({ isWhitelabel: false }),
}));

async function renderPricingPage() {
  const element = await PricingPage();
  return render(element);
}

describe("app/pricing/page.tsx", () => {
  it("renders the Pricing H1", async () => {
    await renderPricingPage();
    expect(screen.getByRole("heading", { level: 1, name: /^pricing$/i })).toBeInTheDocument();
  });

  it("declares the canonical /pricing path in metadata", () => {
    const canonical = (metadata.alternates?.canonical ?? "") as string;
    expect(canonical).toBe("/pricing");
  });

  it("includes both the Free tier and Ecosystem sections", async () => {
    await renderPricingPage();
    expect(screen.getByRole("heading", { level: 2, name: /free tier/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /ecosystem and enterprise/i })
    ).toBeInTheDocument();
  });

  it("includes the info@karmahq.xyz mailto contact link", async () => {
    await renderPricingPage();
    const mailtoLinks = screen.getAllByRole("link", { name: /info@karmahq\.xyz/i });
    expect(mailtoLinks.length).toBeGreaterThanOrEqual(1);
    expect(
      mailtoLinks.some((link) => link.getAttribute("href")?.startsWith("mailto:info@karmahq.xyz"))
    ).toBe(true);
  });

  it("emits a BreadcrumbList JSON-LD pointing Home → Pricing", async () => {
    const { container } = await renderPricingPage();
    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    const json = JSON.parse(ld?.textContent ?? "{}");
    expect(json["@type"]).toBe("BreadcrumbList");
    const items = json.itemListElement as Array<{ name: string; item: string }>;
    expect(items[1].name).toBe("Pricing");
    expect(items[1].item).toContain("/pricing");
  });
});

describe("app/pricing/page.tsx whitelabel gating", () => {
  it("calls notFound() when rendered on a whitelabel tenant", async () => {
    const { getWhitelabelContext } = await import("@/utilities/whitelabel-server");
    (getWhitelabelContext as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      isWhitelabel: true,
    });
    const { notFound } = await import("next/navigation");

    await PricingPage().catch(() => {
      // notFound() throws a NEXT_HTTP_ERROR_FALLBACK; swallow it here.
    });

    expect(notFound).toHaveBeenCalled();
  });
});
