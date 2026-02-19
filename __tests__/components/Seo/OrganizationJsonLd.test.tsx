import { render } from "@testing-library/react";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL } from "@/utilities/meta";
import "@testing-library/jest-dom";

describe("OrganizationJsonLd", () => {
  function getJsonLdScripts(container: HTMLElement) {
    return Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
  }

  function parseJsonLd(script: Element) {
    return JSON.parse(script.innerHTML);
  }

  it("should render two JSON-LD script tags", () => {
    const { container } = render(<OrganizationJsonLd />);
    const scripts = getJsonLdScripts(container);
    expect(scripts).toHaveLength(2);
  });

  describe("Organization schema", () => {
    function getOrganizationSchema(container: HTMLElement) {
      const scripts = getJsonLdScripts(container);
      return parseJsonLd(scripts[0]);
    }

    it("should have @context set to schema.org", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema["@context"]).toBe("https://schema.org");
    });

    it("should have @type Organization", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema["@type"]).toBe("Organization");
    });

    it("should have name 'Karma'", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema.name).toBe("Karma");
    });

    it("should use the site URL", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema.url).toBe(SITE_URL);
    });

    it("should have a logo URL", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema.logo).toBe(`${SITE_URL}/logo/karma-logo.svg`);
    });

    it("should use DEFAULT_DESCRIPTION", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema.description).toBe(DEFAULT_DESCRIPTION);
    });

    it("should include social profiles in sameAs", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getOrganizationSchema(container);
      expect(schema.sameAs).toContain("https://twitter.com/karmahq_");
      expect(schema.sameAs).toContain("https://github.com/show-karma");
    });
  });

  describe("WebApplication schema", () => {
    function getWebApplicationSchema(container: HTMLElement) {
      const scripts = getJsonLdScripts(container);
      return parseJsonLd(scripts[1]);
    }

    it("should have @context set to schema.org", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getWebApplicationSchema(container);
      expect(schema["@context"]).toBe("https://schema.org");
    });

    it("should have @type WebApplication", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getWebApplicationSchema(container);
      expect(schema["@type"]).toBe("WebApplication");
    });

    it("should use DEFAULT_TITLE as name", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getWebApplicationSchema(container);
      expect(schema.name).toBe(DEFAULT_TITLE);
    });

    it("should be categorized as BusinessApplication", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getWebApplicationSchema(container);
      expect(schema.applicationCategory).toBe("BusinessApplication");
    });

    it("should have operatingSystem set to Web", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getWebApplicationSchema(container);
      expect(schema.operatingSystem).toBe("Web");
    });

    it("should have a free offer", () => {
      const { container } = render(<OrganizationJsonLd />);
      const schema = getWebApplicationSchema(container);
      expect(schema.offers).toEqual({
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      });
    });

    it("should produce valid JSON (no undefined or function values)", () => {
      const { container } = render(<OrganizationJsonLd />);
      const scripts = getJsonLdScripts(container);
      for (const script of scripts) {
        expect(() => JSON.parse(script.innerHTML)).not.toThrow();
      }
    });
  });
});
