import { render } from "@testing-library/react";
import { ServiceJsonLd } from "@/components/Seo/ServiceJsonLd";
import { SITE_URL } from "@/utilities/meta";

function extractJsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (!script || !script.textContent) {
    throw new Error("No JSON-LD script found");
  }
  return JSON.parse(script.textContent) as Record<string, unknown>;
}

describe("ServiceJsonLd", () => {
  it("renders a Schema.org Service node with the canonical @id", () => {
    const { container } = render(<ServiceJsonLd />);
    const ld = extractJsonLd(container);
    expect(ld["@type"]).toBe("Service");
    expect(ld["@id"]).toBe(`${SITE_URL}#service`);
  });

  it("references the Organization @id as the service provider", () => {
    const { container } = render(<ServiceJsonLd />);
    const ld = extractJsonLd(container);
    expect((ld.provider as Record<string, unknown>)["@id"]).toBe(`${SITE_URL}#organization`);
  });

  it("declares an Offer pointing at /pricing", () => {
    const { container } = render(<ServiceJsonLd />);
    const ld = extractJsonLd(container);
    const offers = ld.offers as Record<string, unknown>;
    expect(offers.price).toBe("0");
    expect(offers.url).toBe(`${SITE_URL}/pricing`);
  });

  it("enumerates the four core capabilities in hasOfferCatalog", () => {
    const { container } = render(<ServiceJsonLd />);
    const ld = extractJsonLd(container);
    const catalog = ld.hasOfferCatalog as { itemListElement: Array<Record<string, unknown>> };
    const names = catalog.itemListElement.map(
      (item) => ((item.itemOffered as Record<string, unknown>).name as string).toLowerCase()
    );
    expect(names.some((n) => n.includes("intake"))).toBe(true);
    expect(names.some((n) => n.includes("milestone"))).toBe(true);
    expect(names.some((n) => n.includes("payout"))).toBe(true);
    expect(names.some((n) => n.includes("impact"))).toBe(true);
  });

  it("escapes </script> sequences in the embedded JSON", () => {
    const { container } = render(<ServiceJsonLd />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).not.toMatch(/<\/script/i);
  });
});
