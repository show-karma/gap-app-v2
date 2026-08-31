import { render } from "@testing-library/react";
import { ProjectJsonLd } from "@/components/Seo/ProjectJsonLd";
import type { Project } from "@/types/v2/project";
import { SITE_URL } from "@/utilities/meta";
import "@testing-library/jest-dom";

function buildProject(
  overrides: Partial<Project["details"]> = {},
  top: Partial<Project> = {}
): Project {
  return {
    uid: "0x1234",
    chainID: 10,
    owner: "0xowner",
    members: [],
    createdAt: "2024-01-15T00:00:00.000Z",
    details: {
      title: "Acme Protocol",
      slug: "acme-protocol",
      description: "A **decentralized** protocol for public goods funding.",
      logoUrl: "https://cdn.example.com/acme.png",
      tags: ["defi", "public-goods"],
      links: [
        { url: "https://acme.xyz", type: "website" },
        { url: "https://github.com/acme", type: "github" },
      ],
      ...overrides,
    },
    ...top,
  } as Project;
}

describe("ProjectJsonLd", () => {
  function getSchema(container: HTMLElement) {
    const script = container.querySelector('script[type="application/ld+json"]');
    return JSON.parse(script?.innerHTML || "{}");
  }

  it("renders a single JSON-LD script tag", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
  });

  it("has schema.org context and Project type", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Project");
  });

  it("uses the project title as name and the canonical URL", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema.name).toBe("Acme Protocol");
    expect(schema.url).toBe(`${SITE_URL}/project/acme-protocol`);
  });

  it("strips markdown from the description", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema.description).not.toContain("**");
    expect(schema.description).toContain("decentralized");
  });

  it("maps logoUrl to both logo and image", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema.logo).toBe("https://cdn.example.com/acme.png");
    expect(schema.image).toBe("https://cdn.example.com/acme.png");
  });

  it("maps http(s) links to sameAs and drops non-http links", () => {
    const project = buildProject({
      links: [
        { url: "https://acme.xyz", type: "website" },
        { url: "not-a-url", type: "other" },
        { url: "", type: "empty" },
      ],
    });
    const { container } = render(<ProjectJsonLd project={project} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema.sameAs).toEqual(["https://acme.xyz"]);
  });

  it("joins tags into a keywords string", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema.keywords).toBe("defi, public-goods");
  });

  it("exposes foundingDate from createdAt", () => {
    const { container } = render(<ProjectJsonLd project={buildProject()} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema.foundingDate).toBe("2024-01-15T00:00:00.000Z");
  });

  it("omits optional fields when data is absent", () => {
    const project = buildProject(
      { description: undefined, logoUrl: undefined, tags: [], links: [] },
      { createdAt: undefined }
    );
    const { container } = render(<ProjectJsonLd project={project} slug="acme-protocol" />);
    const schema = getSchema(container);
    expect(schema).not.toHaveProperty("description");
    expect(schema).not.toHaveProperty("logo");
    expect(schema).not.toHaveProperty("image");
    expect(schema).not.toHaveProperty("sameAs");
    expect(schema).not.toHaveProperty("keywords");
    expect(schema).not.toHaveProperty("foundingDate");
  });

  it("escapes </script> sequences to prevent XSS", () => {
    const project = buildProject({ description: "</script><script>alert(1)</script>" });
    const { container } = render(<ProjectJsonLd project={project} slug="acme-protocol" />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).not.toContain("</script><script>");
    expect(() => JSON.parse(script?.innerHTML || "{}")).not.toThrow();
  });
});
