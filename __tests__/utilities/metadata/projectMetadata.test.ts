import type { Project as ProjectResponse } from "@/types/v2/project";
import {
  generateProjectAboutMetadata,
  generateProjectContactMetadata,
} from "@/utilities/metadata/projectMetadata";

const project = {
  uid: "0x1",
  details: { title: "Acme", slug: "acme", description: "A grant project" },
} as unknown as ProjectResponse;

describe("generateProjectContactMetadata", () => {
  it("marks the auth-gated contact-info page as noindex but followable", () => {
    const meta = generateProjectContactMetadata(project, "acme");

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("still self-canonicalizes to the contact-info path", () => {
    const meta = generateProjectContactMetadata(project, "acme");

    expect(meta.alternates?.canonical).toBe("/project/acme/contact-info");
  });
});

describe("generateProjectAboutMetadata", () => {
  it("does not set noindex on the public about page", () => {
    const meta = generateProjectAboutMetadata(project, "acme");

    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe("/project/acme/about");
  });
});
