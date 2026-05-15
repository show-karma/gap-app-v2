import { render } from "@testing-library/react";
import { SoftwareApplicationJsonLd } from "@/components/Seo/SoftwareApplicationJsonLd";
import { SITE_URL } from "@/utilities/meta";
import "@testing-library/jest-dom";

describe("SoftwareApplicationJsonLd", () => {
  function getJsonLdScripts(container: HTMLElement) {
    return Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
  }

  function parseJsonLd(script: Element) {
    return JSON.parse(script.innerHTML);
  }

  it("should render a single JSON-LD script tag", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    expect(getJsonLdScripts(container)).toHaveLength(1);
  });

  it("should declare @type SoftwareApplication", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const schema = parseJsonLd(getJsonLdScripts(container)[0]);
    expect(schema["@type"]).toBe("SoftwareApplication");
    expect(schema["@context"]).toBe("https://schema.org");
  });

  it("should be named 'Karma MCP Server'", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const schema = parseJsonLd(getJsonLdScripts(container)[0]);
    expect(schema.name).toBe("Karma MCP Server");
  });

  it("should be categorized as DeveloperApplication", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const schema = parseJsonLd(getJsonLdScripts(container)[0]);
    expect(schema.applicationCategory).toBe("DeveloperApplication");
  });

  it("should point softwareHelp at the MCP connect page", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const schema = parseJsonLd(getJsonLdScripts(container)[0]);
    expect(schema.softwareHelp.url).toBe(`${SITE_URL}/mcp/connect`);
  });

  it("should have a free offer (Schema.org rich snippet requirement)", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const schema = parseJsonLd(getJsonLdScripts(container)[0]);
    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    });
  });

  it("should advertise capability features", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const schema = parseJsonLd(getJsonLdScripts(container)[0]);
    expect(Array.isArray(schema.featureList)).toBe(true);
    expect(schema.featureList.length).toBeGreaterThanOrEqual(4);
  });

  it("should produce valid JSON", () => {
    const { container } = render(<SoftwareApplicationJsonLd />);
    const scripts = getJsonLdScripts(container);
    for (const script of scripts) {
      expect(() => JSON.parse(script.innerHTML)).not.toThrow();
    }
  });
});
