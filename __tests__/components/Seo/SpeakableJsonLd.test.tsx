import { render } from "@testing-library/react";
import { SpeakableJsonLd } from "@/components/Seo/SpeakableJsonLd";

function extractJsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (!script || !script.textContent) {
    throw new Error("No JSON-LD script tag rendered");
  }
  return JSON.parse(script.textContent);
}

describe("SpeakableJsonLd", () => {
  it("renders a WebPage schema without a hardcoded @id", () => {
    // The component ships in the root layout, i.e. on every page —
    // pinning @id to a single URL would mis-attribute the speakable
    // selectors. Crawlers infer the resource identity from the page URL.
    const { container } = render(<SpeakableJsonLd />);
    const schema = extractJsonLd(container);
    expect(schema["@type"]).toBe("WebPage");
    expect(schema["@id"]).toBeUndefined();
  });

  it("declares a SpeakableSpecification with a cssSelector array", () => {
    const { container } = render(<SpeakableJsonLd />);
    const schema = extractJsonLd(container);
    const speakable = schema.speakable as Record<string, unknown>;
    expect(speakable["@type"]).toBe("SpeakableSpecification");
    expect(Array.isArray(speakable.cssSelector)).toBe(true);
  });

  it("targets the H1 and any data-speakable element on the page", () => {
    const { container } = render(<SpeakableJsonLd />);
    const schema = extractJsonLd(container);
    const speakable = schema.speakable as { cssSelector: string[] };
    expect(speakable.cssSelector).toContain("h1");
    expect(speakable.cssSelector).toContain("[data-speakable]");
  });

  it("emits the @context required for Schema.org parsing", () => {
    const { container } = render(<SpeakableJsonLd />);
    const schema = extractJsonLd(container);
    expect(schema["@context"]).toBe("https://schema.org");
  });
});
