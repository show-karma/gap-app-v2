import { render } from "@testing-library/react";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { SITE_URL } from "@/utilities/meta";
import "@testing-library/jest-dom";

describe("ArticleJsonLd", () => {
  function getSchema(container: HTMLElement) {
    const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts).toHaveLength(1);
    return JSON.parse(scripts[0].innerHTML);
  }

  const baseProps = {
    title: "The Grant Lifecycle",
    description: "Follow the complete grant process.",
    url: "/knowledge/grant-lifecycle",
  };

  it("emits an Article schema with the site URL and Karma as publisher", () => {
    const { container } = render(<ArticleJsonLd {...baseProps} />);
    const schema = getSchema(container);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe(baseProps.title);
    expect(schema.url).toBe(`${SITE_URL}/knowledge/grant-lifecycle`);
    expect(schema.publisher.name).toBe("Karma");
  });

  it("includes datePublished when it is supplied", () => {
    const { container } = render(<ArticleJsonLd {...baseProps} datePublished="2026-01-06" />);
    const schema = getSchema(container);

    expect(schema.datePublished).toBe("2026-01-06");
  });

  it("includes dateModified when it is supplied", () => {
    const { container } = render(
      <ArticleJsonLd {...baseProps} datePublished="2026-01-06" dateModified="2026-02-10" />
    );
    const schema = getSchema(container);

    expect(schema.dateModified).toBe("2026-02-10");
  });

  // Knowledge pages rely on this contract: they pass no dateModified because no
  // truthful modified date exists, and the key must then be absent rather than
  // emitted as null/undefined.
  it("omits both date keys entirely when neither prop is supplied", () => {
    const { container } = render(<ArticleJsonLd {...baseProps} />);
    const schema = getSchema(container);

    expect("datePublished" in schema).toBe(false);
    expect("dateModified" in schema).toBe(false);
  });

  it("omits dateModified while keeping datePublished", () => {
    const { container } = render(<ArticleJsonLd {...baseProps} datePublished="2026-01-06" />);
    const schema = getSchema(container);

    expect("datePublished" in schema).toBe(true);
    expect("dateModified" in schema).toBe(false);
  });
});
